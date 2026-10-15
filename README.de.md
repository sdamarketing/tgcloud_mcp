# tgcloud-mcp — MCP-Server für serverlose Telegram-Bots

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [العربية](README.ar.md) · [Français](README.fr.md)

> Inoffizielles Community-Projekt (Autor @sdamarketing), nicht mit Telegram verbunden.
> Das offizielle Werkzeug der Plattform ist die CLI `@tgcloud/cli`. tgcloud-mcp
> packt sie in MCP. Bedrohungsmodell: [SECURITY.md](SECURITY.md).

Bringt einem Assistenten bei, serverlose Bots zu betreiben
([core.telegram.org/bots/serverless](https://core.telegram.org/bots/serverless)):
„leg einen Bot an“, „deploy“, „zeig den Webhook“ — der Assistent ruft `tgcloud` auf.

Clients: **opencode, Claude Code, Claude Desktop, Cursor, VS Code (Copilot), Windsurf, Zed**.
Derselbe Server und Skill sind ein [Agent Plugin](https://agent-plugins.org) (`agent-plugin/`)
für Codex, Cursor, Copilot, Kiro und VS Code.

## Was es kann

16 Werkzeuge:

| Bereich | Werkzeuge | Aufgabe |
|---|---|---|
| **Lebenszyklus** | `create_project`, `init_project`, `login_bot`, `add_module`, `upgrade` | Gerüst, Token von @BotFather, Handler, Endpoints, lib, Layout vor 0.2.0 nach `tgcloud/` |
| **Abgleich** | `status`, `diff`, `push`, `deploy`, `pull`, `fetch`, `reset` | Änderungen, atomares Deploy, für eine Mini App erst bauen dann push |
| **Daten** | `run_handler`, `migrate` | Lauf ohne Deploy; Migrationen mit `--dry-run`, `--safe`, `--yes`, `--local` |
| **Webhook** | `webhook_status`, `webhook_sync` | „Der Bot ist stumm“, Webhook neu ausrichten |

Die Ressourcen `tgcloud://docs/*` sind die Plattformreferenz auf Englisch.
Werkzeugbeschreibungen sind ebenfalls Englisch: das Modell liest einen Text und antwortet in deiner Sprache.
Lesedoku: Englisch, Russisch, Chinesisch, Arabisch, Deutsch, Französisch.

## Sicherheit

- Zerstörende Aufrufe (`reset`, `push --force`, Anwenden von `upgrade` und Migrationen, `webhook sync --drop-pending`) laufen nicht ohne `confirm: true`.
- Das Token geht über stdin an die CLI und wird in jeder Ausgabe maskiert.

## Installation

Node.js 20+.

```bash
npm install -g tgcloud-mcp
tgcloud-mcp setup
```

Der Assistent schreibt die MCP-Konfiguration. Ein Ja zum Agent Plugin kopiert das Paket nach `~/.tgcloud-mcp/agent-plugin`, in Cursors lokale Plugins und in `chat.pluginLocations` von VS Code.

```bash
curl -fsSL https://raw.githubusercontent.com/sdamarketing/tgcloud_mcp/main/install.sh | bash
docker run -i --rm ghcr.io/sdamarketing/tgcloud-mcp
```

Details: [docs/installation.de.mdx](docs/installation.de.mdx).

## Beispiel

```json
{ "mcpServers": { "tgcloud": { "command": "tgcloud-mcp" } } }
```

| Variable | Vorgabe | Zweck |
|---|---|---|
| `TGCLOUD_CLI` | `npx` | Wie die CLI startet |
| `TGCLOUD_CLI_ARGS` | `tgcloud` | Argumente vor dem Unterbefehl |
| `TGCLOUD_TIMEOUT_MS` | `120000` | Timeout eines Befehls |

Nach Frontend-Änderungen ruft der Assistent `deploy` auf. Ein bloßes `push` startet den Bundler nicht.

Langes Kochbuch (Erzählung auf Russisch): [docs/cookbook-srl-bot.md](docs/cookbook-srl-bot.md). Skill: `npx skills add sdamarketing/tgcloud_mcp`.

MIT
