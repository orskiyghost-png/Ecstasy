import type { Env } from "./env";
import {
  getChatMember,
  safeEqual,
  sendMessage,
  subscribedStatuses,
} from "./telegram";

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { id: number };
    text?: string;
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleTelegramWebhook(
  request: Request,
  env: Env,
): Promise<Response> {
  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (
    !env.TELEGRAM_WEBHOOK_SECRET ||
    !providedSecret ||
    !safeEqual(providedSecret, env.TELEGRAM_WEBHOOK_SECRET)
  ) {
    return json({ ok: false }, 401);
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return json({ ok: false }, 400);
  }
  if (!update || typeof update.update_id !== "number") {
    return json({ ok: false }, 400);
  }
  if (!env.DB) return json({ ok: false }, 500);

  try {
    const existing = await env.DB.prepare(
      "SELECT 1 FROM telegram_updates WHERE update_id = ?",
    )
      .bind(update.update_id)
      .first();
    if (existing) return json({ ok: true, duplicate: true });

    await env.DB.prepare("INSERT INTO telegram_updates (update_id) VALUES (?)")
      .bind(update.update_id)
      .run();
  } catch {
    return json({ ok: false }, 500);
  }

  const message = update.message;
  if (!message?.text?.startsWith("/start")) return json({ ok: true });

  if (!env.TELEGRAM_BOT_TOKEN) return json({ ok: false }, 500);
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = message.chat.id;
  const userId = message.from?.id ?? chatId;

  if (!env.TELEGRAM_CHANNEL_ID) {
    await sendMessage(
      token,
      chatId,
      "Подписка на канал не настроена. Обратитесь к администратору.",
    );
    return json({ ok: true });
  }

  const membership = await getChatMember(
    token,
    Number(env.TELEGRAM_CHANNEL_ID),
    userId,
  );
  if (!membership.ok || !membership.result || !subscribedStatuses.has(membership.result.status)) {
    const prompt = "Подпишитесь на канал, чтобы открыть Mini App.";
    const text = env.TELEGRAM_CHANNEL_URL ? `${prompt} ${env.TELEGRAM_CHANNEL_URL}` : prompt;
    await sendMessage(token, chatId, text);
    return json({ ok: true });
  }

  if (!env.APP_BASE_URL) {
    await sendMessage(
      token,
      chatId,
      "Mini App URL не настроен. Обратитесь к администратору.",
    );
    return json({ ok: true });
  }

  await sendMessage(token, chatId, "Откройте Mini App:", {
    inline_keyboard: [
      [{ text: "Открыть Mini App", web_app: { url: env.APP_BASE_URL } }],
    ],
  });
  return json({ ok: true });
}
