# Деплой

## Целевая схема

Один Cloudflare Worker публикует Vite static assets, API `/api/health`, Telegram webhook и пустой Mini App. Публикация выполнена через GitHub Actions.

## Подтверждённое

- GitHub secrets `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID` добавлены; раскрытые в чате credentials не использованы.
- Telegram Worker secrets `TELEGRAM_BOT_TOKEN` и `TELEGRAM_WEBHOOK_SECRET` заданы владельцем в Cloudflare; локально значения не проверялись.
- GitHub Actions проверяет `typecheck`, `test`, `build`. Deploy job включён переменной `CLOUDFLARE_DEPLOY_ENABLED=true`.
- Remote D1 `ecstasy` создан workflow `Setup D1`, реальный database ID записан в `wrangler.jsonc`, миграции применены при deploy.
- Deploy подтвержден в runs `44172513937`, `44173249253` и `44173480948`. Worker: `https://ecstasy.orskiyghost.workers.dev`. Version ID run `44173249253`: `876f21a7-7e86-4696-a462-1720b38c22e9`.
- Живой smoke test после deploy: `GET /api/health` вернул `{"status":"ok","database":"available"}`; `GET /` вернул `200`; `POST /api/telegram/webhook` без secret вернул `401`.
- `APP_BASE_URL` задан как Worker URL и подтвержден в логе deploy. `TELEGRAM_BOT_USERNAME` задан как `ecstasy_aibot`.
- Telegram webhook зарегистрирован на `https://ecstasy.orskiyghost.workers.dev/api/telegram/webhook`. `getWebhookInfo` вернул этот URL, `pending_update_count: 0`, без `last_error_message`.
- `POST`-проверка через защищённый setup endpoint подтвердила: bot token, webhook secret, app URL, channel ID и channel URL присутствуют; Telegram bot `@ecstasy_aibot`.
- Канал `Ecstasy AI`: ID `-1004331237068`, URL `https://t.me/ecstasy_ai_bot`. `getChatMember` вернул `administrator` для бота.

## Заблокированное

- Живой `/start` с проверкой подписки и открытием Mini App не подтверждён.
- `OWNER_TELEGRAM_ID` неизвестен; текущий `/start` его не использует.
- R2, AI и пользовательские API не подключены.

## One-time Telegram setup

Workflow `Telegram setup` создаёт случайный `SETUP_TOKEN`, записывает его как Worker secret, вызывает защищённый `POST /api/telegram/setup` и удаляет secret. Endpoint не возвращает token или webhook secret. Без `SETUP_TOKEN` endpoint отвечает `404`. Использовать только для настройки и диагностики; после завершения Этапа 1 удалить endpoint и workflow.

## Правила публикации

1. Отозвать раскрытые в чате Cloudflare API и R2 credentials; новые секреты выдавать с минимальными правами и хранить вне Git.
2. Использовать только GitHub Actions. Не включать Cloudflare build integration или другие deploy-триггеры для одного приложения.
3. Разделить production и preview bindings/configuration; не направлять preview на production D1 без явного решения и изоляции.
4. Публиковать только после успешной сборки и проверок. Ошибка сборки не должна обновлять production.
5. Записывать реальный D1 database ID в `wrangler.jsonc` до включения deploy.
6. Регистрировать Telegram webhook только после настройки Worker URL и secret через безопасные bindings.
7. После публикации проверять фактический URL, health endpoint, Worker logs без секретов и тестовый Telegram flow. Не объявлять Stage 1 завершённым до проверки flow.

## Внешние действия владельца

Нужны публичные `TELEGRAM_CHANNEL_ID` и `TELEGRAM_CHANNEL_URL` либо ссылка на канал, по которой их можно получить через Bot API. Бот должен быть администратором канала. Затем проверить `/start`, подписку и открытие Mini App на реальном боте. Неизвестные значения нельзя подставлять заранее.
