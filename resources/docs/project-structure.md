# Структура проекта tgcloud

```plaintext
my-bot/
├─ handlers/            # хендлеры апдейтов — плоско, один уровень
│  ├─ message.js
│  └─ callback_query.js
├─ lib/                 # общие модули; подкаталоги разрешены
│  ├─ reply.js
│  └─ internal/util.js
├─ schema.js            # схема БД — один файл в корне
└─ .tgcloud/            # состояние CLI: креды, снапшот, кэш (в .gitignore)
```

Деплоятся только перечисленные файлы/каталоги.

## Правила импортов

Импортируются только bare-именА модулей. Относительные пути и расширения — **не компилируются**:

```javascript
import { users } from './schema';      //  не скомпилируется
import { users } from '../schema';     //  не скомпилируется
import x from 'lib/cart.js';           //  расширение .js надо убрать
```

Правильно:

```javascript
import { users } from 'schema';             // модуль schema.js
import { addItem } from 'lib/cart';         // модуль из lib/
import { format } from 'lib/internal/fmt';  // вложенный модуль lib/
import { db, api, fetch, BotApiError } from 'sdk';           // вся поверхность SDK
import { table, integer, text, eq, sql } from 'sdk/db';      // или подмодули
import { api } from 'sdk/api';
import { fetch } from 'sdk/fetch';
```

## Хендлеры

Файл в `handlers/` по типу апдейта (`message`, `callback_query`, `inline_query`, `chat_member`, …).
Экспорт по умолчанию — async-функция, принимающая payload апдейта:

```javascript
import { api } from 'sdk';

export default async function (message) {
  await api.sendMessage({
    chat_id: message.chat.id,
    text: `You said: ${message.text ?? '(no text)'}`,
  });
}
```

## Логирование

Доступен стандартный `console` (`log/info/warn/error/trace`). Вывод захватывается
при `tgcloud run`; `console.error`/`console.trace` печатают стектрейс.
Каждая строка помечается `[file:line]`.
