# tgcloud-mcp — Telegram 无服务器机器人的 MCP 服务器

[English](README.md) · [Русский](README.ru.md) · [العربية](README.ar.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

> 非官方社区项目（作者 @sdamarketing），与 Telegram 无隶属关系。
> 平台官方工具是 `@tgcloud/cli`。tgcloud-mcp 只是把它包成 MCP。
> 威胁模型见 [SECURITY.md](SECURITY.md)。

让助手管理无服务器机器人（[core.telegram.org/bots/serverless](https://core.telegram.org/bots/serverless)）：你说「创建机器人」「部署」「看 webhook」，助手去跑 `tgcloud`。

客户端：**opencode、Claude Code、Claude Desktop、Cursor、VS Code (Copilot)、Windsurf、Zed**。
同一套服务器和 skill 也是一份 [Agent Plugin](https://agent-plugins.org)（`agent-plugin/`），给 Codex、Cursor、Copilot、Kiro 和 VS Code。

## 能做什么

16 个工具：

| 类别 | 工具 | 作用 |
|---|---|---|
| **生命周期** | `create_project`、`init_project`、`login_bot`、`add_module`、`upgrade` | 脚手架、@BotFather 令牌、handlers / endpoints / lib、把 0.2.0 前的布局移入 `tgcloud/` |
| **同步** | `status`、`diff`、`push`、`deploy`、`pull`、`fetch`、`reset` | 查看变更、原子部署、Mini App 先构建再 push |
| **数据** | `run_handler`、`migrate` | 不部署即可运行；迁移支持 `--dry-run`、`--safe`、`--yes`、`--local` |
| **Webhook** | `webhook_status`、`webhook_sync` | 「机器人没反应」、重新指向 webhook |

资源 `tgcloud://docs/*` 是英文平台参考。工具描述也是英文，模型用一份文本，再用你的语言回答。
给人读的文档有英、俄、中、阿、德、法。

## 安全

- 破坏性调用（`reset`、`push --force`、应用 `upgrade` 和迁移、`webhook sync --drop-pending`）没有 `confirm: true` 会拒绝。
- 令牌经 stdin 交给 CLI，并在所有输出中掩码。

## 安装

需要 Node.js 20+。

```bash
npm install -g tgcloud-mcp
tgcloud-mcp setup
```

向导写入 MCP 配置。同意安装 Agent Plugin 后，副本进入 `~/.tgcloud-mcp/agent-plugin`、Cursor 本地插件目录和 VS Code 的 `chat.pluginLocations`。

```bash
curl -fsSL https://raw.githubusercontent.com/sdamarketing/tgcloud_mcp/main/install.sh | bash
docker run -i --rm ghcr.io/sdamarketing/tgcloud-mcp
```

说明：[docs/installation.zh.mdx](docs/installation.zh.mdx)。

## 配置示例

```json
{ "mcpServers": { "tgcloud": { "command": "tgcloud-mcp" } } }
```

| 变量 | 默认 | 作用 |
|---|---|---|
| `TGCLOUD_CLI` | `npx` | 如何启动 CLI |
| `TGCLOUD_CLI_ARGS` | `tgcloud` | 子命令前的参数 |
| `TGCLOUD_TIMEOUT_MS` | `120000` | 单条命令超时 |

改完前端应调用 `deploy`。单独的 `push` 不会运行打包器。

长教程（叙述为俄文）：[docs/cookbook-srl-bot.md](docs/cookbook-srl-bot.md)。Skill：`npx skills add sdamarketing/tgcloud_mcp`。

MIT
