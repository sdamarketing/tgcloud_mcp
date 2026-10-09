# sdk/db — база данных

SQLite-подобная БД. Всё асинхронно — всегда `await`.

## Схема (schema.js, один файл в корне)

```javascript
import { table, integer, text, boolean, json, index, unique, check, sql } from 'sdk/db';

export const users = table('users', {
  id:      integer('id').primaryKey({ autoIncrement: true }),
  tgId:    integer('tg_id').unique(),
  name:    text('name').notNull(),
  lang:    text('lang').default('en'),
  isAdmin: boolean('is_admin').default(false),
  prefs:   json('prefs'),
  created: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  createdIdx: index('idx_users_created').on(t.created),
  uqEmail:    unique('uq_email').on(t.email),
  chk:        check('chk_done', sql`${t.done} in (0, 1)`),
  lower:      index('idx_lower').on(sql`lower(${t.email})`),   // expression index
  active:     index('idx_active').on(t.userId).where(sql`done = 0`),  // partial index
}));
```

Модификаторы колонок: `.primaryKey({autoIncrement})`, `.notNull()`, `.unique()`,
`.default(v)`, `.generatedAlwaysAs(sql\`...\`, { mode: 'stored' | 'virtual' })`,
`.deprecated('reason')` — пометить на удаление (применится следующим `migrate` как warning-drop).

Удалить таблицу: `table(...).deprecated('unused')`. Дропы происходят ТОЛЬКО через
`.deprecated()` — удаление декларации из schema.js ничего не дропает.
Смена типа колонки не автоматическая — вручную через `db.run(...)`.

**Foreign keys нет**: `.references()`/`foreignKey()` бросают при декларации
(рантайм работает с FK off) — целостность обеспечивает код приложения.

**Деплой не трогает базу**: `push` только сообщает о pending-изменениях,
применение — отдельным `tgcloud migrate` (интерактивно).

## Запросы

```javascript
import { db } from 'sdk';
import { todos } from 'schema';
import { eq, and, desc, asc, count, sql } from 'sdk/db';

await db.select().from(todos).all();                       // все строки
await db.select().from(todos).where(eq(todos.id, 1)).get();// первая или null
await db.select().from(todos).values();                    // массивы значений
await db.select({ id: todos.id, n: count() })
  .from(todos).groupBy(todos.userId).having(sql`count(*) > ${1}`).all();
await db.$count(todos);                                    // count(*)
await db.$count(todos, eq(todos.done, false));             // count с фильтром
```

Цепочки: `.where(c1, c2)` (AND), `.orderBy(desc(t.x), asc(t.id))`, `.limit(n)`, `.offset(n)`,
`.groupBy(col)`, `.having(cond)`, `.distinct()`.

Операторы из `sdk/db`: `eq ne gt gte lt lte like notLike isNull isNotNull and or not
between notBetween inArray notInArray count sum avg min max asc desc sql`.

## Insert / Update / Delete

```javascript
await db.insert(todos).values({ userId: 1, text: 'Buy milk' }).run();
await db.insert(todos).values([{ text: 'A' }, { text: 'B' }]).run();      // батч
await db.insert(todos).values({ text: 'X' }).returning().run();           // вернуть строку
await db.insert(users).values({ tgId: 42, name: 'Ann' })
  .onConflictDoUpdate({ target: users.tgId, set: { name: 'Ann' } }).run(); // upsert
await db.update(todos).set({ done: true }).where(eq(todos.id, 1)).run();
await db.delete(todos).where(eq(todos.id, 1)).run();
```

## Raw SQL

```javascript
await db.run('UPDATE todos SET done = 1 WHERE id = :id', { ':id': 5 });   // запись
await db.all(sql`SELECT * FROM todos WHERE done = ${false}`);             // несколько строк
await db.get(sql`SELECT count(*) AS c FROM todos`);                       // одна строка
```

Тег `sql` биндит `${value}` как параметр, `${table.column}` — как экранированный
идентификатор; `sql.raw('...')` — литерал без биндинга. Вложенные фрагменты `sql` склеиваются.

> Raw-запросы не привязаны к таблицам: boolean → 0/1, json → строка, timestamp → число.
> Конверсия значений работает только в table-bound билдере.
