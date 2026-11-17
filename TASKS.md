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

## Этап 1 — деплой проверен; Telegram flow заблокирован

- [x] Подтвердить GitHub secrets `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID`. Раскрытые credentials не использованы.
- [x] Подтвердить, что Telegram Worker secrets заданы владельцем в Cloudflare.
- [ ] Подтвердить Telegram bot username, обязательный канал, channel ID/URL и необходимые права.
- [x] Подтвердить Worker URL `https://ecstasy.orskiyghost.workers.dev`. Разделение preview/production не реализовано.
- [x] Выбрать GitHub Actions для CI и deploy.
- [x] Реализовать Worker, health endpoint, Telegram webhook, D1 migrations, пустой Mini App и CI checks.
- [x] Добавить deploy job с guard и workflow `Setup D1`.
- [x] Проверить локально typecheck, 14 unit tests, build, миграции и smoke test.
- [x] Запустить `Setup D1`, записать реальный database ID и включить deploy.
- [ ] Задать публичные Worker vars: bot username, channel ID/URL, owner ID. `APP_BASE_URL` задан в `wrangler.jsonc`.
- [ ] Зарегистрировать Telegram webhook на публичном Worker URL.
- [ ] Проверить `/start`, подписку и открытие Mini App на реальных настройках.
- [x] Проверить живой health endpoint: `{"status":"ok","database":"available"}`, SPA `200`.

Весь Этап 1 остаётся незавершённым до живых Cloudflare и Telegram проверок. Не переходить к Этапу 2.

## Последующие этапы

Следовать последовательности и критериям `ROADMAP.md` и мастер-промпта. Не добавлять фиктивные данные, не перепрыгивать через этапы и обновлять этот файл после каждой завершённой фазы.
