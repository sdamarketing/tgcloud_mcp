# sdk/db — database

SQLite-backed store, one database per bot. Everything is asynchronous — always `await`. The schema DSL and query builder follow Drizzle. Import them from `sdk/db`.

## Schema (`tgcloud/schema.js`, one file)

`table()` describes a table at load time. It does not touch the database. Deploying `schema.js` records the schema; `tgcloud migrate` applies it.

```javascript
import { table, integer, text, boolean, json, real, numeric, blob, index, unique, sql } from 'sdk/db';

export const users = table('users', {
  id:      integer('id').primaryKey({ autoIncrement: true }),
  tgId:    integer('tg_id').unique(),
  name:    text('name').notNull(),
  lang:    text('lang').default('en'),
  isAdmin: boolean('is_admin').default(false),
  score:   real('score').default(0),
  prefs:   json('prefs'),
  avatar:  blob('avatar'),
  created: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  createdIdx: index('idx_users_created').on(t.created),
  uqName:     unique('uq_name').on(t.name),
  lower:      index('idx_lower').on(sql`lower(${t.name})`),
  named:      index('idx_named').on(t.tgId).where(sql`${t.name} != ''`),
}));
```

From a handler or endpoint, import the table by relative path with `.js`:

```javascript
import { users } from '../schema.js';
```

### Column types

| Factory | SQLite type | Notes |
|---|---|---|
| `text()` | TEXT | |
| `integer()` | INTEGER | |
| `real()` | REAL | alias `float()` |
| `numeric()` | NUMERIC | |
| `blob()` | BLOB | reads and writes `Uint8Array` |
| `boolean()` | INTEGER | stored as 0/1, read as `true` / `false` |
| `json()` | TEXT | automatic `JSON.stringify` / `JSON.parse` |

The column-name argument is optional; omit it and the JS key is used. `boolean()` is `integer(name, { mode: 'boolean' })`. `json()` is `text(name, { mode: 'json' })`.

| `mode` | Stored as | JS value |
|---|---|---|
| `boolean` | INTEGER 0/1 | `boolean` |
| `json` | TEXT (JSON) | any object or array |
| `timestamp` | INTEGER unix seconds | `Date` |
| `timestamp_ms` | INTEGER unix milliseconds | `Date` |
| `bytes` | BLOB | `Uint8Array` |

`mode` controls encoding, not the storage class. `blob('col', { mode: 'json' })` stores JSON in a BLOB. There is no Node `Buffer`; use `Uint8Array`.

Column modifiers: `.primaryKey({ autoIncrement })`, `.notNull()`, `.unique()`, `.default(value)`, `.generatedAlwaysAs(sql\`...\`, { mode: 'stored' | 'virtual' })`, `.deprecated('reason')`.

`.default()` on a `json()` column encodes the value. A ``sql`…` `` default is passed through. `.deprecated()` is terminal: the next `migrate` shows a warning-status drop. Confirming it deletes the data. Drop a whole table with `table(...).deprecated('unused')`. Removing a declaration drops nothing.

**No foreign keys.** `.references()` / `foreignKey()` throw when the schema is declared. The runtime has foreign keys off. The application keeps integrity.

**A deploy does not touch the database.** `push` reports pending changes. Apply them with `tgcloud migrate`.

Type changes are manual. SQLite often cannot do them in place. `migrate` shows the reason; rewrite the data yourself with `db.run(...)` (new column, copy, swap).

## Queries

```javascript
import { db } from 'sdk';
import { eq, and, desc, asc, count, sql } from 'sdk/db';
import { todos } from '../schema.js';

await db.select().from(todos).all();
await db.select().from(todos).where(eq(todos.id, 1)).get();   // first row or null
await db.select().from(todos).values();                       // arrays of values
await db.select({ id: todos.id, n: count() })
  .from(todos).groupBy(todos.userId).having(sql`count(*) > ${1}`).all();
await db.$count(todos);
await db.$count(todos, eq(todos.done, false));
```

Chain: `.where(c1, c2)` (AND), `.orderBy(desc(t.x), asc(t.id))`, `.limit(n)`, `.offset(n)`, `.groupBy(col)`, `.having(cond)`, `.distinct()`.

Operators from `sdk/db`: `eq ne gt gte lt lte like notLike isNull isNotNull and or not between notBetween inArray notInArray count sum avg min max asc desc sql`.

A comparison's second argument may be another column or a `sql` fragment. A write resolves to `rowsAffected`, `lastInsertRowid`, and `rows` (populated when the SQL had `RETURNING`). Use `db.values` when a projection would otherwise collide on column name.

## Insert / update / delete

```javascript
await db.insert(todos).values({ userId: 1, text: 'Buy milk' }).run();
await db.insert(todos).values([{ text: 'A' }, { text: 'B' }]).run();
await db.insert(todos).values({ text: 'X' }).returning().run();
await db.insert(users).values({ tgId: 42, name: 'Ann' })
  .onConflictDoUpdate({ target: users.tgId, set: { name: 'Ann' } }).run();
await db.update(todos).set({ done: true }).where(eq(todos.id, 1)).run();
await db.delete(todos).where(eq(todos.id, 1)).run();
```

Upsert with an increment in the same statement:

```javascript
await db.insert(counters)
  .values({ chatId, seen: 1 })
  .onConflictDoUpdate({ target: counters.chatId, set: { seen: sql`${counters.seen} + 1` } })
  .returning()
  .run();
```

## Raw SQL

```javascript
await db.run('UPDATE todos SET done = 1 WHERE id = :id', { ':id': 5 });
await db.all(sql`SELECT * FROM todos WHERE done = ${false}`);
await db.get(sql`SELECT count(*) AS c FROM todos`);
```

The `sql` tag binds `${value}` as a parameter and `${table.column}` as an identifier. `sql.raw('...')` is a literal with no binding. Nested `sql` fragments are spliced.

Raw queries are not table-bound: boolean becomes 0/1, json becomes a string, timestamp becomes a number. Value conversion works only on the table-bound builder.
