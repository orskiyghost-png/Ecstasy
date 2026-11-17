import { afterEach, describe, expect, it, vi } from "vitest";
import { safeEqual } from "../worker/telegram";
import { handleTelegramWebhook, type TelegramUpdate } from "../worker/telegram-webhook";

const secret = "webhook-secret";
const token = "bot-token";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeRequest(body: unknown = { update_id: 1 }, withSecret = true) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (withSecret) headers["x-telegram-bot-api-secret-token"] = secret;
  return new Request("https://example.com/api/telegram/webhook", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function makeDb(existing = false) {
  const run = vi.fn().mockResolvedValue({ success: true });
  const first = vi.fn().mockResolvedValue(existing ? { update_id: 1 } : null);
  const bind = vi.fn().mockReturnValue({ run, first });
  const prepare = vi.fn().mockReturnValue({ bind });
  return {
    env: { DB: { prepare } as unknown as D1Database },
    prepare,
    bind,
    first,
    run,
  };
}

function fetchCallBody(call: unknown[]) {
  const init = call[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/telegram/webhook", () => {
  it("rejects requests without the webhook secret", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeDb();

    const response = await handleTelegramWebhook(makeRequest({}, false), {
      ...env,
      TELEGRAM_WEBHOOK_SECRET: secret,
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid webhook secret", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeDb();
    const request = makeRequest();
    request.headers.set("x-telegram-bot-api-secret-token", "wrong");

    const response = await handleTelegramWebhook(request, {
      ...env,
      TELEGRAM_WEBHOOK_SECRET: secret,
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores a duplicate update", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeDb(true);

    const response = await handleTelegramWebhook(makeRequest(), {
      ...env,
      TELEGRAM_BOT_TOKEN: token,
      TELEGRAM_WEBHOOK_SECRET: secret,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, duplicate: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeDb();

    const response = await handleTelegramWebhook(makeRequest("not json"), {
      ...env,
      TELEGRAM_BOT_TOKEN: token,
      TELEGRAM_WEBHOOK_SECRET: secret,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("start without channel config says channel is not configured and sends no button", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeDb();
    const update: TelegramUpdate = {
      update_id: 1,
      message: { message_id: 1, chat: { id: 42 }, from: { id: 42 }, text: "/start" },
    };

    const response = await handleTelegramWebhook(makeRequest(update), {
      ...env,
      TELEGRAM_BOT_TOKEN: token,
      TELEGRAM_WEBHOOK_SECRET: secret,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = fetchCallBody(fetchMock.mock.calls[0]);
    expect(body.text).toContain("канал не настроен");
    expect(body.reply_markup).toBeUndefined();
  });

  it("start with non-member status sends subscribe prompt with inline buttons", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: { status: "left" } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeDb();
    const update: TelegramUpdate = {
      update_id: 1,
      message: { message_id: 1, chat: { id: 42 }, from: { id: 42 }, text: "/start" },
    };

    const response = await handleTelegramWebhook(makeRequest(update), {
      ...env,
      TELEGRAM_BOT_TOKEN: token,
      TELEGRAM_WEBHOOK_SECRET: secret,
      TELEGRAM_CHANNEL_ID: "-1001",
      TELEGRAM_CHANNEL_URL: "https://t.me/test-channel",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = fetchCallBody(fetchMock.mock.calls[1]);
    expect(body.text).toContain("Чтобы открыть Mini App");
    expect(body.text).not.toContain("https://t.me/test-channel");
    expect(body.reply_markup.inline_keyboard[0][0]).toEqual({
      text: "Подписаться на канал",
      url: "https://t.me/test-channel",
    });
    expect(body.reply_markup.inline_keyboard[1][0]).toEqual({
      text: "Проверить подписку",
      callback_data: "check_subscription",
    });
  });

  it("check_subscription confirms membership and sends the Mini App button", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: { status: "member" } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeDb();
    const update: TelegramUpdate = {
      update_id: 2,
      callback_query: {
        id: "callback-1",
        from: { id: 42 },
        data: "check_subscription",
        message: { message_id: 10, chat: { id: 42 } },
      },
    };

    const response = await handleTelegramWebhook(makeRequest(update), {
      ...env,
      TELEGRAM_BOT_TOKEN: token,
      TELEGRAM_WEBHOOK_SECRET: secret,
      TELEGRAM_CHANNEL_ID: "-1001",
      APP_BASE_URL: "https://app.example",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const answer = fetchCallBody(fetchMock.mock.calls[1]);
    expect(answer.callback_query_id).toBe("callback-1");
    expect(answer.text).toBe("Подписка подтверждена");
    const sent = fetchCallBody(fetchMock.mock.calls[2]);
    expect(sent.reply_markup.inline_keyboard[0][0]).toEqual({
      text: "Открыть Mini App",
      web_app: { url: "https://app.example" },
    });
  });

  it("check_subscription reports a missing subscription without sending a button", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: { status: "left" } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: true }));
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeDb();
    const update: TelegramUpdate = {
      update_id: 3,
      callback_query: {
        id: "callback-2",
        from: { id: 42 },
        data: "check_subscription",
        message: { message_id: 10, chat: { id: 42 } },
      },
    };

    const response = await handleTelegramWebhook(makeRequest(update), {
      ...env,
      TELEGRAM_BOT_TOKEN: token,
      TELEGRAM_WEBHOOK_SECRET: secret,
      TELEGRAM_CHANNEL_ID: "-1001",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const answer = fetchCallBody(fetchMock.mock.calls[1]);
    expect(answer.text).toContain("Подписка не найдена");
  });

  it("start with member status and configured URL sends Mini App button", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: { status: "member" } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeDb();
    const update: TelegramUpdate = {
      update_id: 1,
      message: { message_id: 1, chat: { id: 42 }, from: { id: 42 }, text: "/start" },
    };

    const response = await handleTelegramWebhook(makeRequest(update), {
      ...env,
      TELEGRAM_BOT_TOKEN: token,
      TELEGRAM_WEBHOOK_SECRET: secret,
      TELEGRAM_CHANNEL_ID: "-1001",
      APP_BASE_URL: "https://app.example",
    });

    expect(response.status).toBe(200);
    const body = fetchCallBody(fetchMock.mock.calls[1]);
    expect(body.reply_markup.inline_keyboard[0][0]).toEqual({
      text: "Открыть Mini App",
      web_app: { url: "https://app.example" },
    });
  });

  it("start without APP_BASE_URL sends no button", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: { status: "creator" } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeDb();
    const update: TelegramUpdate = {
      update_id: 1,
      message: { message_id: 1, chat: { id: 42 }, from: { id: 42 }, text: "/start" },
    };

    const response = await handleTelegramWebhook(makeRequest(update), {
      ...env,
      TELEGRAM_BOT_TOKEN: token,
      TELEGRAM_WEBHOOK_SECRET: secret,
      TELEGRAM_CHANNEL_ID: "-1001",
    });

    expect(response.status).toBe(200);
    const body = fetchCallBody(fetchMock.mock.calls[1]);
    expect(body.text).toContain("Mini App URL не настроен");
    expect(body.reply_markup).toBeUndefined();
  });

  it("safeEqual accepts equal strings and rejects mismatched strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });
});
