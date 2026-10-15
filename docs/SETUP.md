---
title: "SETUP — detailed setup"
description: "tgcloud-mcp setup: tokens, clients, variables, troubleshooting"
---

# SETUP — tgcloud-mcp step by step

From zero to an assistant that manages Telegram serverless bots.
Other languages: [Russian](SETUP.ru). The shorter install pages are
[中文](installation.zh), [العربية](installation.ar), [Deutsch](installation.de),
[Français](installation.fr).

## 0. You need

- **Node.js 20+** (`node -v`)
- A **Telegram account** and a bot created in @BotFather
- A **CLI access token** (step 2)
- Network access to `cloud.telegram.org` and `api.telegram.org`

## 1. Install the server

Option A — npm (preferred):

```bash
npm install -g tgcloud-mcp
tgcloud-mcp            # stdio server; the MCP client usually starts this
```

Option B — one command (git clone into `~/.tgcloud-mcp`, then the wizard):

```bash
curl -fsSL https://raw.githubusercontent.com/sdamarketing/tgcloud_mcp/main/install.sh | bash
```

Option C — Docker:

```bash
docker run -i --rm ghcr.io/sdamarketing/tgcloud-mcp
```

## 2. CLI access token

1. Open @BotFather → your bot → **Serverless** → **CLI Access** → **Access token**.
2. The token looks like `app<id>:<secret>`. It is not the API token (`123456:AA…`).
   Turn Serverless on for the bot first.

Two ways to use it:

- **Link it to the project**: `npx tgcloud login` in the project directory
  (non-interactive: `printf 'app...\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login`).
  The `login_bot` tool does this for the agent.
- **Pass it in the environment** (CI): `TGCLOUD_TOKEN='app...'`. Then `login` is unnecessary.

The token never appears in tool output. The server masks it.

## 3. Connect a client

Automatic: `tgcloud-mcp setup` (global install) or `node ~/.tgcloud-mcp/scripts/setup.mjs`.
Ready-made snippets: `node scripts/generate-install-links.mjs`.

The wizard also offers the Agent Plugin. It copies `agent-plugin/` to
`~/.tgcloud-mcp/agent-plugin`. For Cursor it also copies to
`~/.cursor/plugins/local/tgcloud`. For VS Code it sets `chat.pluginLocations`
when `settings.json` is strict JSON. Codex, Copilot, and Kiro load that directory
from their plugin UI. Claude Code and opencode keep the MCP config and the skill:

```bash
npx skills add sdamarketing/tgcloud_mcp
```

Manual fragment (npm):

**opencode** (`~/.config/opencode/opencode.json`):

```json
{ "mcp": { "tgcloud": { "type": "local", "command": ["npx", "-y", "tgcloud-mcp"], "enabled": true } } }
```

**Claude Code / Cursor** (`mcpServers`):

```json
{ "mcpServers": { "tgcloud": { "command": "npx", "args": ["-y", "tgcloud-mcp"] } } }
```

**VS Code** (`mcp.json`):

```json
{ "servers": { "tgcloud": { "type": "stdio", "command": "npx", "args": ["-y", "tgcloud-mcp"] } } }
```

Restart the client. You should see 16 `tgcloud` tools and the `tgcloud://docs/*` resources.

## 4. Server environment

| Variable | Default | Purpose |
|---|---|---|
| `TGCLOUD_CLI` | `npx` | CLI launcher (a proxy wrapper or a PATH override is fine) |
| `TGCLOUD_CLI_ARGS` | `tgcloud` | Arguments before the subcommand |
| `TGCLOUD_TIMEOUT_MS` | `120000` | Timeout of one command. `deploy` allows at least 300000 ms for the build |
| `TGCLOUD_TOKEN` | — | CLI access token instead of `tgcloud login` |

## 5. A first dialogue

> "Create a bot in ~/bots/echo" → the agent calls `create_project`, asks for the
> CLI access token, `login_bot`, edits `handlers/message.js`, `push`, `webhook_sync`.

Cookbook: `docs/cookbook-srl-bot.md` (Russian narrative, platform commands).

## Troubleshooting

- **`"tgcloud login" requires an interactive terminal`** — use `login_bot`
  (it sets `TGCLOUD_ASSUME_TTY=1`) or `TGCLOUD_TOKEN`.
- **`Token format looks wrong. Expected "app<id>:<secret>"`** — that was the API
  token. You need the CLI access token (step 2).
- **`Could not reach the tgcloud server`** — no route to `cloud.telegram.org`.
  Point `TGCLOUD_CLI` at a wrapper with `HTTPS_PROXY` and `NODE_USE_ENV_PROXY=1`.
- **`This bot already has N deployed modules (revision R)`** — `fetch`, look at
  `diff`, then `push` (or a deliberate `push --force` with confirm).
- **`non-interactive session — specify --safe, --yes, or --dry-run`** — use
  `migrate`: dry-run by default, or `dry_run: false` with `confirm: true`
  (`apply: "safe"` or `apply: "yes"`).
- **Old layout (`schema.js` at the project root)** — `upgrade` dry-run, then
  apply with `confirm: true`.
