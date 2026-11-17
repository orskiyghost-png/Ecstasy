# Ecstasy

Локально проверенный каркас Telegram Mini App и API на одном Cloudflare Worker.

## Требования

- Node.js 22 или новее.
- npm из состава Node.js.

## Локальная разработка

```sh
npm ci
npm run db:migrate:local
npm run dev
```

Vite поднимает Mini App и Worker. API endpoints: `/api/health` и `POST /api/telegram/webhook`.
Локальная D1 создаётся Wrangler автоматически; миграции лежат в `migrations/`.
Webhook требует заголовок `x-telegram-bot-api-secret-token` и использует D1 для идемпотентности.

## Проверки

```sh
npm run typecheck
npm test
npm run build
npm run db:migrate:check
npm run smoke:local
```

GitHub Actions запускает `typecheck`, `test` и `build` для pull request и push в `main`.
Deploy job включается переменной `CLOUDFLARE_DEPLOY_ENABLED` только после создания remote D1.

## Ограничения статуса

Это локально проверенный каркас, не опубликованный деплой. GitHub secrets добавлены;
Telegram Worker secrets заданы владельцем. Remote D1, реальный database ID, домен,
канал, bot username и Mini App URL неизвестны. Health endpoint и webhook проверены локально.
Живой Telegram flow не проверен. Этап 1 остаётся незавершённым.
