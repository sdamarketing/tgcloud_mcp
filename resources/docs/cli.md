# tgcloud CLI

Requires Node.js 18+. The CLI is a local dev dependency (`@tgcloud/cli`). From the project directory: `npx tgcloud <cmd>`. Every command works from a subfolder of the project.

## Start

```bash
npm create @tgcloud/bot my-bot    # scaffold; the CLI is installed into the project
npx tgcloud init                  # scaffold into the current directory (offline)
npx tgcloud login                 # link a bot — INTERACTIVE (needs a TTY)
```

**Token** — a CLI access token of the form `app<id>:<secret>` (@BotFather → your bot → Serverless → CLI Access → Access token). This is NOT the Bot API token (`123456:AA…`); that token is rejected.

Non-interactive login:

```bash
printf 'app...\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
# CI: export TGCLOUD_TOKEN='app...'   (login is then unnecessary)
```

The CLI never prompts for a token in the middle of another command. Resolution order: `TGCLOUD_TOKEN`, then `.tgcloud/credentials`, then an error that points at `login`.

## Modules

```bash
npx tgcloud add handlers/callback_query   # update handler
npx tgcloud add endpoints/getProfile      # Mini App endpoint
npx tgcloud add lib/cart                  # shared module
npx tgcloud add handlers                  # no name — prints a hint, creates nothing
```

Existing files are never overwritten. `handlers/` and `endpoints/` are flat. `lib/` may be nested.

## Run without deploying (platform, local files)

```bash
npx tgcloud run handlers/message '{ chat: { id: 1 }, text: "hi" }'
npx tgcloud run handlers/message "$(cat args.json5)"
npx tgcloud run endpoints/getProfile '{}' --ctx '{ initData: { user: { id: 1, first_name: "Ann" } } }'
```

Arguments and `--ctx` are JSON5 and must be objects. `console.*` output is captured. The run uses the local module space, including uncommitted `lib/` edits.

## Deploy and sync

**A deploy never touches the database.** Migrations are a separate step. **push never runs the front-end build.**

```bash
npx tgcloud status          # local changes vs the snapshot (offline); also static diffs and webhook drift
npx tgcloud diff            # line diff (offline)
npx tgcloud push [files..]  # atomic deploy of modules; also uploads static.source when tgcloud.jsonc names it
npx tgcloud push --force    # skip the revision check (DANGEROUS)
npx tgcloud fetch           # refresh the local snapshot; working files stay
npx tgcloud pull            # cloud → snapshot + working files; does not write the Mini App build folder
npx tgcloud reset           # discard local module edits (from the snapshot)
```

A full `push` mirrors the folder, deletions included, and prints the Mini App URL. A targeted push (`handlers/message`, `tgcloud/handlers/message.js`) does not delete other modules. `npx tgcloud push dist/` uploads static files alone. After a deploy, pending schema changes are printed and not applied.

Adding or removing a handler can leave the platform webhook out of sync. `status` flags that. Fix it with `webhook sync`. push does not guarantee the webhook matches the new handler set.

If the cloud revision moved ahead, `push` stops. Then `fetch`, `pull`, or `push --force`.

## Database

```bash
npx tgcloud push                 # deploy schema.js first; reports pending DB changes
npx tgcloud migrate              # apply (INTERACTIVE; errors in a non-interactive shell)
npx tgcloud migrate --dry-run    # preview, apply nothing
npx tgcloud migrate --safe       # auto-apply safe changes, skip warnings and manual steps
npx tgcloud migrate --yes        # auto-apply safe changes and every warning; skip manual steps
npx tgcloud migrate --local      # diff against local schema.js instead of the deployed one
```

Each pending change is `safe`, `warning`, or `manual`. Drops happen only through `.deprecated('reason')` on a column, table, or index; deleting a declaration drops nothing. A column type change is manual: do it yourself with `db.run(...)`. **There are no foreign keys** — `.references()` / `foreignKey()` throw at declaration time.

For an agent, do not run a bare `migrate`. Use `--dry-run` to preview, then `--safe` or `--yes`.

## Webhook

The platform owns the webhook. You never set the URL by hand.

```bash
npx tgcloud webhook                          # URL, allowed_updates, pending count, last error, in sync or not
npx tgcloud webhook sync [--drop-pending]    # re-point and rebuild allowed_updates from deployed handlers
```

`--drop-pending` discards updates Telegram had already queued.

## Other

```bash
npx tgcloud upgrade [--dry-run]   # one-time: pre-0.2.0 layout (root schema.js/handlers/lib) → tgcloud/
npx tgcloud completion <bash|zsh|fish>
```

`upgrade` keeps the bot link. Other commands refuse the old layout until you upgrade. `completion` is a human shell helper; it needs a bare `tgcloud` on `PATH`.
