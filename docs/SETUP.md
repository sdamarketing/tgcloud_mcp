---
title: "SETUP — детальная настройка"
description: "Пошаговая настройка tgcloud-mcp: токены, клиенты, переменные, решение проблем"
---

# SETUP — пошаговая настройка tgcloud-mcp

Подробное руководство: от нуля до работающего AI-ассистента, управляющего
serverless-ботами Telegram.

## 0. Что понадобится

- **Node.js 20+** (`node -v`)
- **Telegram-аккаунт** и бот, созданный через @BotFather
- **CLI access token** (см. шаг 2)
- Сетевой доступ к `cloud.telegram.org` и `api.telegram.org`

## 1. Установка сервера

Вариант A — из npm (рекомендуется):

```bash
npm install -g tgcloud-mcp
tgcloud-mcp            # запуск stdio-сервера (обычно запускает сам MCP-клиент)
```

Вариант B — одной командой (git-клон в `~/.tgcloud-mcp` + мастер настройки):

```bash
curl -fsSL https://raw.githubusercontent.com/sdamarketing/tgcloud_mcp/main/install.sh | bash
```

Вариант C — Docker:

```bash
docker run -i --rm ghcr.io/sdamarketing/tgcloud-mcp
```

## 2. CLI access token

1. Откройте @BotFather → ваш бот → **Serverless** → **CLI Access** → **Access token**.
2. Токен формата `app<id>:<secret>` — НЕ API-токен (`123456:AA…`).

Два способа его использования:

- **привязать к проекту** интерактивно: `npx tgcloud login` в каталоге проекта
  (неинтерактивно: `printf 'app...\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login`);
- **передать окружением** (CI): `TGCLOUD_TOKEN='app...'` — тогда `login` не нужен.

Токен никогда не попадает в вывод инструментов — сервер маскирует его.

## 3. Подключение клиента

Автоматически: `tgcloud-mcp setup` (если установлен глобально) или
`node ~/.tgcloud-mcp/scripts/setup.mjs`. Готовые конфиги: `node scripts/generate-install-links.mjs`.

Вручную — фрагмент конфига (npm-вариант):

**opencode** (`~/.config/opencode/opencode.json`):
```json
{ "mcp": { "tgcloud": { "type": "local", "command": ["npx", "-y", "tgcloud-mcp"], "enabled": true } } }
```

**Claude Code / Cursor** (`mcpServers`):
```json
{ "mcpServers": { "tgcloud": { "command": "npx", "args": ["-y", "tgcloud-mcp"] } } }
```

**VS Code** (`mcp.json`):
```json
{ "servers": { "tgcloud": { "type": "stdio", "command": "npx", "args": ["-y", "tgcloud-mcp"] } } }
```

Перезапустите клиента. Должны появиться 14 инструментов `tgcloud.*` и ресурсы `tgcloud://docs/*`.

## 4. Переменные окружения сервера

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `TGCLOUD_CLI` | `npx` | Команда запуска CLI (можно обёртку с прокси/PATH) |
| `TGCLOUD_CLI_ARGS` | `tgcloud` | Аргументы перед субкомандой |
| `TGCLOUD_TIMEOUT_MS` | `120000` | Таймаут одной команды |
| `TGCLOUD_TOKEN` | — | CLI access token вместо `tgcloud login` |

## 5. Пробный диалог

> «Создай бота в ~/bots/echo» → агент: `create_project` → попросит CLI access token →
> `login_bot` → поправит `handlers/message.js` → `push` → `webhook_sync`.

Кукбук: `docs/cookbook-srl-bot.md`.

## Решение проблем

- **`"tgcloud login" requires an interactive terminal`** — используйте инструмент
  `login_bot` (он сам выставляет `TGCLOUD_ASSUME_TTY=1`) или env `TGCLOUD_TOKEN`.
- **`Token format looks wrong. Expected "app<id>:<secret>"`** — вы дали API-токен;
  нужен CLI access token (шаг 2).
- **`Could not reach the tgcloud server`** — нет доступа к `cloud.telegram.org`
  (обход: прокси; TGCLOUD_CLI можно направить в обёртку с `HTTPS_PROXY` + `NODE_USE_ENV_PROXY=1`).
- **`This bot already has N deployed modules (revision R)`** — `tgcloud fetch`,
  посмотреть `tgcloud diff`, затем `push` (или осознанный `push --force` через confirm).
- **`non-interactive session — specify --safe, --yes, or --dry-run`** — миграции через
  инструмент `migrate`: `dry_run` (default) или `dry_run=false` + `confirm=true`.
