# Деплой

## Целевая схема

Конфигурация готовит один Cloudflare Worker, публикующий Vite static assets, API и Telegram webhook. Это не опубликованный или проверенный внешний deploy.

## Подтверждённое и заблокированное

- GitHub secrets `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID` добавлены.
- Telegram Worker secrets `TELEGRAM_BOT_TOKEN` и `TELEGRAM_WEBHOOK_SECRET` заданы владельцем в Cloudflare.
- GitHub Actions проверяет `typecheck`, `test`, `build`. Deploy job добавлен, но выключен переменной `CLOUDFLARE_DEPLOY_ENABLED=false`.
- Создан `workflow_dispatch` workflow `Setup D1` для создания remote D1.
- Cloudflare Worker и remote D1 ещё не созданы; `wrangler.jsonc` содержит `database_id: "local-only-placeholder"`.
- Домен, DNS, `APP_BASE_URL`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_CHANNEL_URL`, `TELEGRAM_BOT_USERNAME` и `OWNER_TELEGRAM_ID` неизвестны.
- Регистрация Telegram webhook и живой `/start` не выполнены.

## Правила будущей публикации

1. Перед настройкой отозвать раскрытые в чате Cloudflare API и R2 credentials; новые секреты выдавать с минимальными правами и хранить вне Git.
2. Использовать только GitHub Actions. Не включать Cloudflare build integration или другие deploy-триггеры для одного приложения.
3. Разделить production и preview bindings/configuration; не направлять preview на production D1 без явного решения и изоляции.
4. Публиковать только после успешной сборки и применимых проверок. Ошибка сборки не должна обновлять production.
5. Записать реальный D1 database ID в `wrangler.jsonc`, затем переключить `CLOUDFLARE_DEPLOY_ENABLED` в `true`.
6. Зарегистрировать Telegram webhook только после настройки Worker URL и webhook secret через безопасные bindings.
7. После публикации проверить фактический URL, health endpoint, Worker logs без секретов и тестовый Telegram flow. Не объявлять deploy успешным до проверки.

## Внешние действия владельца

Нужно запустить `Setup D1`, записать полученный ID, задать публичные vars и включить deploy. Затем зарегистрировать webhook и проверить `/start` на реальном боте. Неизвестные значения нельзя подставлять заранее.
