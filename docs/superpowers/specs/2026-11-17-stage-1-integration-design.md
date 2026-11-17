# Дизайн завершения Этапа 1: Cloudflare deploy и Telegram webhook

## Цель

Добавить deploy одного Worker через GitHub Actions и базовый Telegram webhook в этом же Worker. Секреты читаются только из GitHub Actions secrets и Cloudflare Worker secrets. Раскрытые в чате значения не используются и не копируются.

## Текущее состояние

- Коммит `22c264f` отправлен в `origin/main`, дерево чистое.
- GitHub secrets подтверждены: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Worker secrets заданы владельцем в Cloudflare: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`. Локально не проверены: `wrangler` не авторизован.
- Публичные значения бота, канала и домена неизвестны. Выдумывать их запрещено.
- Старые Cloudflare/R2/Telegram credentials раскрыты и подлежат ротации. R2 не используется.

## Подходы

1. **GitHub Actions deploy + Telegram webhook в одном Worker — выбран.** Одна архитектура деплоя; CI уже настроен; секреты остаются вне Git.
2. **Отдельный Worker для Telegram webhook — отклонён.** Две единицы деплоя и лишняя синхронизация D1.
3. **Ручной deploy с локального компьютера — отклонён.** Локальный `wrangler` не авторизован; секреты из чата нельзя применять.

## Объём

- Deploy workflow запускается на `push` в `main` после успешного `typecheck`, `test`, `build`. Использует только `secrets.CLOUDFLARE_API_TOKEN` и `secrets.CLOUDFLARE_ACCOUNT_ID`. Deploy job выключен переменной `CLOUDFLARE_DEPLOY_ENABLED=false` до записи реального D1 database ID.
- Remote D1 создаётся отдельным ручным `workflow_dispatch`. ID записывается в конфигурацию после получения. Миграции применяются `--remote` только после создания базы.
- `POST /api/telegram/webhook` проверяет заголовок `x-telegram-bot-api-secret-token`, stores `update_id` в D1 для идемпотентности и обрабатывает команду `/start`.
- `/start` проверяет подписку через `getChatMember`, если задан `TELEGRAM_CHANNEL_ID`. Кнопка Mini App добавляется только при заданном `APP_BASE_URL`. При отсутствии конфигурации бот явно сообщает, что настройка не выполнена, и не имитирует подключение.
- Env-контракт: секреты `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`; публичные vars `TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_CHANNEL_URL`, `APP_BASE_URL`, `OWNER_TELEGRAM_ID`.

## Вне объёма

Telegram Business connection, AI, пользовательские API, админ-панель, R2, фиктивные статусы, выдуманные ID и реальные пользовательские данные.

## Открытые вопросы

- Подтвердить, что Worker secrets заданы в Cloudflare.
- Получить `TELEGRAM_CHANNEL_ID`, `TELEGRAM_CHANNEL_URL`, `TELEGRAM_BOT_USERNAME`, `APP_BASE_URL`, `OWNER_TELEGRAM_ID` и реальный D1 database ID.
- Выбрать домен или Worker URL как публичную точку входа.

## Критерии приёмки

- `npm run typecheck`, `npm test`, `npm run build`, `npm run db:migrate:check`, `npm run smoke:local` проходят.
- Тесты webhook покрывают проверку secret, идемпотентность, `/start` без конфигурации и с конфигурацией на моках.
- Deploy workflow не содержит секретов в открытом виде и не запускается без успешных проверок.
- Документация различает подтверждённые GitHub secrets, заявленные Cloudflare secrets и отсутствующие публичные значения.
- Живой deploy и registration webhook выполняются только после создания remote D1 и подтверждения всех настроек.
