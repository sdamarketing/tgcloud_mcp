# Кукбук: serverless-бот с мини-аппом за вечер

Пошаговый рецепт по платформе Telegram serverless (@tgcloud) на примере реального
бота «Дневник обучения» (srl_assistant_bot): хранит заметки в базе, отвечает
кнопками, показывает записи в Mini App.

Всё проверено на живом боте; форматы вывода CLI — самоснятые.

---

## 0. Подготовка (5 минут)

Нужны: Node.js 18+, npm, Telegram.

1. Создайте бота у [@BotFather](https://t.me/BotFather) → `/newbot` → получите API-токен
   (он пригодится только для проверок через Bot API, платформе нужен другой токен).
2. Там же: ваш бот → **Serverless → CLI Access → Access token** → получите
   **CLI access token** формата `app<id>:<secret>`.

> ⚠️ Это два разных токена. CLI отвергнет API-токен с ошибкой
> `Token format looks wrong. Expected "app<id>:<secret>".`

## 1. Скаффолд и логин (5 минут)

```bash
npm create @tgcloud/bot my_diary
cd my_diary
npx tgcloud login   # вставьте CLI access token (ввод скрыт)
```

Для CI/неинтерактива:

```bash
printf 'app...\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
# или export TGCLOUD_TOKEN='app...' — тогда login вообще не нужен
```

Структура проекта — весь платформенный код в `tgcloud/`:

```
tgcloud/schema.js         # схема БД, один файл
tgcloud/handlers/         # хендлеры апдейтов, плоско: message.js, callback_query.js, …
tgcloud/endpoints/        # серверные функции для Mini App (POST /api/<name>)
tgcloud/lib/              # общие модули (можно вложенно)
tgcloud.jsonc             # конфиг: static-блок мини-аппа
docs/tgcloud-sdk.md       # полный SDK-референс — читайте его!
```

> ⚠️ Импорты проектных модулей — **относительные пути С расширением `.js`**:
> `import { notes } from '../schema.js'`. Без `.js` не компилируется.
> SDK — по имени: `import { db, api, fetch, EndpointError, BotApiError } from 'sdk'`.

## 2. Хендлер сообщений + база (20 минут)

`tgcloud/schema.js` — таблица заметок:

```javascript
import { table, integer, text, sql } from 'sdk/db';

export const notes = table('notes', {
  id:      integer('id').primaryKey({ autoIncrement: true }),
  chatId:  integer('chat_id').notNull(),
  text:    text('text').notNull(),
  created: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
```

`tgcloud/handlers/message.js` — имя файла = тип апдейта, `export default`
получает payload (для message — сам Message):

```javascript
import { api, db } from 'sdk';
import { notes } from '../schema.js';
import { eq } from 'sdk/db';

export default async function (message) {
  const chatId = message.chat.id;
  const text = (message.text ?? '').trim();

  if (text.startsWith('/start')) {
    await api.sendMessage({ chat_id: chatId, text: 'Пиши заметки — сохраню.' });
    return;
  }
  // любая другая строка — заметка
  const [row] = await db.insert(notes).values({ chatId, text }).returning().run();
  await api.sendMessage({ chat_id: chatId, text: `Записал (#${row.id}) 📝` });
}
```

Правила БД, о которых не скажет компилятор:
- всё async — всегда `await`;
- **нет foreign keys** (`.references()` бросит при декларации);
- удаление колонок/таблиц — только `.deprecated('reason')`, удаление декларации ничего не дропает;
- `push` **никогда не трогает базу** — миграции отдельным шагом.

## 3. Деплой и миграция (5 минут)

```bash
npx tgcloud push
# Deploying 2 changes...
#   ✓ tgcloud/schema.js
#   ✓ tgcloud/handlers/message.js
# Schema out of sync — 1 change:
#   +  notes    new table
```

Сначала предпросмотр миграции:

```bash
npx tgcloud migrate --dry-run
# @@ notes: new table @@
#  CREATE TABLE notes ( ... )
# (dry-run — nothing was applied)
```

Применение. В терминале — интерактив (`Proceed?` → `[1/1] Apply? [y]es/[n]o/[q]uit`).
В CI/скриптах интерактив не сработает:

```bash
npx tgcloud migrate --yes     # или --safe (только безопасные изменения)
# ✓ notes
# Migration complete. Applied: 1, skipped: 0.
```

Быстрая проверка без живого чата (payload — JSON5):

```bash
npx tgcloud run handlers/message '{ chat: { id: 1 }, text: "выучил serverless" }'
# ✗ Uncaught exception: BotApiError: api.sendMessage failed [400]: chat not found
```

> `chat not found` при фейковом chat id — нормально: значит, запись в БД прошла,
> упала только отправка ответа несуществующему чату.

При первом `push` на бота с уже задеплоенным скаффолдом увидите конфликт ревизий:
`This bot already has 2 deployed modules (revision 1)`. Лечение — `npx tgcloud fetch`,
затем повторный `push` (или осознанный `push --force`).

Вебхук платформа ведёт сама по `handlers/*`:

```bash
npx tgcloud webhook
# url: https://cloud.telegram.org/app5888700151/webhook
# allowed updates: message
# ✓ in sync with your deployed handlers
```

## 4. Inline-кнопки (callback_query) (15 минут)

Добавляем кнопки к ответу о сохранении (`message.js`):

```javascript
await api.sendMessage({
  chat_id: chatId,
  text: `Записал (#${row.id}).\n\n${text}`,
  reply_markup: {
    inline_keyboard: [[
      { text: '👍 Полезно', callback_data: `like:${row.id}` },
      { text: '🗑 Удалить', callback_data: `del:${row.id}` },
    ]],
  },
});
```

Скаффолд и хендлер:

```bash
npx tgcloud add handlers/callback_query
```

```javascript
import { api, db } from 'sdk';
import { notes } from '../schema.js';
import { eq, and } from 'sdk/db';

export default async function (cb) {
  const chatId = cb.message?.chat?.id;
  const [action, idRaw] = (cb.data ?? '').split(':');
  const noteId = Number(idRaw);
  const answer = (text) =>
    api.answerCallbackQuery({ callback_query_id: cb.id, text }).catch(() => {});

  // чужие заметки не трогаем
  const note = await db.select().from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.chatId, chatId))).get();
  if (!note) return answer('Запись не найдена');

  if (action === 'del') {
    await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.chatId, chatId))).run();
    await api.editMessageText({
      chat_id: chatId, message_id: cb.message.message_id,
      text: `🗑 Запись #${noteId} удалена.`,
    }).catch(() => {});
    return answer('Удалено');
  }
  return answer('👍');
}
```

`push` — и платформа сама добавит `callback_query` в allowed_updates вебхука.

## 5. Mini App (30 минут)

Три части: endpoint (сервер), статика (фронт), конфиг.

**Endpoint** `tgcloud/endpoints/listNotes.js` — вызывается из мини-аппа как
`POST /api/listNotes`, платформа проверяет init data до запуска вашего кода:

```javascript
import { db, EndpointError } from 'sdk';
import { notes } from '../schema.js';
import { eq, desc } from 'sdk/db';

export default async function (input, ctx) {
  const user = ctx.initData?.user;      // уже проверен платформой
  if (!user) throw new EndpointError('No user', { code: 'AUTH' });
  const rows = await db.select().from(notes)
    .where(eq(notes.chatId, user.id))   # в личке chat id == user id
    .orderBy(desc(notes.id)).limit(50).all();
  return { notes: rows };               // вернётся как JSON
}
```

**Статика** `web/index.html` — без сборки, обычный HTML + официальный
`telegram-web-app.js`:

```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script>
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  Telegram.WebApp.Serverless.call('listNotes', {}, (err, result) => {
    // err.type === 'ENDPOINT_ERROR' для EndpointError; result — ваш JSON
    document.body.textContent = JSON.stringify(result.notes, null, 2);
  });
</script>
```

**Конфиг** `tgcloud.jsonc`:

```jsonc
{
  "static": { "source": "web", "spa": true }
}
```

```bash
npx tgcloud push
# Deploying 3 changes...
#   ✓ web/ — 1 file uploaded (2.1 KB)
# Static: https://app5888700151.tgcloud.ai/
```

Чтобы бот открывал мини-апп, добавьте `/app`-команду с web_app-кнопкой
(`https://app<id_бота>.tgcloud.ai/`) или Menu Button в @BotFather (`/setmenubutton`).

> Не ставьте `X-Frame-Options`/строгий `frame-ancestors` на статику —
> Telegram Web открывает мини-аппы в iframe.

## 6. Если что-то молчит

```bash
npx tgcloud webhook        # нет ли ошибок доставки, совпадает ли allowed_updates
npx tgcloud webhook sync   # перепривязать (--drop-pending отбросит очередь — деструктивно)
npx tgcloud status/diff    # что не задеплоено
npx tgcloud run <module> '<json5>'   # прогон server-side с локальными файлами
```

## Шпаргалка по токенам и CLI

| Что | Значение |
|---|---|
| API-токен (`123:AA…`) | Bot API вручную; платформе не нужен |
| CLI access token (`app<id>:<secret>`) | @BotFather → Serverless → CLI Access; для `tgcloud login` / `TGCLOUD_TOKEN` |
| `login` неинтерактивно | `TGCLOUD_ASSUME_TTY=1` + stdin, или только env `TGCLOUD_TOKEN` (CI) |
| `migrate` неинтерактивно | `--dry-run` / `--yes` / `--safe` |

---

*Полный SDK-референс — в `docs/tgcloud-sdk.md` вашего скаффолда.
Управлять всем этим из AI-агента — MCP-сервер
[tgcloud-mcp](https://github.com/sdamarketing/tgcloud_mcp).*
