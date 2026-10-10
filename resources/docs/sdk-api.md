# sdk/api — Telegram Bot API

Прямой доступ ко всему Telegram Bot API: `api.<method>(params)`.
Поддерживаются все текущие и будущие методы без обновления SDK.

```javascript
import { api, BotApiError } from 'sdk';   // или from 'sdk/api'

const me = await api.getMe();             // результат развёрнут из { ok, result }
await api.sendMessage({ chat_id: id, text: 'Hello!' });
await api.editMessageText({ chat_id, message_id, text: 'Updated' });
await api.answerCallbackQuery({ callback_query_id, text: 'Done' });
```

- Параметры — snake_case Bot API (`chat_id`, `message_id`, `reply_markup`, …).
- Ответ разворачивается из envelope `result`.
- Ошибки бросают `BotApiError` с полями `.code`, `.description`, `.method`, `.parameters`.

```javascript
import { api, BotApiError } from 'sdk';

try {
  await api.deleteMessage({ chat_id, message_id });
} catch (e) {
  if (e instanceof BotApiError && e.code === 400) {
    // 400 — сообщение уже удалено; ок
  } else {
    throw e;
  }
}
```

## Файлы (upload/download)

Байты, не только `file_id`.

```javascript
import { InputFile } from 'sdk';

// Upload — InputFile в любом файловом параметре на любой глубине:
await api.sendDocument({ chat_id, document: new InputFile(bytes, 'a.pdf', { type: 'application/pdf' }) });
await api.sendMediaGroup({ chat_id, media: [
  { type: 'photo', media: new InputFile(a, 'a.jpg', { type: 'image/jpeg' }) },
]});
// Лимиты Bot API: 50 МБ/файл, 10 МБ для фото.

// Download — только по file_id:
const bytes = await api.getFileContent(file_id);              // → Uint8Array
const stream = await api.getFileStream(file_id);              // { file, body, bytes() }
for await (const chunk of stream.body) { /* Uint8Array */ }
// Лимит getFile: 20 МБ. Битый file_id → BotApiError(400).
```
