import type { Env } from "./env";
import { callTelegramApi, safeEqual, subscribedStatuses } from "./telegram";

interface SetupBody {
  action?: string;
  chat_id?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
}

interface TelegramWebhookInfo {
  url?: string;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

interface TelegramUpdate {
  channel_post?: { chat?: TelegramChat };
  edited_channel_post?: { chat?: TelegramChat };
  message?: { chat?: TelegramChat };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sanitizeChat(chat: TelegramChat | undefined) {
  if (!chat) return null;
  return {
    id: chat.id,
    type: chat.type,
    title: chat.title,
    username: chat.username,
  };
}

function sanitizeWebhook(webhook: TelegramWebhookInfo) {
  return {
    url: webhook.url ?? "",
    pending_update_count: webhook.pending_update_count ?? 0,
    last_error_date: webhook.last_error_date,
    last_error_message: webhook.last_error_message,
    last_synchronization_error_date: webhook.last_synchronization_error_date,
    max_connections: webhook.max_connections,
    allowed_updates: webhook.allowed_updates,
  };
}

export async function handleTelegramSetup(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!env.SETUP_TOKEN) return json({ ok: false }, 404);

  const providedToken = request.headers.get("x-setup-token");
  if (
    !providedToken ||
    !safeEqual(providedToken, env.SETUP_TOKEN)
  ) {
    return json({ ok: false }, 401);
  }

  if (!env.TELEGRAM_BOT_TOKEN) {
    return json({ ok: false, error: "TELEGRAM_BOT_TOKEN_MISSING" }, 500);
  }

  let body: SetupBody = {};
  try {
    body = (await request.json()) as SetupBody;
  } catch {
    body = {};
  }

  const action = body.action ?? "status";
  const token = env.TELEGRAM_BOT_TOKEN;
  const baseUrl = env.APP_BASE_URL?.replace(/\/+$/, "");
  const webhookUrl = baseUrl ? `${baseUrl}/api/telegram/webhook` : null;

  if (action === "status") {
    const me = await callTelegramApi<{
      id: number;
      username?: string;
      first_name?: string;
    }>(token, "getMe", {});
    const webhook = await callTelegramApi<TelegramWebhookInfo>(
      token,
      "getWebhookInfo",
      {},
    );

    let channel = null;
    let botStatus: string | null = null;
    if (env.TELEGRAM_CHANNEL_ID) {
      const chat = await callTelegramApi<TelegramChat>(token, "getChat", {
        chat_id: env.TELEGRAM_CHANNEL_ID,
      });
      channel = sanitizeChat(chat.result);
      if (me.ok && me.result?.id && chat.ok) {
        const member = await callTelegramApi<{ status?: string }>(
          token,
          "getChatMember",
          {
            chat_id: env.TELEGRAM_CHANNEL_ID,
            user_id: me.result.id,
          },
        );
        botStatus = member.ok
          ? member.result?.status ?? "unknown"
          : `error:${member.error_code ?? "unknown"}`;
      }
    }

    return json({
      ok: true,
      config: {
        botToken: true,
        webhookSecret: Boolean(env.TELEGRAM_WEBHOOK_SECRET),
        channelId: Boolean(env.TELEGRAM_CHANNEL_ID),
        channelUrl: Boolean(env.TELEGRAM_CHANNEL_URL),
        appBaseUrl: Boolean(baseUrl),
      },
      expectedWebhookUrl: webhookUrl,
      bot: me.ok
        ? {
            id: me.result?.id,
            username: me.result?.username,
            first_name: me.result?.first_name,
          }
        : { error: me.description ?? "getMe failed" },
      webhook: webhook.ok
        ? sanitizeWebhook(webhook.result ?? {})
        : { error: webhook.description ?? "getWebhookInfo failed" },
      channel,
      botStatus,
    });
  }

  if (action === "setWebhook") {
    if (!webhookUrl) {
      return json({ ok: false, error: "APP_BASE_URL_MISSING" }, 400);
    }
    if (!env.TELEGRAM_WEBHOOK_SECRET) {
      return json({ ok: false, error: "TELEGRAM_WEBHOOK_SECRET_MISSING" }, 400);
    }

    const result = await callTelegramApi<boolean>(token, "setWebhook", {
      url: webhookUrl,
      secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      drop_pending_updates: false,
    });

    return json({
      ok: result.ok,
      description: result.description,
      result: result.result,
    });
  }

  if (action === "deleteWebhook") {
    const result = await callTelegramApi<boolean>(token, "deleteWebhook", {
      drop_pending_updates: false,
    });
    return json({
      ok: result.ok,
      description: result.description,
      result: result.result,
    });
  }

  if (action === "getChat") {
    const chatId = body.chat_id?.trim() || env.TELEGRAM_CHANNEL_ID;
    if (!chatId) return json({ ok: false, error: "CHAT_ID_MISSING" }, 400);

    const result = await callTelegramApi<TelegramChat>(token, "getChat", {
      chat_id: chatId,
    });
    return json({
      ok: result.ok,
      chat: sanitizeChat(result.result),
      description: result.description,
    });
  }

  if (action === "sendMiniApp") {
    if (!env.TELEGRAM_CHANNEL_ID) {
      return json({ ok: false, error: "TELEGRAM_CHANNEL_ID_MISSING" }, 400);
    }
    if (!baseUrl) {
      return json({ ok: false, error: "APP_BASE_URL_MISSING" }, 400);
    }

    const admins = await callTelegramApi<
      Array<{
        status: string;
        user: { id: number; username?: string; first_name?: string };
      }>
    >(token, "getChatAdministrators", {
      chat_id: env.TELEGRAM_CHANNEL_ID,
    });
    const owner = admins.result?.find((admin) => admin.status === "creator");
    if (!admins.ok || !owner) {
      return json(
        {
          ok: false,
          error: "CHANNEL_CREATOR_NOT_FOUND",
          description: admins.description,
        },
        404,
      );
    }

    const membership = await callTelegramApi<{ status: string }>(
      token,
      "getChatMember",
      {
        chat_id: env.TELEGRAM_CHANNEL_ID,
        user_id: owner.user.id,
      },
    );
    if (
      !membership.ok ||
      !membership.result ||
      !subscribedStatuses.has(membership.result.status)
    ) {
      return json(
        {
          ok: false,
          error: "CHANNEL_CREATOR_NOT_SUBSCRIBED",
          description: membership.description,
        },
        400,
      );
    }

    const sent = await callTelegramApi<unknown>(token, "sendMessage", {
      chat_id: owner.user.id,
      text: "Настройка завершена. Откройте Mini App:",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Открыть Mini App", web_app: { url: baseUrl } }],
        ],
      },
    });

    return json({
      ok: sent.ok,
      sentTo: {
        id: owner.user.id,
        username: owner.user.username,
        first_name: owner.user.first_name,
      },
      description: sent.description,
    });
  }

  if (action === "discoverChannel") {
    await callTelegramApi(token, "deleteWebhook", {
      drop_pending_updates: false,
    });
    const updates = await callTelegramApi<TelegramUpdate[]>(token, "getUpdates", {
      timeout: 0,
      limit: 100,
      allowed_updates: ["channel_post", "edited_channel_post", "message"],
    });

    const chats = new Map<number, ReturnType<typeof sanitizeChat>>();
    for (const update of updates.result ?? []) {
      const chat =
        update.channel_post?.chat ??
        update.edited_channel_post?.chat ??
        update.message?.chat;
      if (chat?.type === "channel") {
        chats.set(chat.id, sanitizeChat(chat));
      }
    }

    let restore: { ok: boolean; description?: string } | null = null;
    if (webhookUrl && env.TELEGRAM_WEBHOOK_SECRET) {
      const result = await callTelegramApi<boolean>(token, "setWebhook", {
        url: webhookUrl,
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        drop_pending_updates: false,
      });
      restore = { ok: result.ok, description: result.description };
    }

    return json({
      ok: updates.ok,
      updates: updates.result?.length ?? 0,
      chats: [...chats.values()],
      restoredWebhook: restore,
      error: updates.description,
    });
  }

  return json({ ok: false, error: "UNKNOWN_ACTION" }, 400);
}
