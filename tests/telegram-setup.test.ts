import { afterEach, describe, expect, it, vi } from "vitest";
import { handleTelegramSetup } from "../worker/telegram-setup";

const setupToken = "setup-token";
const botToken = "bot-token";
const webhookSecret = "webhook-secret";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeRequest(body: unknown, token = setupToken) {
  return new Request("https://example.com/api/telegram/setup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-setup-token": token,
    },
    body: JSON.stringify(body),
  });
}

function fetchCallBody(call: unknown[]) {
  const init = call[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/telegram/setup", () => {
  it("returns 404 when the setup token is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleTelegramSetup(makeRequest({ action: "status" }), {
      TELEGRAM_BOT_TOKEN: botToken,
    });

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid setup token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleTelegramSetup(
      makeRequest({ action: "status" }, "wrong"),
      { SETUP_TOKEN: setupToken, TELEGRAM_BOT_TOKEN: botToken },
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns sanitized config and telegram status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          result: { id: 7, username: "test_bot", first_name: "Test" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          result: {
            url: "https://app.example/api/telegram/webhook",
            pending_update_count: 0,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          result: {
            id: -1001,
            type: "channel",
            title: "Test Channel",
            username: "test_channel",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ ok: true, result: { status: "administrator" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleTelegramSetup(makeRequest({ action: "status" }), {
      SETUP_TOKEN: setupToken,
      TELEGRAM_BOT_TOKEN: botToken,
      TELEGRAM_WEBHOOK_SECRET: webhookSecret,
      TELEGRAM_CHANNEL_ID: "-1001",
      TELEGRAM_CHANNEL_URL: "https://t.me/test_channel",
      APP_BASE_URL: "https://app.example",
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      config: Record<string, boolean>;
      bot: unknown;
      channel: unknown;
      botStatus: string | null;
    };
    expect(body.config).toEqual({
      botToken: true,
      webhookSecret: true,
      channelId: true,
      channelUrl: true,
      appBaseUrl: true,
    });
    expect(body.bot).toEqual({
      id: 7,
      username: "test_bot",
      first_name: "Test",
    });
    expect(body.channel).toEqual({
      id: -1001,
      type: "channel",
      title: "Test Channel",
      username: "test_channel",
    });
    expect(body.botStatus).toBe("administrator");
    expect(JSON.stringify(body)).not.toContain(botToken);
    expect(JSON.stringify(body)).not.toContain(webhookSecret);
  });

  it("registers the exact webhook URL with the worker secret", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        result: true,
        description: "Webhook was set",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleTelegramSetup(
      makeRequest({ action: "setWebhook" }),
      {
        SETUP_TOKEN: setupToken,
        TELEGRAM_BOT_TOKEN: botToken,
        TELEGRAM_WEBHOOK_SECRET: webhookSecret,
        APP_BASE_URL: "https://app.example/",
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      ok: true,
      result: true,
      description: "Webhook was set",
    });
    const sent = fetchCallBody(fetchMock.mock.calls[0]);
    expect(sent).toEqual({
      url: "https://app.example/api/telegram/webhook",
      secret_token: webhookSecret,
      drop_pending_updates: false,
    });
    expect(JSON.stringify(body)).not.toContain(webhookSecret);
  });

  it("refuses to register a webhook without APP_BASE_URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleTelegramSetup(
      makeRequest({ action: "setWebhook" }),
      {
        SETUP_TOKEN: setupToken,
        TELEGRAM_BOT_TOKEN: botToken,
        TELEGRAM_WEBHOOK_SECRET: webhookSecret,
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "APP_BASE_URL_MISSING",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the Mini App button to the channel creator", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          result: [
            {
              status: "administrator",
              user: { id: 11, username: "admin" },
            },
            {
              status: "creator",
              user: { id: 22, username: "owner", first_name: "Owner" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ ok: true, result: { status: "creator" } }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true, result: {} }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleTelegramSetup(
      makeRequest({ action: "sendMiniApp" }),
      {
        SETUP_TOKEN: setupToken,
        TELEGRAM_BOT_TOKEN: botToken,
        TELEGRAM_CHANNEL_ID: "-1001",
        APP_BASE_URL: "https://app.example/",
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(JSON.stringify(body)).not.toContain(botToken);

    const admins = fetchCallBody(fetchMock.mock.calls[0]);
    expect(admins).toEqual({ chat_id: "-1001" });

    const membership = fetchCallBody(fetchMock.mock.calls[1]);
    expect(membership).toEqual({ chat_id: "-1001", user_id: 22 });

    const sent = fetchCallBody(fetchMock.mock.calls[2]);
    expect(sent.chat_id).toBe(22);
    expect(sent.reply_markup).toEqual({
      inline_keyboard: [
        [{ text: "Открыть Mini App", web_app: { url: "https://app.example" } }],
      ],
    });
  });

  it("refuses to send the Mini App without a channel creator", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        ok: true,
        result: [
          {
            status: "administrator",
            user: { id: 11, username: "admin" },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleTelegramSetup(
      makeRequest({ action: "sendMiniApp" }),
      {
        SETUP_TOKEN: setupToken,
        TELEGRAM_BOT_TOKEN: botToken,
        TELEGRAM_CHANNEL_ID: "-1001",
        APP_BASE_URL: "https://app.example",
      },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "CHANNEL_CREATOR_NOT_FOUND",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
