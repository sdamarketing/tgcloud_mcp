# tgcloud Agent Plugin

Portable [Agent Plugins 1.0](https://agent-plugins.org) package: the `tgcloud` skill plus the `tgcloud-mcp` stdio server.

```text
agent-plugin/
├── plugin.json
├── mcp.json
└── skills/tgcloud/SKILL.md
```

Clients that load this standard (Codex, Cursor, GitHub Copilot, Kiro, VS Code) install the directory once. The MCP server is the npm package `tgcloud-mcp` (`npx -y tgcloud-mcp`). The skill is the same file as `skills/tgcloud/SKILL.md` at the repository root; `npm run docs:check` fails if the two copies diverge.

`tgcloud-mcp setup` copies this directory to `~/.tgcloud-mcp/agent-plugin`, into Cursor's local plugin folder when Cursor is selected, and registers it in VS Code `chat.pluginLocations` when VS Code is selected.

This package does not install lifecycle hooks. Deploy and migrate stay explicit tool calls.
