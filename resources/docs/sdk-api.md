# sdk/api — Telegram Bot API

Direct access to the whole Telegram Bot API: `api.<method>(params)`. Current and future methods work with no SDK update.

```javascript
import { api, BotApiError } from 'sdk';   // or from 'sdk/api'

const me = await api.getMe();             // unwrapped from { ok, result }
await api.sendMessage({ chat_id: id, text: 'Hello!' });
await api.editMessageText({ chat_id, message_id, text: 'Updated' });
await api.answerCallbackQuery({ callback_query_id, text: 'Done' });
```

- Parameters use Bot API snake_case (`chat_id`, `message_id`, `reply_markup`, …).
- The response envelope is unwrapped: you get `result`, not `{ ok, result }`.
- Errors throw `BotApiError` with `.code`, `.description`, `.method`, `.parameters`.

```javascript
import { api, BotApiError } from 'sdk';

try {
  await api.deleteMessage({ chat_id, message_id });
} catch (e) {
  if (e instanceof BotApiError && e.code === 400) {
    // 400 — the message is already gone
  } else {
    throw e;
  }
}
```

## Files (upload / download)

Bytes, not only `file_id`. The runtime has no Node `Buffer`; use `Uint8Array`.

```javascript
import { InputFile } from 'sdk';

await api.sendDocument({
  chat_id,
  document: new InputFile(bytes, 'a.pdf', { type: 'application/pdf' }),
});
await api.sendMediaGroup({ chat_id, media: [
  { type: 'photo', media: new InputFile(a, 'a.jpg', { type: 'image/jpeg' }) },
]});
// Bot API limits: 50 MB per file, 10 MB for photos.

const bytes = await api.getFileContent(file_id);   // Uint8Array
const stream = await api.getFileStream(file_id);   // { file, body, bytes() }
for await (const chunk of stream.body) { /* Uint8Array */ }
// getFile cap: 20 MB. A bad file_id throws BotApiError(400).
```

`InputFile` is bytes, a filename, and an optional MIME `type`. It works anywhere a Bot API method expects a file, at any depth.
