# История изменений

Значимые изменения проекта. Документация не подразумевает наличие реализованной функциональности.

## 2026-11-17

- Завершён Этап 0: добавлены архитектура, дизайн-система, roadmap, задачи и документы безопасности, окружения, деплоя и API.
- Зафиксировано решение проектировать единый Cloudflare Worker для static assets, API и webhook с D1.
- Добавлены `.gitignore` и безопасный `.env.example` без значений секретов.
- Задокументировано, что Cloudflare API и R2 credentials были отправлены в чат и требуют отзыва/ротации до использования.
- Добавлен локальный React/Vite Mini App, Hono Worker health endpoint и начальная D1 migration.
- Добавлены GitHub Actions CI checks без deploy и документация команд локальной проверки.
- Этап 1 остаётся частично выполненным: внешние Cloudflare ресурсы и Telegram flow не настроены.
- Добавлены Telegram webhook с проверкой secret, идемпотентностью и обработкой `/start` без фиктивных статусов.
- Добавлены deploy workflow с guard, `Setup D1` workflow и документация по GitHub/Cloudflare переменным.
- GitHub secrets подтверждены; remote D1, публичные vars и живой Telegram flow остаются заблокированными.
- Remote D1 `ecstasy` создан через `Setup D1`; database ID записан, deploy включён и выполнен CI run `44172513937`.
- Worker опубликован: `https://ecstasy.orskiyghost.workers.dev`. Живой `/api/health` вернул `{"status":"ok","database":"available"}`, SPA `200`.
- Добавлен `APP_BASE_URL` как публичная переменная Worker. Регистрация webhook и живой Telegram flow остаются заблокированными; Этап 1 не завершён.
