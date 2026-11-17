# Завершение Этапа 1: Cloudflare deploy и Telegram webhook — план внедрения

> **Для автономных исполнителей:** ОБЯЗАТЕЛЬНЫЙ SUB-SKILL: использовать `superpowers:subagent-driven-development` (рекомендуется) или `superpowers:executing-plans`. Шаги отмечаются чекбоксами (`- [ ]`).

**Goal:** Добавить deploy одного Worker через GitHub Actions и базовый Telegram webhook, не используя раскрытые секреты и не имитируя подключения.

**Architecture:** Telegram webhook живёт в том же Hono Worker, что и SPA и `/api/health`. Секреты читаются из Worker bindings; deploy использует GitHub Actions secrets. Идемпотентность обновлений хранится в D1.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers, D1, Vitest, GitHub Actions, Wrangler.

**Spec:** `docs/superpowers/specs/2026-11-17-stage-1-integration-design.md`

## Global Constraints

- Не использовать и не копировать секреты, присланные в чат. Считать их раскрытыми.
- Не подключать R2, AI, Telegram Business, админ-панель и пользовательские API.
- Не показывать выдуманные статусы подключения, балансы, диалоги и кнопки.
- Один deployable Worker. Deploy только после успешных `typecheck`, `test`, `build`.
- Секреты: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`.
- Публичные vars: `TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_CHANNEL_URL`, `APP_BASE_URL`, `OWNER_TELEGRAM_ID`.
- GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Локальный `database_id` остаётся `local-only-placeholder`; реальный ID не выдумывать.
- Все проверки запускаются через npm scripts из `package.json`.

## Review Focus

- Неверный или отсутствующий `x-telegram-bot-api-secret-token` → `401`, без обработки update. Тест в Task 2.
- Повторный `update_id` → ответ `200` с `duplicate: true`, без повторной отправки. Тест в Task 2.
- `/start` без `TELEGRAM_CHANNEL_ID` → явное сообщение «канал не настроен», без кнопки Mini App. Тест в Task 2.
- `getChatMember` со статусом не `member`/`administrator`/`creator` → приглашение подписаться, без Mini App. Тест в Task 2.
- Отсутствующий `APP_BASE_URL` → сообщение без кнопки, без выдуманного URL. Тест в Task 2.

---

### Task 1: Env contract и таблица идемпотентности

**Files:**
- Create: `worker/env.ts`
- Create: `migrations/0002_telegram.sql`
- Create: `tests/migrations-telegram.test.ts`
- Modify: `worker/app.ts`

**Interfaces:**
- Consumes: `D1Database` из `@cloudflare/workers-types`.
- Produces: `Env` с полями `DB?`, `TELEGRAM_BOT_TOKEN?`, `TELEGRAM_WEBHOOK_SECRET?`, `TELEGRAM_BOT_USERNAME?`, `TELEGRAM_CHANNEL_ID?`, `TELEGRAM_CHANNEL_URL?`, `APP_BASE_URL?`, `OWNER_TELEGRAM_ID?`.

- [x] **Step 1: Создать failing test для migration**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../migrations/0002_telegram.sql", import.meta.url),
  "utf8",
);

describe("telegram update migration", () => {
  it("creates an idempotency table without sample data", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS telegram_updates/i);
    expect(migration).toMatch(/update_id INTEGER PRIMARY KEY/i);
    expect(migration).toMatch(/received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/i);
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
  });
});
```

- [x] **Step 2: Запустить тест и подтвердить падение**

Run: `npm test -- tests/migrations-telegram.test.ts`
Expected: FAIL, файл миграции не найден.

- [x] **Step 3: Реализовать `worker/env.ts` и миграцию**

`worker/env.ts` экспортирует `interface Env` со списком полей из Interfaces. Все поля необязательные.

`migrations/0002_telegram.sql` содержит только:

```sql
CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id INTEGER PRIMARY KEY,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

В `worker/app.ts` заменить локальное объявление `Env` на `import type { Env } from "./env"`.

- [x] **Step 4: Запустить тест и убедиться в прохождении**

Run: `npm test -- tests/migrations-telegram.test.ts`
Expected: PASS, 1 test.

- [x] **Step 5: Проверить typecheck и локальную миграцию**

Run: `npm run typecheck && npm run db:migrate:local`
Expected: оба завершаются без ошибок.

- [x] **Step 6: Commit**

```bash
git add worker/env.ts migrations/0002_telegram.sql tests/migrations-telegram.test.ts worker/app.ts
git commit -m "feat: add telegram env contract and idempotency migration"
```

### Task 2: Bot API client и webhook handler

**Files:**
- Create: `worker/telegram.ts`
- Create: `worker/telegram-webhook.ts`
- Create: `tests/telegram-webhook.test.ts`
- Modify: `worker/app.ts`

**Interfaces:**
- Consumes: `Env` из `worker/env.ts`.
- Produces:
  - `safeEqual(a: string, b: string): boolean`
  - `telegramApiUrl(token: string, method: string): string`
  - `callTelegramApi<T>(token: string, method: string, body: Record<string, unknown>): Promise<{ ok: boolean; result?: T; description?: string; error_code?: number }>`
  - `getChatMember(token: string, chatId: number, userId: number): Promise<{ ok: boolean; result?: { status: string }; description?: string }>`
  - `sendMessage(token: string, chatId: number, text: string, replyMarkup?: unknown): Promise<{ ok: boolean; description?: string }>`
  - `handleTelegramWebhook(request: Request, env: Env): Promise<Response>`
  - `TelegramUpdate`: `{ update_id: number; message?: { message_id: number; chat: { id: number }; from?: { id: number }; text?: string } }`

- [x] **Step 1: Написать failing tests для secret и идемпотентности**

В `tests/telegram-webhook.test.ts` добавить тесты:
- `rejects requests without the webhook secret`: `Request` без заголовка → статус `401`, JSON `{ ok: false }`, `fetch` не вызывался.
- `rejects an invalid webhook secret`: неверный заголовок → статус `401`.
- `ignores a duplicate update`: D1 возвращает существующую строку для `update_id`, `sendMessage` не вызывается, ответ `200` и `{ ok: true, duplicate: true }`.

- [x] **Step 2: Запустить тесты и подтвердить падение**

Run: `npm test -- tests/telegram-webhook.test.ts`
Expected: FAIL, модуль `worker/telegram-webhook` не найден.

- [x] **Step 3: Реализовать `worker/telegram.ts`**

`telegramApiUrl` возвращает `https://api.telegram.org/bot${token}/${method}`.
`callTelegramApi` делает `POST` с `Content-Type: application/json` и разбирает JSON.
`safeEqual` сравнивает строки по длине и накапливает XOR по `charCodeAt`.
`getChatMember` вызывает `getChatMember` с `chat_id` и `user_id`.
`sendMessage` вызывает `sendMessage` с `chat_id`, `text` и опциональным `reply_markup`.

- [x] **Step 4: Реализовать `worker/telegram-webhook.ts`**

`handleTelegramWebhook`:
1. Проверяет `x-telegram-bot-api-secret-token` через `safeEqual`; при отсутствии secret в env или несовпадении returns `401` `{ ok: false }`.
2. Разбирает JSON тела; невалидный JSON → `400` `{ ok: false }`.
3. Проверяет `telegram_updates` по `update_id`; при наличии returns `200` `{ ok: true, duplicate: true }`.
4. Вставляет `update_id` в `telegram_updates`; ошибка вставки → `500` `{ ok: false }`.
5. Если `message.text` не начинается с `/start`, returns `200` `{ ok: true }`.
6. Для `/start`:
   - без `TELEGRAM_BOT_TOKEN` → `500` `{ ok: false }`;
   - без `TELEGRAM_CHANNEL_ID` → `sendMessage` с текстом, что подписка на канал не настроена, без кнопки;
   - с channel ID → `getChatMember`; при статусе вне `member`, `administrator`, `creator` → `sendMessage` с приглашением подписаться и `TELEGRAM_CHANNEL_URL`, если он задан, без кнопки;
   - при разрешённом статусе или отсутствии channel config → если `APP_BASE_URL` задан, `sendMessage` с inline-кнопкой «Открыть Mini App» и этим URL; иначе `sendMessage` с текстом, что Mini App URL не настроен;
   - returns `200` `{ ok: true }`.
7. Не логирует token, secret и тело update.

В `worker/app.ts` зарегистрировать `app.post("/api/telegram/webhook", ...)` через `handleTelegramWebhook`.

- [x] **Step 5: Добавить remaining Review Focus тесты**

В `tests/telegram-webhook.test.ts` добавить:
- `start without channel config says channel is not configured and sends no button`
- `start with non-member status sends subscribe prompt and no button`
- `start with member status and configured URL sends Mini App button`
- `start without APP_BASE_URL sends no button`
- `safeEqual accepts equal strings and rejects mismatched strings`

- [x] **Step 6: Запустить тесты и убедиться в прохождении**

Run: `npm test -- tests/telegram-webhook.test.ts`
Expected: PASS, 9 tests.

- [x] **Step 7: Полные проверки**

Run: `npm run typecheck && npm test && npm run build && npm run smoke:local`
Expected: все завершаются без ошибок.

- [x] **Step 8: Commit**

```bash
git add worker/telegram.ts worker/telegram-webhook.ts tests/telegram-webhook.test.ts worker/app.ts
git commit -m "feat: add telegram webhook with idempotency"
```

### Task 3: Deploy workflow и remote D1 setup

**Files:**
- Create: `.github/workflows/setup-d1.yml`
- Modify: `.github/workflows/ci.yml`
- Modify: `wrangler.jsonc` — только после получения реального database ID
- Modify: `README.md`, `ENVIRONMENT.md`, `DEPLOYMENT.md`, `ROADMAP.md`, `TASKS.md`, `CHANGELOG.md`, docs spec/plan

**Interfaces:**
- Consumes: `dist/worker/wrangler.json`, созданный `npm run build`.
- Produces: deploy job в `ci.yml`; manual workflow для создания D1.

- [x] **Step 1: Добавить `workflow_dispatch` workflow для создания D1**

`.github/workflows/setup-d1.yml`: `on: workflow_dispatch`, `permissions: contents: read`, checkout, setup-node `26`, `npm ci`, `npx wrangler d1 create ecstasy` с env:
`CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}`, `CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`.

- [x] **Step 2: Добавить deploy job в `ci.yml`**

После job `checks` добавить `deploy` с `needs: checks`, `if: github.event_name == 'push' && github.ref == 'refs/heads/main' && vars.CLOUDFLARE_DEPLOY_ENABLED == 'true'`, `environment: production`, `permissions: contents: read`. Шаги: checkout, setup-node `26`, `npm ci`, `npm run build`, `npx wrangler d1 migrations apply ecstasy --remote`, `npx wrangler deploy --config dist/worker/wrangler.json`. Env для Wrangler-шагов: те же два GitHub secret. Переменная репозитория `CLOUDFLARE_DEPLOY_ENABLED` создаётся со значением `false` и переключается в `true` только после записи реального D1 database ID.

- [x] **Step 3: Проверить YAML и отсутствие secret refs вне workflow**

Run: локальный парсер YAML + `grep -R "secrets\." .github/workflows`
Expected: валидный YAML; `secrets.*` встречается только в `ci.yml` и `setup-d1.yml`.

- [x] **Step 4: Обновить документацию**

Отразить: GitHub secrets подтверждены; Worker secrets заданы владельцем; remote D1 и deploy заблокированы до реального database ID и публичных vars; R2 не используется; Этап 1 остаётся незавершённым до живого smoke test и registration webhook.

- [x] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/setup-d1.yml README.md ENVIRONMENT.md DEPLOYMENT.md ROADMAP.md TASKS.md CHANGELOG.md docs/superpowers/specs/2026-11-17-stage-1-integration-design.md docs/superpowers/plans/2026-11-17-stage-1-integration.md
git commit -m "feat: add cloudflare deploy workflow and d1 setup"
```

### Task 4: Remote проверка и фиксация ID

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `README.md`, `DEPLOYMENT.md`, `ROADMAP.md`, `TASKS.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: database ID из вывода `workflow_dispatch` из Task 3.
- Produces: реальный remote D1 binding; подтверждённый deploy.

- [x] **Step 1: Запустить `Setup D1` в GitHub Actions и взять database ID из лога**

Expected: D1 `ecstasy` создан, лог содержит database ID. ID не секрет, но не выдумывать.

- [x] **Step 2: Записать ID в `wrangler.jsonc` вместо `local-only-placeholder`, commit и push**

```bash
git add wrangler.jsonc
git commit -m "chore: configure remote d1 database"
git push origin main
```

- [x] **Step 3: Дождаться deploy job в GitHub Actions и проверить job log**

Expected: migrations и deploy завершились успешно. Первый run `44172221839` упал из-за `database_name: "ecstasy-local"`; исправлено commit `0040602`, повторный run `44172513937` прошёл.

- [x] **Step 4: Выполнить живой smoke test публичного URL**

Run: `curl https://<actual-worker-url>/api/health`
Expected: `200`, JSON `{ "status": "ok", "database": "available" }`.

- [x] **Step 5: Обновить статусы и зафиксировать результат**

Обновить `README.md`, `ENVIRONMENT.md`, `DEPLOYMENT.md`, `ROADMAP.md`, `TASKS.md`, `CHANGELOG.md`. `APP_BASE_URL` задан как Worker URL, Telegram webhook зарегистрирован через защищённый temporary setup endpoint. Channel ID/URL заданы, бот подтверждён как администратор; оставить живой `/start` и открытие Mini App неподтверждёнными до действия пользователя.

- [x] **Step 6: Commit и push**

```bash
git add wrangler.jsonc README.md ENVIRONMENT.md DEPLOYMENT.md ROADMAP.md TASKS.md CHANGELOG.md docs/superpowers/plans/2026-11-17-stage-1-integration.md
git commit -m "docs: record stage 1 live verification"
git push origin main
```
