import type { Env } from "./env";
import {
  answerCallbackQuery,
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
  callback_query?: {
    id: string;
    from?: { id: number };
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number };
    };
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function subscriptionKeyboard(channelUrl?: string) {
  const rows: Array<Array<Record<string, unknown>>> = [];
  if (channelUrl) {
    rows.push([{ text: "Подписаться на канал", url: channelUrl }]);
  }
  rows.push([{ text: "Проверить подписку", callback_data: "check_subscription" }]);
  return { inline_keyboard: rows };
}

function miniAppKeyboard(appUrl: string) {
  return {
    inline_keyboard: [
      [{ text: "Открыть Mini App", web_app: { url: appUrl } }],
    ],
  };
}

async function sendMiniAppLink(
  token: string,
  chatId: number,
  env: Env,
): Promise<void> {
  if (!env.APP_BASE_URL) {
    await sendMessage(
      token,
      chatId,
      "Mini App URL не настроен. Обратитесь к администратору.",
    );
    return;
  }

  await sendMessage(
    token,
    chatId,
    "Доступ открыт. Нажмите кнопку, чтобы перейти в Mini App.",
    miniAppKeyboard(env.APP_BASE_URL),
  );
}

async function isSubscribed(
  token: string,
  userId: number,
  env: Env,
): Promise<boolean> {
  if (!env.TELEGRAM_CHANNEL_ID) return true;
  const membership = await getChatMember(
    token,
    Number(env.TELEGRAM_CHANNEL_ID),
    userId,
  );
  return Boolean(
    membership.ok &&
      membership.result &&
      subscribedStatuses.has(membership.result.status),
  );
}

async function handleStart(
  token: string,
  message: NonNullable<TelegramUpdate["message"]>,
  env: Env,
): Promise<Response> {
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

  if (!(await isSubscribed(token, userId, env))) {
    await sendMessage(
      token,
      chatId,
      "Чтобы открыть Mini App, подпишитесь на канал Ecstasy AI.",
      subscriptionKeyboard(env.TELEGRAM_CHANNEL_URL),
    );
    return json({ ok: true });
  }

  await sendMiniAppLink(token, chatId, env);
  return json({ ok: true });
}

async function handleSubscriptionCheck(
  token: string,
  update: TelegramUpdate,
  env: Env,
): Promise<Response> {
  const callback = update.callback_query!;
  const chatId = callback.message?.chat.id;
  const userId = callback.from?.id;

  if (!chatId || !userId) {
    await answerCallbackQuery(token, callback.id);
    return json({ ok: true });
  }

  if (!env.TELEGRAM_CHANNEL_ID) {
    await answerCallbackQuery(
      token,
      callback.id,
      "Канал не настроен. Обратитесь к администратору.",
    );
    return json({ ok: true });
  }

  const subscribed = await isSubscribed(token, userId, env);
  if (!subscribed) {
    await answerCallbackQuery(
      token,
      callback.id,
      "Подписка не найдена. Подпишитесь на канал и попробуйте снова.",
    );
    return json({ ok: true });
  }

  await answerCallbackQuery(token, callback.id, "Подписка подтверждена");
  await sendMiniAppLink(token, chatId, env);
  return json({ ok: true });
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

  if (!env.TELEGRAM_BOT_TOKEN) return json({ ok: false }, 500);
  const token = env.TELEGRAM_BOT_TOKEN;

  if (update.message?.text?.startsWith("/start")) {
    return handleStart(token, update.message, env);
  }

  if (update.callback_query?.data === "check_subscription") {
    return handleSubscriptionCheck(token, update, env);
  }

  return json({ ok: true });
}
