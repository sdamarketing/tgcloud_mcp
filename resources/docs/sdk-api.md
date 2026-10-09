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
