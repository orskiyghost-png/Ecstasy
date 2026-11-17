# Деплой

## Целевая схема

Один Cloudflare Worker публикует Vite static assets, API `/api/health`, Telegram webhook и пустой Mini App. Публикация выполнена через GitHub Actions.

## Подтверждённое

- GitHub secrets `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID` добавлены; раскрытые в чате credentials не использованы.
- Telegram Worker secrets `TELEGRAM_BOT_TOKEN` и `TELEGRAM_WEBHOOK_SECRET` заданы владельцем в Cloudflare; локально значения не проверялись.
- GitHub Actions проверяет `typecheck`, `test`, `build`. Deploy job включён переменной `CLOUDFLARE_DEPLOY_ENABLED=true`.
- Remote D1 `ecstasy` создан workflow `Setup D1`, реальный database ID записан в `wrangler.jsonc`, миграции применены при deploy.
- Deploy подтвержден в runs `44172513937` и `44173249253`. Worker: `https://ecstasy.orskiyghost.workers.dev`. Последний Version ID: `876f21a7-7e86-4696-a462-1720b38c22e9`.
- Живой smoke test после последнего deploy: `GET /api/health` вернул `{"status":"ok","database":"available"}`; `GET /` вернул `200`; `POST /api/telegram/webhook` без secret вернул `401`.
- `APP_BASE_URL` задан как Worker URL и подтвержден в логе deploy.

## Заблокированное

- `TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_CHANNEL_URL` и `OWNER_TELEGRAM_ID` неизвестны.
- Webhook не зарегистрирован: нужен безопасный доступ к ротированному bot token.
- Живой `/start`, проверка подписки и открытие Mini App не проверены.
- R2, AI и пользовательские API не подключены.

## Правила публикации

1. Отозвать раскрытые в чате Cloudflare API и R2 credentials; новые секреты выдавать с минимальными правами и хранить вне Git.
2. Использовать только GitHub Actions. Не включать Cloudflare build integration или другие deploy-триггеры для одного приложения.
3. Разделить production и preview bindings/configuration; не направлять preview на production D1 без явного решения и изоляции.
4. Публиковать только после успешной сборки и проверок. Ошибка сборки не должна обновлять production.
5. Записывать реальный D1 database ID в `wrangler.jsonc` до включения deploy.
6. Регистрировать Telegram webhook только после настройки Worker URL и secret через безопасные bindings.
7. После публикации проверять фактический URL, health endpoint, Worker logs без секретов и тестовый Telegram flow. Не объявлять Stage 1 завершённым до проверки flow.

## Внешние действия владельца

Нужны безопасные публичные значения Telegram и способ регистрации webhook через ротированный token. Затем проверить `/start`, подписку и открытие Mini App на реальном боте. Неизвестные значения нельзя подставлять заранее.
