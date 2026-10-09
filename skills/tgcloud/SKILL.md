---
name: tgcloud
description: Управление serverless-ботами Telegram (@tgcloud) через tgcloud-mcp — скаффолд, токены, хендлеры, деплой, миграции БД, вебхуки. Use when the user asks to create/deploy/debug a Telegram serverless bot, mentions tgcloud, @tgcloud/bot, or works in a project with handlers/ + lib/ + schema.js.
---

# Skill: tgcloud

Все операции — через MCP-инструменты сервера `tgcloud` (репозиторий tgcloud_mcp).
Если инструментов нет — предложи установить: `npm install -g tgcloud-mcp` и добавить
в конфиг MCP-клиента `{"mcpServers": {"tgcloud": {"command": "tgcloud-mcp"}}}`.

Встроенная справка платформы доступна как MCP-ресурсы `tgcloud://docs/*` —
читай ДО написания кода бота.

## Правила платформы (коротко)

- Структура: `handlers/` (плоско, по типу апдейта), `lib/` (можно вложенно),
  `schema.js` (один файл в корне), `.tgcloud/` (креды/кэш, не коммитить).
- Импорты — ТОЛЬКО bare-имена: `import { users } from 'schema'`,
  `import { api, db, fetch, BotApiError } from 'sdk'`.
  Относительные пути (`./x`, `../x`) и расширения `.js` — НЕ компилируются.
- SDK: `api` — весь Bot API (ошибки — `BotApiError` с `.code`/`.description`);
  `db` — query builder + raw SQL; `fetch` — текстовый HTTP, лимит 32 МБ.
- Всё асинхронно, всегда `await`. Логи — `console.*` (видны при `run_handler`).

## Рецепты

### Новый бот с нуля

```
create_project { parent_dir, name }          # npm create @tgcloud/bot
→ спроси у пользователя CLI-токен из @BotFather
login_bot { project_dir, token }             # токен никуда не выводим
→ add_module / правим handlers/message.js, schema.js
run_handler { project_dir, module: 'handlers/message', args: '{ chat: { id: 1 }, text: "hi" }' }
push { project_dir }
migrate { project_dir }                      # dry_run=true по умолчанию — предпросмотр
webhook_sync { project_dir }                 # бот жив
```

### «Бот молчит»

```
webhook_status { project_dir }   # URL, allowed_updates, pending, ошибки доставки
status / diff { project_dir }    # что не задеплоено
push { project_dir }             # доставить изменения
webhook_sync { project_dir }     # перепривязать вебхук
```

### Изменение схемы БД

```
1. правим schema.js
2. push { project_dir }                              # деплой схемы
3. migrate { project_dir }                           # dry-run предпросмотр
4. показать пользователю изменения; если есть .deprecated(...) — предупредить об удалении данных
5. migrate { project_dir, dry_run: false, confirm: true }
```

## Guardrails (жёстко)

- `reset`, `push force`, `webhook_sync drop_pending`, `migrate dry_run:false` —
  ТОЛЬКО с `confirm: true` после явного согласия пользователя.
- Токен бота никогда не печатаем, не коммитим, не кладём в файлы — только в `login_bot`.
- Не придумывай команды CLI — список в ресурсе `tgcloud://docs/cli`.
