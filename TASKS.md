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

## Этап 1 — код готов; живая интеграция заблокирована

- [x] Подтвердить GitHub secrets `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID`. Раскрытые credentials не использованы.
- [x] Подтвердить, что Telegram Worker secrets заданы владельцем в Cloudflare.
- [ ] Подтвердить Telegram bot username, обязательный канал, channel ID/URL и необходимые права.
- [ ] Подтвердить домен или Worker URL и способ разделения preview/production.
- [x] Выбрать GitHub Actions для CI и deploy.
- [x] Реализовать Worker, health endpoint, Telegram webhook, D1 migrations, пустой Mini App и CI checks.
- [x] Добавить deploy job с guard и workflow `Setup D1`.
- [x] Проверить локально typecheck, 14 unit tests, build, миграции и smoke test.
- [ ] Запустить `Setup D1`, записать реальный database ID и включить deploy.
- [ ] Задать публичные Worker vars: bot username, channel ID/URL, app URL, owner ID.
- [ ] Зарегистрировать Telegram webhook на публичном Worker URL.
- [ ] Проверить `/start`, подписку и открытие Mini App на реальных настройках.
- [ ] Проверить живой health endpoint и пройти Telegram flow после деплоя.

Весь Этап 1 остаётся незавершённым до живых Cloudflare и Telegram проверок. Не переходить к Этапу 2.

## Последующие этапы

Следовать последовательности и критериям `ROADMAP.md` и мастер-промпта. Не добавлять фиктивные данные, не перепрыгивать через этапы и обновлять этот файл после каждой завершённой фазы.
