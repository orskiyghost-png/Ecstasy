# Задачи

## Этап 0 — завершён

- [x] Проверить ветку, remote, структуру и историю Git.
- [x] Подтвердить, что в репозитории нет приложения, manifest-файлов, конфигурации Cloudflare и CI.
- [x] Проверить отслеживаемые файлы на распространённые форматы секретов.
- [x] Изучить ограничения Telegram Business и актуальные Cloudflare Workers static assets/Vite/D1 материалы.
- [x] Зафиксировать целевую архитектуру и открытые вопросы.
- [x] Создать документацию, `.gitignore` и безопасный `.env.example`.
- [x] Проверить diff, форматирование и отсутствие известных форматов секретов в новых файлах.
- [x] Создать commit и отправить в `origin/main`.

## Этап 1 — инфраструктура и webhook готовы; канал и `/start` заблокированы

- [x] Подтвердить GitHub secrets `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID`. Раскрытые credentials не использованы.
- [x] Подтвердить, что Telegram Worker secrets заданы владельцем в Cloudflare.
- [x] Подтвердить обязательный канал, channel ID/URL и права. Bot `@ecstasy_aibot`, channel `-1004331237068`, bot status `administrator`.
- [x] Подтвердить Worker URL `https://ecstasy.orskiyghost.workers.dev`. Разделение preview/production не реализовано.
- [x] Выбрать GitHub Actions для CI и deploy.
- [x] Реализовать Worker, health endpoint, Telegram webhook, D1 migrations, пустой Mini App и CI checks.
- [x] Добавить deploy job с guard, workflow `Setup D1` и защищённый `Telegram setup`.
- [x] Проверить локально typecheck, 19 unit tests, build, миграции и smoke test.
- [x] Запустить `Setup D1`, записать реальный database ID и включить deploy.
- [x] Задать публичные Worker vars: `APP_BASE_URL`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_CHANNEL_URL`. `OWNER_TELEGRAM_ID` отложен; текущий `/start` его не использует.
- [x] Зарегистрировать Telegram webhook на публичном Worker URL. `getWebhookInfo` подтвердил URL и `pending_update_count: 0`.
- [ ] Проверить `/start`, подписку и открытие Mini App на реальных настройках.
- [x] Проверить живой health endpoint: `{"status":"ok","database":"available"}`, SPA `200`.

Весь Этап 1 остаётся незавершённым до живых Cloudflare и Telegram проверок. Не переходить к Этапу 2.

## Последующие этапы

Следовать последовательности и критериям `ROADMAP.md` и мастер-промпта. Не добавлять фиктивные данные, не перепрыгивать через этапы и обновлять этот файл после каждой завершённой фазы.
