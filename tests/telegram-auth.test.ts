import { describe, expect, it } from "vitest";
import { verifyTelegramInitData } from "../worker/telegram-auth";

const botToken = "123456:test-bot-token";
const encoder = new TextEncoder();

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function makeInitData(
  user: Record<string, unknown>,
  authDate: number,
): Promise<string> {
  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("query_id", "AAHdF6IQAAAAAN0Xoha");
  params.set("user", JSON.stringify(user));

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await hmac(
    encoder.encode("WebAppData").buffer as ArrayBuffer,
    botToken,
  );
  const hash = toHex(await hmac(secretKey, dataCheckString));
  params.set("hash", hash);
  return params.toString();
}

const user = {
  id: 42,
  first_name: "Test",
  username: "tester",
  language_code: "ru",
};

describe("verifyTelegramInitData", () => {
  it("accepts a correctly signed payload", async () => {
    const now = 1_800_000_000;
    const initData = await makeInitData(user, now - 60);

    const result = await verifyTelegramInitData(initData, botToken, 86_400, now);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe(42);
      expect(result.user.username).toBe("tester");
      expect(result.authDate).toBe(now - 60);
    }
  });

  it("rejects a payload whose data was changed after signing", async () => {
    const now = 1_800_000_000;
    const initData = await makeInitData(user, now - 60);
    const tampered = initData.replace("Test", "Other");

    const result = await verifyTelegramInitData(
      tampered,
      botToken,
      86_400,
      now,
    );

    expect(result).toEqual({ ok: false, error: "INIT_DATA_INVALID" });
  });

  it("rejects a payload signed with another bot token", async () => {
    const now = 1_800_000_000;
    const initData = await makeInitData(user, now - 60);

    const result = await verifyTelegramInitData(
      initData,
      "999999:another-token",
      86_400,
      now,
    );

    expect(result).toEqual({ ok: false, error: "INIT_DATA_INVALID" });
  });

  it("rejects an expired auth_date", async () => {
    const now = 1_800_000_000;
    const initData = await makeInitData(user, now - 90_000);

    const result = await verifyTelegramInitData(initData, botToken, 86_400, now);

    expect(result).toEqual({ ok: false, error: "INIT_DATA_EXPIRED" });
  });

  it("rejects an empty or malformed payload", async () => {
    expect(await verifyTelegramInitData("", botToken)).toEqual({
      ok: false,
      error: "INIT_DATA_MISSING",
    });
    expect(await verifyTelegramInitData("user=not-json", botToken)).toEqual({
      ok: false,
      error: "INIT_DATA_INVALID",
    });
  });
});
