# Деплой

## Целевая схема

Планируется один Cloudflare Worker, публикующий Vite static assets и обслуживающий API/webhook. Это целевой проектный выбор, а не существующий или проверенный деплой. Реализация конфигурации относится к Этапу 1.

## Пока не настроено

- Cloudflare Worker, D1 database и bindings в аккаунте не подтверждены.
- Домен, DNS и production/preview URLs неизвестны.
- GitHub Actions и Cloudflare build integration не настроены.
- Telegram bot, webhook и Mini App URL не настроены.
- В репозитории нет Wrangler config или workflow-файлов.

## Правила будущей публикации

1. Перед настройкой отозвать раскрытые в чате Cloudflare API и R2 credentials; новые секреты выдавать с минимальными правами и хранить вне Git.
2. Выбрать один механизм CI/CD публикации: GitHub Actions либо Cloudflare build integration. Не включать конкурирующие deploy-триггеры для одного приложения.
3. Разделить production и preview bindings/configuration; не направлять preview на production D1 без явного решения и изоляции.
4. Публиковать только после успешной сборки и применимых проверок. Ошибка сборки не должна обновлять production.
5. Добавить Telegram webhook только после настройки Worker URL и случайного webhook secret через безопасные bindings.
6. После публикации проверить фактический URL, Worker health/error logs без секретов и тестовый Telegram flow. Не объявлять deploy успешным до проверки.

## Внешние действия владельца

Потребуются подтверждённый Cloudflare account, новые безопасные credentials или другой одобренный способ авторизации, решение о домене и доступ к Telegram bot/channel. Точные действия зависят от фактических ресурсов; неизвестные значения нельзя подставлять заранее.
