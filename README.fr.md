# tgcloud-mcp — serveur MCP pour les bots Telegram serverless

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [العربية](README.ar.md) · [Deutsch](README.de.md)

> Projet communautaire non officiel (auteur @sdamarketing), sans lien avec Telegram.
> L'outil officiel de la plateforme est la CLI `@tgcloud/cli`. tgcloud-mcp l'enveloppe
> dans MCP. Modèle de menace : [SECURITY.md](SECURITY.md).

Apprend à un assistant à gérer des bots serverless
([core.telegram.org/bots/serverless](https://core.telegram.org/bots/serverless)) :
« crée un bot », « déploie », « montre le webhook » — l'assistant lance `tgcloud`.

Clients : **opencode, Claude Code, Claude Desktop, Cursor, VS Code (Copilot), Windsurf, Zed**.
Le même serveur et le même skill forment un [Agent Plugin](https://agent-plugins.org) (`agent-plugin/`)
pour Codex, Cursor, Copilot, Kiro et VS Code.

## Ce qu'il fait

16 outils :

| Domaine | Outils | Rôle |
|---|---|---|
| **Cycle de vie** | `create_project`, `init_project`, `login_bot`, `add_module`, `upgrade` | Échafaudage, jeton @BotFather, handlers, endpoints, lib, déplacement d'une disposition d'avant 0.2.0 |
| **Synchro** | `status`, `diff`, `push`, `deploy`, `pull`, `fetch`, `reset` | Écarts, déploiement atomique, build puis push pour une Mini App |
| **Données** | `run_handler`, `migrate` | Exécution sans déployer ; migrations `--dry-run`, `--safe`, `--yes`, `--local` |
| **Webhook** | `webhook_status`, `webhook_sync` | « Le bot est silencieux », réorientation du webhook |

Les ressources `tgcloud://docs/*` sont la référence de la plateforme en anglais.
Les descriptions d'outils sont en anglais : le modèle lit un seul texte et vous répond dans votre langue.
Docs pour les humains : anglais, russe, chinois, arabe, allemand, français.

## Sécurité

- Les appels destructifs (`reset`, `push --force`, application de `upgrade` et des migrations, `webhook sync --drop-pending`) refusent de tourner sans `confirm: true`.
- Le jeton va à la CLI sur stdin et est masqué dans chaque résultat.

## Installation

Node.js 20+.

```bash
npm install -g tgcloud-mcp
tgcloud-mcp setup
```

L'assistant écrit la configuration MCP. Un oui à l'Agent Plugin copie le paquet vers `~/.tgcloud-mcp/agent-plugin`, les plugins locaux de Cursor et `chat.pluginLocations` de VS Code.

```bash
curl -fsSL https://raw.githubusercontent.com/sdamarketing/tgcloud_mcp/main/install.sh | bash
docker run -i --rm ghcr.io/sdamarketing/tgcloud-mcp
```

Détails : [docs/installation.fr.mdx](docs/installation.fr.mdx).

## Exemple

```json
{ "mcpServers": { "tgcloud": { "command": "tgcloud-mcp" } } }
```

| Variable | Défaut | Rôle |
|---|---|---|
| `TGCLOUD_CLI` | `npx` | Comment lancer la CLI |
| `TGCLOUD_CLI_ARGS` | `tgcloud` | Arguments avant la sous-commande |
| `TGCLOUD_TIMEOUT_MS` | `120000` | Délai d'une commande |

Après une modification du front, l'assistant appelle `deploy`. Un simple `push` ne lance pas le bundler.

Longue recette (récit en russe) : [docs/cookbook-srl-bot.md](docs/cookbook-srl-bot.md). Skill : `npx skills add sdamarketing/tgcloud_mcp`.

MIT
