# sdk/fetch — HTTP-клиент

Fetch-подобный клиент для внешних API и вебхуков. Ограничения: ответ только
текстовый (бинарные payload не поддерживаются), лимит ответа — 32 МБ.

```javascript
import { fetch } from 'sdk';   // или from 'sdk/fetch'

const res = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Pavel' }),
});
if (!res.ok) throw new Error(res.statusText);
const data = await res.json();
```

## Body-хелперы (выставляют Content-Type)

```javascript
await fetch(url, { method: 'POST', body: fetch.body.json({ a: 1 }) });   // application/json
await fetch(url, { method: 'POST', body: fetch.body.form({ a: 1 }) });   // x-www-form-urlencoded
await fetch(url, { method: 'POST', body: fetch.body.text('hi') });       // text/plain
```

## Ответ

- `res.status` (number), `res.statusText`, `res.ok` (200–299), `res.url`, `res.headers`
- `res.json()`, `res.text()`, `res.body` (ReadableStream — поточное чтение)
