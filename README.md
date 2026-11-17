# Ecstasy

Локальный каркас Telegram Mini App и API на одном Cloudflare Worker.

## Требования

- Node.js 22 или новее.
- npm из состава Node.js.

## Локальная разработка

```sh
npm ci
npm run db:migrate:local
npm run dev
```

Vite поднимает Mini App и Worker. API health endpoint: `/api/health`.
Локальная D1 создаётся Wrangler автоматически; миграции лежат в `migrations/`.

## Проверки

```sh
npm run typecheck
npm test
npm run build
```

GitHub Actions запускает те же проверки для pull request и push в `main`.
Workflow не использует secrets и не выполняет deploy.

## Ограничения статуса

Это только локальный каркас. Cloudflare Worker и D1 в аккаунте не созданы;
домен, Telegram bot, канал, webhook и опубликованный Mini App не настроены.
Health endpoint проверяет D1, но не реализует пользовательскую авторизацию.
Этап 1 остаётся незавершённым до проверки внешней инфраструктуры и Telegram flow.
