import type { Env } from "./env";
import {
  getInitData,
  verifyTelegramInitData,
  type TelegramUserPayload,
} from "./telegram-auth";
import { getChatMember, subscribedStatuses } from "./telegram";

const MAX_PROMPT_LENGTH = 4_000;
const MAX_KNOWLEDGE_LENGTH = 20_000;

interface UserRow {
  id: number;
  created_at: string;
  updated_at: string;
}

interface Authenticated {
  telegram: TelegramUserPayload;
  userId: number;
  createdAt: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function authenticate(
  request: Request,
  env: Env,
): Promise<Authenticated | Response> {
  if (!env.DB) {
    return json({ ok: false, error: "DB_UNAVAILABLE" }, 503);
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    return json({ ok: false, error: "BOT_TOKEN_MISSING" }, 500);
  }

  const initData = getInitData(request);
  if (!initData) {
    return json({ ok: false, error: "INIT_DATA_MISSING" }, 401);
  }

  const verified = await verifyTelegramInitData(
    initData,
    env.TELEGRAM_BOT_TOKEN,
  );
  if (!verified.ok) {
    return json({ ok: false, error: verified.error }, 401);
  }

  const telegram = verified.user;
  try {
    await env.DB.prepare(
      `INSERT INTO users (
         telegram_user_id, first_name, last_name, username, language_code,
         photo_url, is_premium
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(telegram_user_id) DO UPDATE SET
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         username = excluded.username,
         language_code = excluded.language_code,
         photo_url = excluded.photo_url,
         is_premium = excluded.is_premium,
         updated_at = CURRENT_TIMESTAMP`,
    )
      .bind(
        String(telegram.id),
        telegram.first_name,
        telegram.last_name ?? null,
        telegram.username ?? null,
        telegram.language_code ?? null,
        telegram.photo_url ?? null,
        telegram.is_premium ? 1 : 0,
      )
      .run();

    const row = await env.DB.prepare(
      "SELECT id, created_at, updated_at FROM users WHERE telegram_user_id = ?",
    )
      .bind(String(telegram.id))
      .first<UserRow>();

    if (!row) {
      return json({ ok: false, error: "USER_NOT_STORED" }, 500);
    }

    return {
      telegram,
      userId: row.id,
      createdAt: row.created_at,
    };
  } catch {
    return json({ ok: false, error: "DB_UNAVAILABLE" }, 503);
  }
}

async function loadSubscription(
  env: Env,
  telegramUserId: number,
): Promise<{
  configured: boolean;
  checked: boolean;
  active: boolean;
  status: string | null;
}> {
  if (!env.TELEGRAM_CHANNEL_ID || !env.TELEGRAM_BOT_TOKEN) {
    return { configured: false, checked: false, active: false, status: null };
  }

  const membership = await getChatMember(
    env.TELEGRAM_BOT_TOKEN,
    Number(env.TELEGRAM_CHANNEL_ID),
    telegramUserId,
  );

  if (!membership.ok || !membership.result) {
    return { configured: true, checked: false, active: false, status: null };
  }

  return {
    configured: true,
    checked: true,
    active: subscribedStatuses.has(membership.result.status),
    status: membership.result.status,
  };
}

export async function handleSession(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  const subscription = await loadSubscription(env, auth.telegram.id);

  return json({
    ok: true,
    user: {
      id: auth.telegram.id,
      firstName: auth.telegram.first_name,
      lastName: auth.telegram.last_name ?? null,
      username: auth.telegram.username ?? null,
      languageCode: auth.telegram.language_code ?? null,
      photoUrl: auth.telegram.photo_url ?? null,
      isPremium: Boolean(auth.telegram.is_premium),
      registeredAt: auth.createdAt,
    },
    subscription,
    channelUrl: env.TELEGRAM_CHANNEL_URL ?? null,
    botUsername: env.TELEGRAM_BOT_USERNAME ?? null,
  });
}

export async function handleGetAgent(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  try {
    const row = await env.DB!.prepare(
      "SELECT prompt, knowledge, updated_at FROM agent_settings WHERE user_id = ?",
    )
      .bind(auth.userId)
      .first<{ prompt: string; knowledge: string; updated_at: string }>();

    return json({
      ok: true,
      agent: {
        prompt: row?.prompt ?? "",
        knowledge: row?.knowledge ?? "",
        updatedAt: row?.updated_at ?? null,
        limits: {
          prompt: MAX_PROMPT_LENGTH,
          knowledge: MAX_KNOWLEDGE_LENGTH,
        },
      },
    });
  } catch {
    return json({ ok: false, error: "DB_UNAVAILABLE" }, 503);
  }
}

export async function handleSaveAgent(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  let body: { prompt?: unknown; knowledge?: unknown };
  try {
    body = (await request.json()) as { prompt?: unknown; knowledge?: unknown };
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : null;
  const knowledge = typeof body.knowledge === "string" ? body.knowledge : null;
  if (prompt === null || knowledge === null) {
    return json({ ok: false, error: "INVALID_PAYLOAD" }, 400);
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return json({ ok: false, error: "PROMPT_TOO_LONG" }, 400);
  }
  if (knowledge.length > MAX_KNOWLEDGE_LENGTH) {
    return json({ ok: false, error: "KNOWLEDGE_TOO_LONG" }, 400);
  }

  try {
    await env.DB!.prepare(
      `INSERT INTO agent_settings (user_id, prompt, knowledge, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         prompt = excluded.prompt,
         knowledge = excluded.knowledge,
         updated_at = CURRENT_TIMESTAMP`,
    )
      .bind(auth.userId, prompt, knowledge)
      .run();

    const row = await env.DB!.prepare(
      "SELECT updated_at FROM agent_settings WHERE user_id = ?",
    )
      .bind(auth.userId)
      .first<{ updated_at: string }>();

    return json({
      ok: true,
      agent: {
        prompt,
        knowledge,
        updatedAt: row?.updated_at ?? null,
      },
    });
  } catch {
    return json({ ok: false, error: "DB_UNAVAILABLE" }, 503);
  }
}
