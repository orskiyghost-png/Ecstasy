# Дорожная карта

Статус отражает репозиторий на дату обновления. Незавершённые этапы не считаются обещанием срока или готовности.

| Этап | Содержание | Статус |
|---|---|---|
| 0 — аудит и проектирование | Аудит репозитория, архитектура, документы, `.gitignore`, `.env.example` | Завершён, документация проверена локально |
| 1 — инфраструктура и подключение | Worker, D1, выбранный CI/CD, Telegram bot, канал и пустой Mini App | Worker, D1 и webhook готовы; канал и живой `/start` заблокированы |
| 2 — frontend shell | Токены, оболочка, навигация, общие состояния, Telegram SDK | Не начат |
| 3 — чаты | Реальные доступные диалоги, сообщения, поиск и пустое состояние | Не начат |
| 4 — агент | Промпты, база знаний, выбор доступных моделей | Не начат |
| 5 — профиль и админ | Профиль, фактическая статистика, защищённая админ-панель | Не начат |
| 6 — backend и база | D1 migrations, auth, пользовательские API, роли и аудит | Не начат |
| 7 — Telegram Business | Разрешения, доступные диалоги/сообщения, отправка, отзыв | Не начат |
| 8 — AI и providers | Адаптеры, серверные секреты, fallback, usage и защита дублей | Не начат |
| 9 — баланс и завершение | Ledger, статистика, тесты, security review и production | Не начат |

## Переход к Этапу 1

GitHub secrets подтверждены. Remote D1 создан, database ID записан, deploy включён. Worker опубликован: `https://ecstasy.orskiyghost.workers.dev`. Живой `GET /api/health` вернул `{"status":"ok","database":"available"}`, SPA отдаёт `200`.

Telegram bot `@ecstasy_aibot`. Webhook зарегистрирован на `https://ecstasy.orskiyghost.workers.dev/api/telegram/webhook`; `pending_update_count: 0`. Bot token, webhook secret и `APP_BASE_URL` присутствуют.

`TELEGRAM_CHANNEL_ID` и `TELEGRAM_CHANNEL_URL` отсутствуют. Пока канал не настроен, `/start` отвечает сообщением о ненастроенной подписке. Живой flow не подтверждён. Не вставляй секреты в чат или файлы Git.

## Подфаза живого деплоя Этапа 1

- Реализованы React/Vite Mini App, Hono Worker, `GET /api/health`, `POST /api/telegram/webhook` и защищённый temporary `POST /api/telegram/setup`.
- Добавлены D1 migrations users и telegram_updates, GitHub Actions CI и deploy job с guard, Setup D1 workflow, Telegram setup workflow.
- Typecheck, 19 unit tests, build, локальные миграции и smoke test проверены.
- CI run `44176131079` завершил `checks` и `deploy`.
- Webhook registration подтверждена через Telegram `getWebhookInfo`.
- Публичные channel values, проверка админа канала и живой `/start` остаются заблокированными.
- Весь Этап 1 остаётся незавершённым; к Этапу 2 не переходить.
