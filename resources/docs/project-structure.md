# tgcloud project layout

Scaffold (`npm create @tgcloud/bot my-bot`, @tgcloud/cli 0.2.x):

```plaintext
my-bot/
├─ tgcloud/              # everything the platform runs
│  ├─ handlers/          # update handlers — flat, one level
│  │  ├─ message.js
│  │  └─ callback_query.js
│  ├─ endpoints/         # Mini App functions (POST /api/<name>)
│  ├─ lib/               # shared modules; subdirectories allowed
│  │  └─ internal/util.js
│  └─ schema.js          # database schema — one file
├─ tgcloud.jsonc         # project config (static block for the Mini App)
├─ docs/tgcloud-sdk.md   # SDK reference shipped by the scaffold
├─ AGENTS.md             # orientation for AI agents, shipped by the scaffold
└─ .tgcloud/             # CLI state: credentials, snapshot, cache (gitignored)
```

Only `.js` files under `tgcloud/` (`schema.js`, `lib/`, `handlers/`, `endpoints/`) are deployed as code, plus the Mini App build folder when `tgcloud.jsonc` names one. A `.js` file anywhere else inside `tgcloud/` (`tgcloud/util.js`) is flagged and not deployed. The module name is the path inside `tgcloud/` without the extension: `tgcloud/handlers/message.js` → `handlers/message`.

Inside a project, read `AGENTS.md` and `docs/tgcloud-sdk.md` first. They match the CLI that scaffolded that project.

## Import rules

**Project modules: a relative path WITH the `.js` extension. The SDK: a bare name.**

```javascript
// from tgcloud/handlers/message.js:
import { users } from '../schema.js';          // yes
import { addItem } from '../lib/cart.js';      // yes
import { users } from '../schema';             // no — missing .js, does not resolve
import x from '../../src/x.js';                // no — nothing outside tgcloud/ is visible
import { db, api, fetch, BotApiError, EndpointError } from 'sdk';
import { table, integer, text, eq, sql } from 'sdk/db';
```

A bare module name (`from 'lib/cart'`, no extension) also resolves. Prefer relative imports: editors understand them. At runtime this is a V8 isolate: no filesystem, no npm packages. Only `sdk` (and `sdk/db`, `sdk/api`, `sdk/fetch`) and the project's own modules exist.

## Handlers (`handlers/`)

One file per Bot API update type (`message`, `edited_message`, `channel_post`, `callback_query`, `inline_query`, `chosen_inline_result`, `shipping_query`, `pre_checkout_query`, `poll`, `poll_answer`, `my_chat_member`, `chat_member`, `chat_join_request`, `message_reaction`, …). The directory is flat. An update type runs only when its file exists and is non-empty; otherwise Telegram does not invoke your code for it.

`export default` receives the unwrapped payload. The second argument is `ctx` (`ctx.update` is the raw Update):

```javascript
import { api } from 'sdk';

export default async function (message, ctx) {
  await api.sendMessage({
    chat_id: message.chat.id,
    text: `You said: ${message.text ?? '(no text)'}`,
  });
}
```

## Endpoints (`endpoints/`) — Mini App server

`tgcloud/endpoints/<name>.js` is called as `POST /api/<name>`. The platform rejects a call with `401` before your code runs when init data is missing or invalid.

```javascript
import { EndpointError } from 'sdk';

export default async function (input, ctx) {
  // input is the JSON object the Mini App sent. The return value is sent back as JSON.
  // ctx.initData is verified by the platform. ctx.initData.user is the caller.
  const user = ctx.initData.user;
  if (!user) throw new EndpointError('Unauthorized', { code: 'AUTH' });
  return { ok: true, userId: user.id };
}
```

- `throw new EndpointError(description, parameters?)` returns the description and the parameters object to the Mini App (`err.type === 'ENDPOINT_ERROR'`). Any other exception is a generic internal error; the real message stays in the logs.
- From the front-end, `telegram-web-app.js`: `Telegram.WebApp.Serverless.call('getProfile', { lang: 'en' }, (err, result) => { … })`. The input is optional.
- Names are identifiers: letters, digits, `_`, not starting with a digit. Scaffold with `tgcloud add endpoints/<name>`. Test with `tgcloud run endpoints/<name> '{}' --ctx '{ initData: { user: { id: 1, first_name: "Ann" } } }'`.

## Mini App front-end

- `tgcloud.jsonc` → `{ "static": { "source": "dist", "spa": true } }` deploys the build folder and hosts it at `https://app<app_id>.tgcloud.ai/` (`push` prints the exact URL). Shortcut `"static": "dist"`. `"static": false` removes the site on the next push.
- `spa` serves `index.html` for extension-less paths that do not exist. `immutable` is only for content-hashed files (`/assets/*`); anything else matched there stays cached for a year. `headers` and `redirects` are path rules. Do not set `X-Frame-Options` or a restrictive `frame-ancestors`: Telegram opens the Mini App in an iframe. The bundler's default `base` (`/`) is correct.
- **Build before push.** `push` uploads the folder as it is and never runs your build. `npm run deploy` (added by `init` when it recognizes the front-end) builds, then pushes. `pull` never writes the build folder.
- The front-end is ordinary browser code with npm. It cannot import `tgcloud/` modules. It talks to the bot only through endpoints.

## Logging

`console.log` / `info` / `warn` / `error` / `trace`. `tgcloud run` captures the output. `error` and `trace` include a stack. Lines are tagged `[file:line]`.

## Revisions

Each deploy bumps a cloud revision. `push` sends the revision the CLI last synced and is rejected when the cloud has moved ahead. Then: `fetch` (see the cloud without touching files), `pull` (take the cloud into the working tree), or `push --force` (overwrite; dangerous).
