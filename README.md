# tgcloud-mcp — MCP-сервер для Telegram serverless bots

Учит AI-ассистента управлять serverless-ботами Telegram ([core.telegram.org/bots/serverless](https://core.telegram.org/bots/serverless)):
вы говорите ассистенту «создай бота», «задеплой», «покажи статус вебхука» — а он выполняет
это через `tgcloud` CLI, не трогая терминал руками.

Работает с любым MCP-клиентом: **opencode, Claude Code, Claude Desktop, Cursor, VS Code (Copilot), Windsurf, Zed**.

## Что умеет

14 инструментов — полный срез команд `tgcloud` CLI:

| Категория | Инструменты | Что делают |
|---|---|---|
| **Жизненный цикл** | `create_project`, `init_project`, `login_bot`, `add_module` | скаффолд проекта, привязка бота по токену @BotFather, новые хендлеры и lib-модули |
| **Синхронизация** | `status`, `diff`, `push`, `pull`, `fetch`, `reset` | просмотр изменений, атомарный деплой, синхронизация с облаком |
| **Данные** | `run_handler`, `migrate` | прогон хендлера без деплоя (с логами), миграции БД с dry-run |
| **Вебхук** | `webhook_status`, `webhook_sync` | диагностика «бот молчит», перенастройка вебхука |

Плюс MCP-**ресурсы** `tgcloud://docs/*` — встроенная справка платформы
(структура проекта, правила импортов, `sdk/db`, `sdk/api`, `sdk/fetch`, CLI).

## Безопасность

- **Деструктивное требует подтверждения.** `reset`, `push --force`, `webhook sync --drop-pending`
  и применение миграций отказываются работать без `confirm: true` — ассистент сначала покажет,
  что будет изменено, и спросит согласие.
- **Токены не утекают.** Токен бота передаётся в CLI через stdin и маскируется во всех выводах —
  ассистент никогда его не видит в ответах инструментов.

## Установка

Требуется Node.js 20+ (самой платформе tgcloud достаточно 18+).

```bash
npm install -g tgcloud-mcp
```

или из исходников:

```bash
git clone <адрес-репозитория>
cd tgcloud_mcp
npm install
npm run build
npm run smoke    # проверка: "OK: server \"tgcloud\" v…, 14 tools, 5 resources listed"
```

## Подключение к агенту

Конфиг MCP-клиента (пример для opencode / Claude Code / Cursor — формат `mcpServers` одинаковый):

```json
{
  "mcpServers": {
    "tgcloud": {
      "command": "tgcloud-mcp"
    }
  }
}
```

Переменные окружения (опционально):

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `TGCLOUD_CLI` | `npx` | Команда запуска CLI (можно указать глобально установленный `tgcloud`) |
| `TGCLOUD_CLI_ARGS` | `tgcloud` | Аргументы-префикс перед субкомандой |
| `TGCLOUD_TIMEOUT_MS` | `120000` | Таймаут одной команды CLI |

## Пример диалога

> **Вы:** создай эхо-бота в ~/bots/echo  
> **Агент:** `create_project` → `login_bot` (спросит токен у @BotFather) → правит `handlers/message.js` → `push` → `webhook_sync` — бот жив.  
> **Вы:** напиши тест и проверь  
> **Агент:** `run_handler` с payload `{ chat: { id: 1 }, text: "hi" }` — показывает вывод и логи.

## Кукбук

📗 **[Serverless-бот с мини-аппом за вечер](docs/cookbook-srl-bot.md)** — пошаговый
рецепт на примере реального бота «Дневник обучения»: скаффолд, токены, база и миграции,
inline-кнопки, Mini App с endpoints. Самоснятые форматы CLI и грабли включены.

## Скилл для агентов

В репозитории лежит скилл `skills/tgcloud` — процедурные знания для агента:
структура проекта, правила bare-импортов, рецепты (`create → login → run → push`),
guardrails платформы. Установка: скопируйте каталог в `~/.agents/skills/tgcloud`
или подключите через ваш менеджер скиллов.

## Структура репозитория

```
src/
├─ index.ts            # сервер, регистрация инструментов/ресурсов
├─ config.ts           # env-конфиг
├─ runner.ts           # запуск tgcloud CLI: spawn, таймауты, маскировка секретов
├─ utils.ts            # runTool/result-хелперы, dangerTool (confirm-guard)
└─ tools/              # lifecycle, sync, data, webhook
resources/docs/        # справка платформы → MCP-ресурсы
skills/tgcloud/        # скилл для AI-агентов
scripts/smoke-test.mjs # stdio smoke-тест
```

## Лицензия

MIT
