# Этап 1: инфраструктурный каркас — план реализации

> **Для автономных исполнителей:** выполняйте задачи по порядку. Отмечайте пункты после проверки результата.

**Цель:** создать локально проверяемый React Mini App и API в одном Cloudflare Worker с D1 и CI, не заявляя о неподключённых Telegram/Cloudflare ресурсах.

**Архитектура:** Vite собирает React SPA и Cloudflare Worker через официальный Vite plugin. Hono обслуживает API; Worker получает D1 через binding. GitHub Actions запускает проверки, но не деплоит без Cloudflare secret.

**Стек:** TypeScript, React, Vite, Cloudflare Workers/Vite plugin, Hono, D1, Vitest, GitHub Actions.

**Спецификация:** `docs/superpowers/specs/2026-11-17-stage-1-design.md`; требования: `telegram_ai_mini_app_prompt.md.txt`, раздел 12, Этап 1.

## Общие требования

- TypeScript остаётся основным языком.
- Не добавляй секреты, реальные данные пользователей, фиктивные Telegram статусы или выдуманные внешние IDs.
- Используй только один Worker deploy architecture.
- Не деплой без нового безопасного Cloudflare token и проверки его permissions.
- Тестируй каждый компонент до перехода к следующей задаче.
- Коммить готовые логические блоки обычными commit без force push.

## Глобальные ограничения

- «Используй TypeScript как основной язык во всём проекте.»
- «Не выдумывай их.» Не подставлять неизвестные Telegram, канал, домен и реальные Cloudflare resource IDs.
- «Не коммить `.env`, токены, ключи, пользовательские данные и другие секреты.»
- Переданные в чат credentials считать раскрытыми; не использовать их для CLI, API, deploy или secrets.
- Не добавлять Telegram mock flow и не показывать фальшивое состояние подключения.
- Не переходить к массовой реализации UI, Telegram Business или AI.
- Один deployable Worker; не настраивать одновременно Pages и второй Worker deploy.
- Не включать CI deploy без нового безопасного Cloudflare token и проверки scope.
- Коммитить каждый законченный логический блок; push делать без force в `origin/main`.

Локальный каркас — самостоятельная подфаза Этапа 1. Не отмечай весь Этап 1 завершённым и не переходи к Этапу 2, пока недоступны проверенные Cloudflare ресурсы, Telegram `/start`, проверка канала, webhook и открытие опубликованного Mini App.

## Файлы и границы

- `package.json`, lock-файл, `tsconfig.json`, `vite.config.ts`, `wrangler.jsonc` — зависимости и конфигурация сборки/Worker.
- `index.html`, `src/main.tsx`, `src/App.tsx`, `src/style.css` — минимальная честная оболочка Mini App.
- `worker/index.ts`, `worker/app.ts` — Worker entry и Hono API.
- `migrations/0001_initial.sql` — минимальная схема с настоящим назначением, без пользовательских данных.
- `tests/` — Worker/API и миграция.
- `.github/workflows/ci.yml` — проверки без secrets и публикации.
- `AGENTS.md`, `ARCHITECTURE.md`, `ENVIRONMENT.md`, `DEPLOYMENT.md`, `ROADMAP.md`, `TASKS.md`, `CHANGELOG.md` — актуальные инструкции и статусы.

## Review Focus

1. Отсутствующий D1 binding должен дать явный деградированный health status без crash и ложного успеха; проверить в worker test.
2. Неизвестные Telegram параметры не должны включать `/start`, webhook или ложное подключение; проверить тексты и отсутствие незаполненных внешних bindings.
3. Корневой SPA route должен отдавать приложение, а `/api/health` — JSON; проверить локальным smoke test.
4. CI должен работать без secrets и не деплоить; проверить workflow на отсутствие deploy-команд и обязательных secret references.
5. Миграция должна применяться повторно только согласно механизму Wrangler migrations; проверить локальным D1 migration command.

---

### Задача 1: Создать Vite/React и Worker каркас

**Файлы:**
- Создать: `package.json` и lock-файл
- Создать: `tsconfig.json`, `vite.config.ts`, `wrangler.jsonc`
- Создать: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/style.css`
- Создать: `worker/index.ts`, `worker/app.ts`
- Тест: `tests/worker.test.ts`

**Интерфейсы:**
- Worker env: `interface Env { DB: D1Database }`.
- Hono app экспортирует `createApp()`; `GET /api/health` возвращает JSON `{ status: "ok" | "degraded", database: "available" | "unavailable" }`.
- `GET /api/health` выполняет `SELECT 1` через D1; при отсутствующем binding или ошибке возвращает `503` и degraded JSON без секрета или exception details.
- SPA показывает «Каркас Mini App готов» и поясняет, что Telegram ещё не подключён; никаких fake data или кнопок подключения.

- [ ] Написать tests: healthy D1 возвращает `200` и `status: "ok"`; отсутствующий/ошибочный D1 возвращает `503` и `status: "degraded"`.
- [ ] Добавить минимальные dependencies, Vite plugin и lock-файл выбранного npm.
- [ ] Настроить strict TypeScript и Vite plugin для единого Worker с SPA assets.
- [ ] Реализовать Hono app и Worker entry с D1 binding.
- [ ] Создать простую адаптивную SPA с Telegram-статусом «не подключён» и без фиктивных данных.
- [ ] Запустить тесты и `npm run build`; подтвердить оба результата.
- [ ] Проверить `git diff --check` и секреты, затем commit: `feat: scaffold worker mini app`.

### Задача 2: Добавить D1 schema и локальные миграционные проверки

**Файлы:**
- Создать: `migrations/0001_initial.sql`
- Изменить: `wrangler.jsonc`, `package.json`
- Тест: `tests/migrations.test.ts`

**Интерфейсы:**
- Binding `DB` ссылается на placeholder database name и локальный migration directory; production `database_id` не выдумывать.
- Первая таблица — `users` с внутренним primary key, уникальным Telegram ID только как nullable до реализации auth, `created_at` и `updated_at`.
- В миграции нет реальных пользовательских записей, аккаунтных данных или секретов.

- [ ] Зафиксировать SQL constraints и индексы в migration.
- [ ] Проверить миграцию через Wrangler local D1 на чистом временном состоянии.
- [ ] Проверить таблицу и ограничения локальным SQL запросом.
- [ ] Не создавать удалённую D1 до безопасной авторизации и подтверждения названия ресурса.
- [ ] Запустить unit tests, build и D1 migration check; затем commit: `feat: add local d1 foundation`.

### Задача 3: Добавить GitHub Actions CI и точные команды

**Файлы:**
- Создать: `.github/workflows/ci.yml`
- Изменить: `package.json`, `AGENTS.md`
- Изменить: `README.md`

**Интерфейсы:**
- Scripts: `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`, `npm run db:migrate:local`.
- CI запускается для pull request и push в `main`; устанавливает версии из lock-файла и выполняет typecheck, tests, build.
- Workflow не читает secrets, не создаёт Cloudflare resources и не вызывает deploy.

- [ ] Добавить воспроизводимые npm scripts и README с локальными командами без секретов.
- [ ] Настроить Node LTS и cache lock-файла в CI.
- [ ] Проверить YAML и локально выполнить те же команды, что CI.
- [ ] Убедиться, что CI workflow не содержит deploy action/command и secret refs.
- [ ] Запустить полный CI набор локально; затем commit: `ci: add worker foundation checks`.

### Задача 4: Обновить документы, проверить и зафиксировать статус Этапа 1

**Файлы:**
- Изменить: `AGENTS.md`, `ARCHITECTURE.md`, `ENVIRONMENT.md`, `DEPLOYMENT.md`, `ROADMAP.md`, `TASKS.md`, `CHANGELOG.md`
- Изменить: `.gitignore`, если нужны generated files

- [ ] Задокументировать версии, команды, локальный D1, Worker health route и CI.
- [ ] Разделить локально проверенные компоненты и внешние ресурсы, которые не созданы.
- [ ] Отметить в roadmap только реально пройденные criteria; не объявлять весь Этап 1 завершённым.
- [ ] Проверить clean install, typecheck, tests, build, локальную D1 migration, Worker smoke test, secret scan и `git diff --check`.
- [ ] Проверить список путей и staged diff; commit: `docs: record stage 1 foundation status`.
- [ ] Push все commits в `origin/main` без force и проверить `HEAD == origin/main`.

## Блокеры живой интеграции

Без безопасного Cloudflare API token не создавать Worker/D1 и не настраивать deploy. Без bot token, bot username, channel ID/URL и прав бота нельзя настраивать Telegram webhook, `/start`, `getChatMember` или Mini App кнопку. Зафиксировать блокеры и точный список необходимых действий владельца; к Этапу 2 не переходить.

Пока блокеры не сняты, весь Этап 1 остаётся частично выполненным и заблокированным, даже если локальные проверки каркаса проходят.
