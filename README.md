# tgcloud-mcp — MCP server for Telegram serverless bots

[Русский](README.ru.md) · [中文](README.zh.md) · [العربية](README.ar.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

> Unofficial project. This is a community tool (author @sdamarketing),
> not affiliated with Telegram. The platform's official tool is the `@tgcloud/cli`
> CLI. tgcloud-mcp wraps that CLI in MCP. Threat model:
> [SECURITY.md](SECURITY.md).

[![CI](https://github.com/sdamarketing/tgcloud_mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sdamarketing/tgcloud_mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/tgcloud-mcp?style=flat-square)](https://www.npmjs.com/package/tgcloud-mcp)
[![skills.sh](https://skills.sh/b/sdamarketing/tgcloud_mcp)](https://skills.sh/sdamarketing/tgcloud_mcp)
[![ghcr](https://img.shields.io/badge/ghcr-sdamarketing%2Ftgcloud--mcp-blue?style=flat-square)](https://github.com/sdamarketing/tgcloud_mcp/pkgs/container/tgcloud-mcp)

Teaches an AI assistant to manage Telegram serverless bots
([core.telegram.org/bots/serverless](https://core.telegram.org/bots/serverless)):
you say "create a bot", "deploy", "show the webhook" — the assistant runs
`tgcloud` and you do not have to drive the terminal.

Works with any MCP client: **opencode, Claude Code, Claude Desktop, Cursor, VS Code (Copilot), Windsurf, Zed**.
The same server and skill are also one [Agent Plugin](https://agent-plugins.org)
(`agent-plugin/`) for Codex, Cursor, Copilot, Kiro, and VS Code.

## What it does

16 tools over the `tgcloud` CLI:

| Area | Tools | What they do |
|---|---|---|
| **Lifecycle** | `create_project`, `init_project`, `login_bot`, `add_module`, `upgrade` | Scaffold, link a bot with the @BotFather token, new handlers, endpoints, and lib modules, move a pre-0.2.0 layout into `tgcloud/` |
| **Sync** | `status`, `diff`, `push`, `deploy`, `pull`, `fetch`, `reset` | See changes, atomic deploy, build-then-push for a Mini App, sync with the cloud |
| **Data** | `run_handler`, `migrate` | Run a handler or endpoint without deploying; migrations with `--dry-run`, `--safe`, `--yes`, `--local` |
| **Webhook** | `webhook_status`, `webhook_sync` | "The bot is silent", re-point the webhook |

Plus MCP **resources** `tgcloud://docs/*` — platform reference in English
(layout, import rules, `sdk/db`, `sdk/api`, `sdk/fetch`, CLI, limits).

Tool descriptions and the skill are English so the model follows one text.
The assistant is told to answer you in your language. Human docs are
English, Russian, Chinese, Arabic, German, and French.

## Security

- **Destructive calls need confirmation.** `reset`, `push --force`, applying
  `upgrade`, applying migrations, and `webhook sync --drop-pending` refuse to
  run without `confirm: true`. The assistant shows the change and asks first.
- **Tokens do not leak.** The bot token goes to the CLI on stdin and is masked
  in every tool result.

## Install

Prefer the **npm package** (published with OIDC trusted publishing and Sigstore
provenance). `curl | bash` is convenient and runs a remote script: read it
first (drop the `| bash`), or use npm.

Node.js 20+ (the platform CLI needs 18+).

**npm:**

```bash
npm install -g tgcloud-mcp
tgcloud-mcp setup
```

The wizard writes the MCP config. Say yes to the Agent Plugin and it copies
`agent-plugin/` to `~/.tgcloud-mcp/agent-plugin`, into Cursor's local plugin
folder, and into VS Code `chat.pluginLocations`.

**One command (macOS / Linux / WSL):**

```bash
curl -fsSL https://raw.githubusercontent.com/sdamarketing/tgcloud_mcp/main/install.sh | bash
```

**Docker:**

```bash
docker run -i --rm ghcr.io/sdamarketing/tgcloud-mcp
```

**From source:**

```bash
git clone https://github.com/sdamarketing/tgcloud_mcp.git
cd tgcloud_mcp
npm install && npm test
```

Details: **[docs/SETUP.md](docs/SETUP.md)**.

## Connect an agent

```json
{
  "mcpServers": {
    "tgcloud": {
      "command": "tgcloud-mcp"
    }
  }
}
```

| Variable | Default | Purpose |
|---|---|---|
| `TGCLOUD_CLI` | `npx` | How to launch the CLI (a global `tgcloud` is fine) |
| `TGCLOUD_CLI_ARGS` | `tgcloud` | Arguments before the subcommand |
| `TGCLOUD_TIMEOUT_MS` | `120000` | Timeout of one CLI command |

## Example

> **You:** create an echo bot in ~/bots/echo
> **Agent:** `create_project` → `login_bot` (asks @BotFather for the token) → edits `handlers/message.js` → `push` → `webhook_sync`. The bot is live.
> **You:** test it
> **Agent:** `run_handler` with `{ chat: { id: 1 }, text: "hi" }` and shows the output and logs.

After front-end edits the agent calls `deploy` (build, then push). A plain
`push` uploads the build folder as it is and does not run the bundler.

## Cookbook

**[A serverless bot with a Mini App in one evening](docs/cookbook-srl-bot.md)** —
the long walkthrough is Russian; the commands are the platform's. Short
overviews: `docs/cookbook.en.mdx` and the ru, zh, ar, de, fr siblings.

## Skill

`skills/tgcloud` is the procedure the agent follows: layout, imports, recipes,
guardrails. The same file is `agent-plugin/skills/tgcloud/SKILL.md`.
`npm run docs:check` fails if the copies diverge.

```bash
npx skills add sdamarketing/tgcloud_mcp
```

## Repository

```
src/                 # server, runner, tools
resources/docs/      # platform reference → MCP resources (English)
skills/tgcloud/      # agent skill
agent-plugin/        # Agent Plugins 1.0 package (plugin.json, mcp.json, skill)
docs/                # human docs, six languages
```

## License

MIT
