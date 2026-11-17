import { safeEqual } from "./telegram";

export interface TelegramUserPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export type InitDataResult =
  | { ok: true; user: TelegramUserPayload; authDate: number }
  | { ok: false; error: "INIT_DATA_MISSING" | "INIT_DATA_INVALID" | "INIT_DATA_EXPIRED" };

const encoder = new TextEncoder();

async function hmacSha256(
  key: ArrayBuffer,
  data: string,
): Promise<ArrayBuffer> {
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

export async function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86_400,
  now = Math.floor(Date.now() / 1000),
): Promise<InitDataResult> {
  if (!initData) return { ok: false, error: "INIT_DATA_MISSING" };

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, error: "INIT_DATA_INVALID" };
  }

  const hash = params.get("hash");
  const rawUser = params.get("user");
  const rawAuthDate = params.get("auth_date");
  if (!hash || !rawUser || !rawAuthDate) {
    return { ok: false, error: "INIT_DATA_INVALID" };
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await hmacSha256(
    encoder.encode("WebAppData").buffer as ArrayBuffer,
    botToken,
  );
  const computed = toHex(await hmacSha256(secretKey, dataCheckString));
  if (!safeEqual(computed, hash.toLowerCase())) {
    return { ok: false, error: "INIT_DATA_INVALID" };
  }

  const authDate = Number(rawAuthDate);
  if (!Number.isFinite(authDate) || authDate > now + 300 || now - authDate > maxAgeSeconds) {
    return { ok: false, error: "INIT_DATA_EXPIRED" };
  }

  let user: TelegramUserPayload;
  try {
    user = JSON.parse(rawUser) as TelegramUserPayload;
  } catch {
    return { ok: false, error: "INIT_DATA_INVALID" };
  }
  if (!user || typeof user.id !== "number" || typeof user.first_name !== "string") {
    return { ok: false, error: "INIT_DATA_INVALID" };
  }

  return { ok: true, user, authDate };
}

export function getInitData(request: Request): string | null {
  const header = request.headers.get("x-telegram-init-data");
  if (header) return header;

  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("tma ")) {
    return authorization.slice(4);
  }

  return null;
}
