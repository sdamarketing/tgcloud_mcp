# sdk/fetch — HTTP client

A fetch-like client for third-party APIs. There is no other network access. `import { fetch } from 'sdk'`.

```javascript
const res = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Ann' }),
});
if (!res.ok) throw new Error(res.statusText);
const data = await res.json();
```

## Request body

- A string, including `JSON.stringify`, is the usual case.
- **Bytes and files**: `Uint8Array`, `InputFile`, or `FormData` (multipart) are streamed out:

```javascript
import { fetch, FormData, InputFile } from 'sdk';
const form = new FormData();
form.append('file', new InputFile(bytes, 'photo.jpg', { type: 'image/jpeg' }));
await fetch(url, { method: 'POST', body: form });
```

- Body helpers set Content-Type: `fetch.body.json(obj)` → application/json, `fetch.body.form(obj)` → application/x-www-form-urlencoded, `fetch.body.text(s)` → text/plain.

## Response

- `res.status`, `res.statusText`, `res.ok` (200–299), `res.url`, `res.headers` (`.get` / `.has` / `.keys` / `.entries`).
- Buffered: `res.json()`, `res.text()`. Streamed: `for await (const chunk of res.body)`.
- **The body is read once.** A second read throws `TypeError: body used already` (check `res.bodyUsed`).
- Redirects are followed. `res.url` is the final URL.
- HTTP statuses (404 and the rest) do not throw. Only real network failures reject.

## Limits

- The response body is capped at **32 MB**.
- Other runtime quotas are not published. See `tgcloud://docs/limits`.

There is no secrets store and no cron. Third-party credentials that a module needs are values you place in code you are willing to deploy, or you call out with `fetch` using a token the user has accepted storing in the project. Do not invent an env-var mechanism the platform does not have.
