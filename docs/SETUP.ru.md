---
title: "SETUP — детальная настройка"
description: "Пошаговая настройка tgcloud-mcp: токены, клиенты, переменные, решение проблем"
---

# SETUP — пошаговая настройка tgcloud-mcp

От нуля до ассистента, который управляет serverless-ботами Telegram.
English: [SETUP](SETUP). Короткие страницы установки:
[中文](installation.zh), [العربية](installation.ar), [Deutsch](installation.de),
[Français](installation.fr).

## 0. Что понадобится

- **Node.js 20+** (`node -v`)
- **Аккаунт Telegram** и бот, созданный в @BotFather
- **CLI access token** (шаг 2)
- Доступ к `cloud.telegram.org` и `api.telegram.org`

## 1. Установка сервера

Вариант A — npm:

```bash
npm install -g tgcloud-mcp
tgcloud-mcp
```

Вариант B — одна команда (клон в `~/.tgcloud-mcp` и мастер):

```bash
curl -fsSL https://raw.githubusercontent.com/sdamarketing/tgcloud_mcp/main/install.sh | bash
```

Вариант C — Docker:

```bash
docker run -i --rm ghcr.io/sdamarketing/tgcloud-mcp
```

## 2. CLI access token

1. @BotFather → ваш бот → **Serverless** → **CLI Access** → **Access token**.
2. Формат `app<id>:<secret>`. Это не API-токен (`123456:AA…`). Сначала включите Serverless.

Два способа:

- привязать к проекту: `npx tgcloud login` (неинтерактивно:
  `printf 'app...\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login`).
  Агент делает это инструментом `login_bot`;
- окружение (CI): `TGCLOUD_TOKEN='app...'` — тогда `login` не нужен.

Токен не попадает в вывод инструментов: сервер его маскирует.

## 3. Клиент

Автоматически: `tgcloud-mcp setup` или `node ~/.tgcloud-mcp/scripts/setup.mjs`.
Готовые фрагменты: `node scripts/generate-install-links.mjs`.

Мастер предлагает Agent Plugin. Копия `agent-plugin/` попадает в
`~/.tgcloud-mcp/agent-plugin`. Для Cursor — ещё в `~/.cursor/plugins/local/tgcloud`.
Для VS Code — `chat.pluginLocations`, если `settings.json` — строгий JSON.
Codex, Copilot и Kiro берут тот же каталог из своего UI. Claude Code и opencode
остаются на MCP-конфиге и скилле:

```bash
npx skills add sdamarketing/tgcloud_mcp
```

Вручную (npm):

**opencode** (`~/.config/opencode/opencode.json`):

```json
{ "mcp": { "tgcloud": { "type": "local", "command": ["npx", "-y", "tgcloud-mcp"], "enabled": true } } }
```

**Claude Code / Cursor:**

```json
{ "mcpServers": { "tgcloud": { "command": "npx", "args": ["-y", "tgcloud-mcp"] } } }
```

**VS Code** (`mcp.json`):

```json
{ "servers": { "tgcloud": { "type": "stdio", "command": "npx", "args": ["-y", "tgcloud-mcp"] } } }
```

Перезапустите клиента. Должны появиться 16 инструментов и ресурсы `tgcloud://docs/*`.

## 4. Переменные

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `TGCLOUD_CLI` | `npx` | Команда запуска CLI |
| `TGCLOUD_CLI_ARGS` | `tgcloud` | Аргументы перед субкомандой |
| `TGCLOUD_TIMEOUT_MS` | `120000` | Таймаут. `deploy` даёт сборке не меньше 300000 мс |
| `TGCLOUD_TOKEN` | — | CLI access token вместо `tgcloud login` |

## 5. Пробный диалог

> «Создай бота в ~/bots/echo» → `create_project` → токен → `login_bot` →
> правка `handlers/message.js` → `push` → `webhook_sync`.

Кукбук: `docs/cookbook-srl-bot.md`.

## Решение проблем

- **`"tgcloud login" requires an interactive terminal`** — `login_bot` или `TGCLOUD_TOKEN`.
- **`Token format looks wrong`** — это был API-токен. Нужен CLI access token (шаг 2).
- **`Could not reach the tgcloud server`** — нет пути к `cloud.telegram.org`.
  Обёртка: `HTTPS_PROXY` и `NODE_USE_ENV_PROXY=1` через `TGCLOUD_CLI`.
- **`revision R`** — `fetch`, затем `diff`, затем `push` (или осознанный `--force` с confirm).
- **`--safe, --yes, or --dry-run`** — `migrate`: по умолчанию dry-run;
  применение — `dry_run: false` и `confirm: true` (`apply: "safe"` или `"yes"`).
- **Старый layout (`schema.js` в корне)** — `upgrade` dry-run, затем apply с `confirm: true`.
