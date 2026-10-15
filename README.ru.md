# tgcloud-mcp — MCP-сервер для serverless-ботов Telegram

[English](README.md) · [中文](README.zh.md) · [العربية](README.ar.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

> Неофициальный проект (автор @sdamarketing), не аффилирован с Telegram.
> Официальный инструмент платформы — CLI `@tgcloud/cli`. tgcloud-mcp оборачивает
> его в MCP. Модель угроз: [SECURITY.md](SECURITY.md).

Учит ассистента управлять serverless-ботами
([core.telegram.org/bots/serverless](https://core.telegram.org/bots/serverless)):
«создай бота», «задеплой», «покажи вебхук» — ассистент вызывает `tgcloud`.

Клиенты: **opencode, Claude Code, Claude Desktop, Cursor, VS Code (Copilot), Windsurf, Zed**.
Тот же сервер и скилл — один [Agent Plugin](https://agent-plugins.org) (`agent-plugin/`)
для Codex, Cursor, Copilot, Kiro и VS Code.

## Документация

Сайт документации (docs7) и индекс для LLM:
[context7.com/sdamarketing/tgcloud_mcp](https://context7.com/sdamarketing/tgcloud_mcp).

| Раздел | Содержание |
|---|---|
| [Начало работы](docs/index.ru.mdx) | Обзор, [быстрый старт](docs/quickstart.ru.mdx), [установка](docs/installation.ru.mdx) |
| [Эксплуатация](docs/tools.ru.mdx) | [Инструменты](docs/tools.ru.mdx), [ресурсы](docs/resources.ru.mdx), [безопасность](docs/security.ru.mdx) |
| Помощь | [Траблшутинг](docs/troubleshooting.ru.mdx), [кукбук](docs/cookbook.ru.mdx) |
| Справочник | [SETUP](docs/SETUP.ru.md), [бот за вечер](docs/cookbook-srl-bot.md) |

Команды: `tgcloud-mcp setup`, `tgcloud-mcp update`, `tgcloud-mcp links`, `tgcloud-mcp --help`.
Установщик `curl | bash` рисует баннер и спиннер.

## Что умеет

16 инструментов:

| Область | Инструменты | Что делают |
|---|---|---|
| **Жизненный цикл** | `create_project`, `init_project`, `login_bot`, `add_module`, `upgrade` | Скаффолд, токен @BotFather, handlers, endpoints, lib, перенос layout до 0.2.0 |
| **Синхронизация** | `status`, `diff`, `push`, `deploy`, `pull`, `fetch`, `reset` | Изменения, атомарный деплой, сборка и push для Mini App |
| **Данные** | `run_handler`, `migrate` | Прогон без деплоя; миграции `--dry-run`, `--safe`, `--yes`, `--local` |
| **Вебхук** | `webhook_status`, `webhook_sync` | «Бот молчит», перепривязка |

Ресурсы `tgcloud://docs/*` — справка платформы на английском.
Описания инструментов тоже английские: модель читает один текст и отвечает вам на вашем языке.
Документация для людей: английский, русский, китайский, арабский, немецкий, французский.

## Безопасность

- Деструктивные вызовы (`reset`, `push --force`, применение `upgrade` и миграций, `webhook sync --drop-pending`) требуют `confirm: true`.
- Токен уходит в CLI через stdin и маскируется в ответах.

## Установка

Node.js 20+.

```bash
npm install -g tgcloud-mcp
tgcloud-mcp setup
```

Мастер пишет MCP-конфиг. На вопрос про Agent Plugin отвечает «да»: копия попадает
в `~/.tgcloud-mcp/agent-plugin`, в локальные плагины Cursor и в `chat.pluginLocations` VS Code.

```bash
curl -fsSL https://raw.githubusercontent.com/sdamarketing/tgcloud_mcp/main/install.sh | bash
docker run -i --rm ghcr.io/sdamarketing/tgcloud-mcp
```

Подробно: [docs/SETUP.ru.md](docs/SETUP.ru.md).

## Пример конфига

```json
{ "mcpServers": { "tgcloud": { "command": "tgcloud-mcp" } } }
```

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `TGCLOUD_CLI` | `npx` | Как запускать CLI |
| `TGCLOUD_CLI_ARGS` | `tgcloud` | Аргументы перед субкомандой |
| `TGCLOUD_TIMEOUT_MS` | `120000` | Таймаут одной команды |

После правок фронтенда агент вызывает `deploy`. Голый `push` бандлер не запускает.

Кукбук: [docs/cookbook-srl-bot.md](docs/cookbook-srl-bot.md). Скилл: `npx skills add sdamarketing/tgcloud_mcp`.

MIT
