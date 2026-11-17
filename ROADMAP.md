# Дорожная карта

Статус отражает репозиторий на дату обновления. Незавершённые этапы не считаются обещанием срока или готовности.

| Этап | Содержание | Статус |
|---|---|---|
| 0 — аудит и проектирование | Аудит репозитория, архитектура, документы, `.gitignore`, `.env.example` | Завершён, документация проверена локально |
| 1 — инфраструктура и подключение | Worker, D1, выбранный CI/CD, Telegram bot, канал и пустой Mini App | Worker и D1 задеплоены, health проверен; Telegram flow заблокирован |
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

Telegram Worker secrets заданы владельцем. Bot username, channel ID/URL и owner ID неизвестны. Webhook не зарегистрирован. Не вставляй секреты в чат или файлы Git.

## Подфаза живого деплоя Этапа 1

- Реализованы React/Vite Mini App, Hono Worker, `GET /api/health` и `POST /api/telegram/webhook`.
- Добавлены D1 migrations users и telegram_updates, GitHub Actions CI и deploy job с guard, Setup D1 workflow.
- Typecheck, 14 unit tests, build, локальные миграции и smoke test проверены.
- CI run `44172513937` завершил `checks` и `deploy`. Worker и remote D1 доступны.
- `APP_BASE_URL` подтвержден в логе deploy; живой smoke test повторен после последнего deploy.
- Публичные Telegram values, регистрация webhook и живой `/start` остаются заблокированными.
- Весь Этап 1 остаётся незавершённым; к Этапу 2 не переходить.
