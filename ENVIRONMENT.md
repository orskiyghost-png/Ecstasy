# Переменные окружения и секреты

## Статус

Локальный каркас Этапа 1 создан. Webhook считывает `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_CHANNEL_URL` и `APP_BASE_URL`. Provider переменные кодом не считываются. Единственный Worker обслуживает UI и API, отдельный `API_BASE_URL` не нужен.

| Имя | Чувствительность | Назначение | Настройка |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Секрет | Авторизация Telegram Bot API | Cloudflare Worker secret; локально — игнорируемый `.dev.vars` |
| `TELEGRAM_WEBHOOK_SECRET` | Секрет | Проверка заголовка webhook `secret_token` | Cloudflare Worker secret; локально — игнорируемый `.dev.vars` |
| `TELEGRAM_BOT_USERNAME` | Публичное значение | Имя бота для ссылок/интерфейса, если потребуется | Worker environment |
| `TELEGRAM_CHANNEL_ID` | Идентификатор, не секрет | Канал для проверки подписки | Worker environment; значение пока неизвестно |
| `TELEGRAM_CHANNEL_URL` | Публичное значение | Ссылка на канал | Worker environment; значение пока неизвестно |
| `APP_BASE_URL` | Публичное значение | Production URL Mini App для Telegram-кнопки и допустимых origin | Worker environment; домен пока неизвестен |
| `OWNER_TELEGRAM_ID` | Идентификатор, не секрет | Сопоставление владельца с ролью; не самостоятельное доказательство авторизации | Worker environment; значение пока неизвестно |

Настройки provider/model должны управляться серверной конфигурацией после проектирования backend. AI API keys не добавлять в этот файл и не отправлять клиенту. R2 credentials не нужны, пока R2 не выбран для реального требования.

## Локальная разработка

Wrangler использует игнорируемый `.dev.vars` для локальных Worker secrets. Не копируй реальные значения в `.env.example`. Команды запуска и D1 migration описаны в `README.md`. Для локальной проверки webhook нужны те же имена переменных, что указаны в таблице.
Wrangler конфигурация содержит только `local-only-placeholder`; не заменяй его внешним database ID до создания и подтверждения настоящей D1.

## Production

Telegram Worker secrets заданы владельцем в Cloudflare; локально их значение не проверялось. GitHub secrets `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID` подтверждены через `gh secret list`. Переменная `CLOUDFLARE_DEPLOY_ENABLED` создана со значением `false`. Не передавай секреты через frontend, GitHub commit, логи или документацию. После настройки проверяй только наличие имени binding, не его значение.

## Инцидент с раскрытыми credentials

Cloudflare API token и R2 access key/secret были отправлены в чат. Считай их раскрытыми: не используй и не сохраняй их. Отзови API token, удали/отзови пару R2 credentials и создай новые с минимальными правами только после безопасной настройки. Не помещай новые значения в этот репозиторий или чат.
