# CONTEXT.md — глоссарий домена

Язык проекта. Только термины и их значения — без решений об устройстве.

## Сервисы и продукты

- **Платформа @tgcloud** — serverless-хостинг Telegram-ботов и мини-аппов от Telegram.
  Код бота работает в V8 isolate: handlers, endpoints, schema, lib. Доки: core.telegram.org/bots/serverless.
- **tgcloud CLI** (`@tgcloud/cli`) — локальная dev-зависимость проекта; синхронизирует
  локальный каталог с облаком (аналог wrangler/vercel + drizzle-kit).
- **tgcloud-mcp** — наш пакет/сервер (npm: `tgcloud-mcp`, GitHub: `sdamarketing/tgcloud_mcp`):
  оборачивает tgcloud CLI в MCP-инструменты.
- **MCP-клиент / harness** — агент-хост: opencode, Claude Code, Cursor, Claude Desktop,
  VS Code, Windsurf, Zed.

## Сущности платформы

- **Проект tgcloud** — каталог с `tgcloud/` (schema.js, handlers/, endpoints/, lib/),
  `tgcloud.jsonc` и `.tgcloud/` (креды/снапшот; никогда не читать и не коммитить).
- **Модуль** — файл под `tgcloud/`; имя = путь без `.js` (`handlers/message`).
  Импорты проектных модулей — относительные С расширением `.js`; SDK — bare (`sdk`, `sdk/db`).
- **Handler** — `handlers/<update-type>.js`; вызывается платформой по апдейту соответствующего типа.
- **Endpoint** — `endpoints/<name>.js`; вызывается Mini App'ом как `POST /api/<name>`,
  init data проверяется платформой (`ctx.initData.user`).
- **Снапshot/ревизия** — локальная референс-копия облачного состояния (`.tgcloud/`);
  `fetch` обновляет её, `push` при расхождении ревизий отказывает (до `--force`).
- **Миграция** — применение изменений `schema.js` к БД; `push` НЕ трогает базу.
  Дропы — только через `.deprecated('reason')`. Неинтерактивно: `--dry-run/--yes/--safe`.
- **Mini App static** — build-папка фронта из `tgcloud.jsonc"static"`,
  хостится на `https://app<app_id>.tgcloud.ai/`.

## Токены и доступ

- **Bot API token** (`123456:AA…`) — Bot API вручную; платформе не нужен.
- **CLI access token** (`app<id>:<secret>`) — @BotFather → бот → Serverless → CLI Access;
  для `tgcloud login` (интерактив; неинтерактивно: `TGCLOUD_ASSUME_TTY=1` + stdin)
  или env `TGCLOUD_TOKEN` (CI).
- **confirm: true** — обязательный параметр деструктивных инструментов
  (`reset`, `push --force`, `migrate`-apply, `webhook sync --drop-pending`).

## Эксплуатация сервера

- **TGCLOUD_CLI / TGCLOUD_CLI_ARGS** — как запускать CLI (дефолт `npx tgcloud`);
  в обёртку можно встроить прокси/netns.
- **TGCLOUD_TIMEOUT_MS** — таймаут команды (дефолт 120000).
- **Скилл** — `skills/tgcloud/` (skills.sh), процедурные знания для агента.
- **Ресурсы** — `tgcloud://docs/*`: справка платформы прямо в MCP.
