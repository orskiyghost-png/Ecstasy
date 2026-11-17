import { telegram } from "./telegram";

export interface SessionUser {
  id: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  photoUrl: string | null;
  isPremium: boolean;
  registeredAt: string;
}

export interface SubscriptionState {
  configured: boolean;
  checked: boolean;
  active: boolean;
  status: string | null;
}

export interface SessionData {
  ok: true;
  user: SessionUser;
  subscription: SubscriptionState;
  channelUrl: string | null;
  botUsername: string | null;
}

export interface AgentData {
  prompt: string;
  knowledge: string;
  updatedAt: string | null;
  limits: {
    prompt: number;
    knowledge: number;
  };
}

interface AgentResponse {
  ok: true;
  agent: AgentData;
}

export class ApiError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.name = "ApiError";
    this.code = code;
  }
}

function initData(): string {
  const value = telegram?.initData;
  if (!value) throw new ApiError("NO_TELEGRAM");
  return value;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...options.headers,
      "x-telegram-init-data": initData(),
    },
  });

  const body = (await response.json().catch(() => ({}))) as unknown;

  if (typeof body !== "object" || body === null) {
    throw new ApiError(`HTTP_${response.status}`);
  }

  const record = body as { ok?: unknown; error?: unknown };
  if (!response.ok || record.ok === false) {
    const code =
      typeof record.error === "string"
        ? record.error
        : `HTTP_${response.status}`;
    throw new ApiError(code);
  }

  return body as T;
}

export function fetchSession(): Promise<SessionData> {
  return request<SessionData>("/api/session", { method: "POST" });
}

export async function fetchAgent(): Promise<AgentData> {
  const response = await request<AgentResponse>("/api/agent");
  return response.agent;
}

export async function saveAgent(
  prompt: string,
  knowledge: string,
): Promise<AgentData> {
  const response = await request<AgentResponse>("/api/agent", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, knowledge }),
  });
  return response.agent;
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "NO_TELEGRAM":
        return "Приложение открыто вне Telegram.";
      case "INIT_DATA_MISSING":
      case "INIT_DATA_INVALID":
      case "INIT_DATA_EXPIRED":
        return "Сессия Telegram устарела. Закройте и снова откройте Mini App.";
      case "DB_UNAVAILABLE":
        return "База данных временно недоступна.";
      case "BOT_TOKEN_MISSING":
        return "Сервер не настроен: нет доступа к Telegram.";
      default:
        return "Не удалось выполнить запрос. Попробуйте ещё раз.";
    }
  }
  return "Нет связи с сервером. Проверьте подключение.";
}
