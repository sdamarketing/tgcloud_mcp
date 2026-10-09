# Структура проекта tgcloud

Скаффолд (`npm create @tgcloud/bot my-bot`, @tgcloud/cli 0.2.x):

```plaintext
my-bot/
├─ tgcloud/              # весь платформенный код — деплоится только он
│  ├─ handlers/          # хендлеры апдейтов — плоско, один уровень
│  │  ├─ message.js
│  │  └─ callback_query.js
│  ├─ endpoints/         # серверные функции для Mini App (POST /api/<name>)
│  ├─ lib/               # общие модули; подкаталоги разрешены
│  │  └─ internal/util.js
│  └─ schema.js          # схема БД — один файл
├─ tgcloud.jsonc         # конфиг проекта (static-блок для Mini App)
├─ docs/tgcloud-sdk.md   # полный SDK-референс (в скаффолде)
├─ AGENTS.md             # ориентация для AI-агентов (в скаффолде)
└─ .tgcloud/             # состояние CLI: креды, снапшот, кэш (gitignored)
```

Деплоятся только `.js` под `tgcloud/` (`schema.js`, `lib/`, `handlers/`, `endpoints/`)
плюс static-билд мини-аппа, если указан в `tgcloud.jsonc`. Имя модуля — путь
внутри `tgcloud/` без расширения: `tgcloud/handlers/message.js` → `handlers/message`.

## Правила импортов

**Проектные модули — относительным путём С расширением `.js`; SDK — по имени.**

```javascript
// из tgcloud/handlers/message.js:
import { users } from '../schema.js';          // ✅
import { addItem } from '../lib/cart.js';      // ✅
import { users } from '../schema';             // ❌ без .js — не компилируется
import x from '../../src/x.js';                // ❌ вне tgcloud/ ничего недоступно
import { db, api, fetch, BotApiError } from 'sdk';      // ✅ SDK по имени
import { table, integer, text, eq, sql } from 'sdk/db'; // ✅ подмодули SDK
```

Исключение: имя модуля без расширения (`from 'lib/cart'`) тоже резолвится, но
пишите относительные импорты — это канонический стиль платформы.

В рантайме — V8 isolate: **нет файловой системы, нет npm-пакетов**.
Доступны только `sdk` и модули проекта.

## Хендлеры (handlers/)

Файл по имени типа апдейта (`message`, `callback_query`, `inline_query`,
`chat_member`, `my_chat_member`, …). `export default` вызывается с payload
соответствующего типа; второй аргумент — `ctx` (полный `Update` — `ctx.update`):

```javascript
import { api } from 'sdk';

export default async function (message, ctx) {
  await api.sendMessage({
    chat_id: message.chat.id,
    text: `You said: ${message.text ?? '(no text)'}`,
  });
}
```

## Endpoints (endpoints/) — серверная сторона Mini App

`tgcloud/endpoints/<name>.js` вызывается мини-аппом как `POST /api/<name>`:

```javascript
import { EndpointError } from 'sdk';

export default async function (input, ctx) {
  // input — JSON-тело (объект); возвращаемое значение уйдёт как JSON.
  // ctx.initData — проверенные платформой init data; ctx.initData.user — вызывающий.
  if (!ctx.initData.user) throw new EndpointError('Unauthorized', { code: 'AUTH' });
  return { ok: true };
}
```

- `EndpointError(description, { code })` → 400 с description/parameters;
  любое другое исключение → безликий 500.
- Вызов из фронта: `Telegram.WebApp.Serverless.call('<name>', input, (err, result) => …)`
  из официального `telegram-web-app.js` (сам шлёт init data).
- Имена: буквы, цифры, `_`, не с цифры. Скаффолд: `tgcloud add endpoints/<name>`.
  Тест: `tgcloud run endpoints/<name> '{}' --ctx '{ initData: { user: { id: 1 } } }'`.

## Mini App (фронтенд)

- `tgcloud.jsonc` → `{ "static": { "source": "dist" } }` — build-папка деплоится и
  хостится как Mini App на `https://app<app_id>.tgcloud.ai/` (`push` печатает точный URL).
  Опции: `"spa": true`, `immutable`, `headers`, `redirects`; шорткат `"static": "dist"`;
  `"static": false` — убрать сайт при следующем push.
- **Собирай перед push** — push заливает папку как есть, build не запускает.
- Фронт — обычный браузерный код с npm; недоступен из модулей tgcloud/ и наоборот.
  Общается с ботом только через endpoints.
- Не добавляй `X-Frame-Options`/строгий `frame-ancestors` — Mini App открывается в iframe.

## Логирование

`console.log/info/warn/error/trace`; вывод захватывается при `tgcloud run`,
`error`/`trace` со стектрейсом, строки помечаются `[file:line]`.
