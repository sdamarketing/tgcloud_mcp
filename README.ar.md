# tgcloud-mcp — خادم MCP لبوتات تيليغرام بلا خادم

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

> مشروع مجتمعي غير رسمي (المؤلف @sdamarketing) وغير تابع لتيليغرام.
> أداة المنصة الرسمية هي `@tgcloud/cli`. ‏tgcloud-mcp يغلّفها في MCP.
> نموذج التهديد: [SECURITY.md](SECURITY.md).

يعلّم المساعد إدارة البوتات بلا خادم
([core.telegram.org/bots/serverless](https://core.telegram.org/bots/serverless)):
تقول «أنشئ بوتًا» أو «انشر» أو «أظهر webhook» فيشغّل المساعد `tgcloud`.

العملاء: **opencode وClaude Code وClaude Desktop وCursor وVS Code (Copilot) وWindsurf وZed**.
الخادم نفسه والمهارة حزمة [Agent Plugin](https://agent-plugins.org) واحدة (`agent-plugin/`)
لـ Codex وCursor وCopilot وKiro وVS Code.

## ماذا يفعل

16 أداة:

| المجال | الأدوات | العمل |
|---|---|---|
| **دورة الحياة** | `create_project` و`init_project` و`login_bot` و`add_module` و`upgrade` | الهيكل، ورمز @BotFather، وhandlers وendpoints وlib، ونقل تخطيط ما قبل 0.2.0 |
| **المزامنة** | `status` و`diff` و`push` و`deploy` و`pull` و`fetch` و`reset` | الفروقات، والنشر الذرّي، والبناء ثم push لـ Mini App |
| **البيانات** | `run_handler` و`migrate` | تشغيل من غير نشر؛ ترحيل `--dry-run` و`--safe` و`--yes` و`--local` |
| **Webhook** | `webhook_status` و`webhook_sync` | «البوت صامت»، وإعادة التوجيه |

موارد `tgcloud://docs/*` مرجع إنجليزي للمنصة. أوصاف الأدوات إنجليزية أيضًا حتى تقرأ النموذج نصًا واحدًا وتجيبك بلغتك.
وثائق الناس: الإنجليزية والروسية والصينية والعربية والألمانية والفرنسية.

## الأمان

- الاستدعاءات المدمرة (`reset` و`push --force` وتطبيق `upgrade` والترحيل و`webhook sync --drop-pending`) ترفض العمل من غير `confirm: true`.
- الرمز يصل إلى الواجهة عبر stdin ويُخفى في كل نتيجة.

## التثبيت

يلزم Node.js 20+.

```bash
npm install -g tgcloud-mcp
tgcloud-mcp setup
```

المعالج يكتب إعداد MCP. إن وافقت على Agent Plugin تُنسخ الحزمة إلى `~/.tgcloud-mcp/agent-plugin` وإلى إضافات Cursor المحلية وإلى `chat.pluginLocations` في VS Code.

```bash
curl -fsSL https://raw.githubusercontent.com/sdamarketing/tgcloud_mcp/main/install.sh | bash
docker run -i --rm ghcr.io/sdamarketing/tgcloud-mcp
```

التفاصيل: [docs/installation.ar.mdx](docs/installation.ar.mdx).

## مثال

```json
{ "mcpServers": { "tgcloud": { "command": "tgcloud-mcp" } } }
```

| المتغير | الافتراضي | الغرض |
|---|---|---|
| `TGCLOUD_CLI` | `npx` | كيف تُشغَّل الواجهة |
| `TGCLOUD_CLI_ARGS` | `tgcloud` | وسائط قبل الأمر الفرعي |
| `TGCLOUD_TIMEOUT_MS` | `120000` | مهلة أمر واحد |

بعد تعديل الواجهة الأمامية يستدعي المساعد `deploy`. ‏`push` وحده لا يشغّل المُجمّع.

الدليل الطويل (سرده بالروسية): [docs/cookbook-srl-bot.md](docs/cookbook-srl-bot.md). المهارة: `npx skills add sdamarketing/tgcloud_mcp`.

MIT
