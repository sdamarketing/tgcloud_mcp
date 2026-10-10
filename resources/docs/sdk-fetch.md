# sdk/fetch — HTTP-клиент

Fetch-подобный клиент для внешних API и вебхуков. `import { fetch } from 'sdk'`.

```javascript
const res = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Pavel' }),
});
if (!res.ok) throw new Error(res.statusText);
const data = await res.json();
```

## Тело запроса

- Строка / JSON.stringify — классика.
- **Бинарь и файлы**: `Uint8Array`, `InputFile`, `FormData` (multipart) —
  байты стримятся наружу:

```javascript
import { fetch, FormData, InputFile } from 'sdk';
const form = new FormData();
form.append('file', new InputFile(bytes, 'photo.jpg', { type: 'image/jpeg' }));
await fetch(url, { method: 'POST', body: form });
```

- Body-хелперы (выставляют Content-Type):
  `fetch.body.json(obj)` → application/json, `fetch.body.form(obj)` →
  x-www-form-urlencoded, `fetch.body.text(s)` → text/plain.

## Ответ

- `res.status`, `res.statusText`, `res.ok` (200–299), `res.url`, `res.headers`
  (`.get/.has/.keys/.entries`).
- Буферно: `res.json()`, `res.text()`. Поточно: `for await (chunk of res.body)`.
- **Тело читается один раз**: повторный вызов → `TypeError: body used already`
  (проверяйте `res.bodyUsed`).
- Редиректы следуются автоматически; `res.url` — финальный URL.
- HTTP-статусы (404 и т.п.) НЕ бросают — только реальные сетевые ошибки reject'ят.

## Лимиты

- По докам сайта: содержимое ответа — до **32 МБ**.
- Остальные квоты рантайма не опубликованы — см. `tgcloud://docs/limits`.
