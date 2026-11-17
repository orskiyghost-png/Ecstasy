# Деплой

## Целевая схема

Локальная конфигурация готовит один Cloudflare Worker, публикующий Vite static assets и обслуживающий API. Это не опубликованный или проверенный внешний deploy. Telegram webhook ещё не реализован.

## Пока не настроено

- Cloudflare Worker, D1 database и bindings в аккаунте не подтверждены.
- Домен, DNS и production/preview URLs неизвестны.
- GitHub Actions CI проверяет typecheck, tests и build; deploy workflow не настроен.
- Telegram bot, webhook и Mini App URL не настроены.
- Wrangler config и CI workflow существуют только для локальной сборки и автоматических проверок; production bindings не настроены.
- `wrangler.jsonc` использует `database_id: "local-only-placeholder"`; он нужен только для изолированной локальной D1 и не является внешним ресурсом.

## Правила будущей публикации

1. Перед настройкой отозвать раскрытые в чате Cloudflare API и R2 credentials; новые секреты выдавать с минимальными правами и хранить вне Git.
2. Выбрать один механизм CI/CD публикации: GitHub Actions либо Cloudflare build integration. Не включать конкурирующие deploy-триггеры для одного приложения.
3. Разделить production и preview bindings/configuration; не направлять preview на production D1 без явного решения и изоляции.
4. Публиковать только после успешной сборки и применимых проверок. Ошибка сборки не должна обновлять production.
5. Добавить Telegram webhook только после настройки Worker URL и случайного webhook secret через безопасные bindings.
6. После публикации проверить фактический URL, Worker health/error logs без секретов и тестовый Telegram flow. Не объявлять deploy успешным до проверки.

## Внешние действия владельца

Потребуются подтверждённый Cloudflare account, новые безопасные credentials или другой одобренный способ авторизации, решение о домене и доступ к Telegram bot/channel. Точные действия зависят от фактических ресурсов; неизвестные значения нельзя подставлять заранее.
