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

Vite поднимает Mini App и Worker. API endpoints: `/api/health`, `POST /api/telegram/webhook` и защищённый `POST /api/telegram/setup`.
Локальная D1 создаётся Wrangler автоматически; миграции лежат в `migrations/`.
Webhook требует заголовок `x-telegram-bot-api-secret-token` и использует D1 для идемпотентности.
Setup endpoint отвечает `404`, если temporary `SETUP_TOKEN` не задан.

## Проверки

```sh
npm run typecheck
npm test
npm run build
npm run db:migrate:check
npm run smoke:local
```

GitHub Actions запускает `typecheck`, `test` и `build` для pull request и push в `main`.
Deploy job включается переменной `CLOUDFLARE_DEPLOY_ENABLED`.

## Статус

Worker опубликован: `https://ecstasy.orskiyghost.workers.dev`.
Живой `GET /api/health` вернул `{"status":"ok","database":"available"}`; SPA отдаёт `200`.
Remote D1 создан, миграции применены, deploy включён. Telegram bot: `@ecstasy_aibot`.
Webhook зарегистрирован на `https://ecstasy.orskiyghost.workers.dev/api/telegram/webhook`; pending updates `0`.
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` и `APP_BASE_URL` заданы. `TELEGRAM_CHANNEL_ID` и `TELEGRAM_CHANNEL_URL` отсутствуют.
Пока канал не настроен, `/start` отвечает сообщением о ненастроенной подписке и не открывает Mini App.
Живой `/start` с проверкой подписки и открытием Mini App не подтверждён. Этап 1 остаётся незавершённым.
