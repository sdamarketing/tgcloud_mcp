# Platform limits

Collected from core.telegram.org/bots/serverless and `docs/tgcloud-sdk.md` in a fresh @tgcloud/cli 0.2.x scaffold.

## Documented

| Where | Limit |
|---|---|
| Bot API upload (`InputFile`) | 50 MB per file, **10 MB for photos** |
| Download by `file_id` (`api.getFile*`) | 20 MB (`getFile` cap) |
| `fetch` response body | 32 MB (text, or a `res.body` stream) |
| `console` logs | shown by `tgcloud run` (no public size cap) |
| Foreign keys | forbidden (`.references()` / `foreignKey()` throw) |
| `handlers/`, `endpoints/` | one level, flat |
| Endpoint names | letters, digits, `_`, not starting with a digit |
| Runtime imports | `sdk` and project modules only; no npm, no filesystem |

## Not published (as of 2026-10)

Runtime quotas — **memory, CPU, wall-time timeout of a handler or endpoint, call rate, database size** — are absent from the public docs. Do not invent numbers.

1. Measure the path you have: `tgcloud run <module> '<json5>'` prints the elapsed time.
2. Ask Telegram: @BotFather → the bot → Serverless, or the platform's official channels.
3. Keep handlers short. Move heavy work off the update path and out through `fetch`.

> When official numbers appear, update this file. `npm run docs:check` only checks that every file in `resources/docs/` is registered.
