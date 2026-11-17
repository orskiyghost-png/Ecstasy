export const subscribedStatuses = new Set([
  "member",
  "administrator",
  "creator",
]);

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export function telegramApiUrl(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function callTelegramApi<T>(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramApiResponse<T>> {
  const response = await fetch(telegramApiUrl(token, method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as TelegramApiResponse<T>;
}

export async function getChatMember(
  token: string,
  chatId: number,
  userId: number,
): Promise<TelegramApiResponse<{ status: string }>> {
  return callTelegramApi<{ status: string }>(token, "getChatMember", {
    chat_id: chatId,
    user_id: userId,
  });
}

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: unknown,
): Promise<TelegramApiResponse<unknown>> {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (replyMarkup !== undefined) body.reply_markup = replyMarkup;
  return callTelegramApi<unknown>(token, "sendMessage", body);
}
