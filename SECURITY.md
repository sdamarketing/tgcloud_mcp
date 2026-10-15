# Security Policy

Human-facing guardrails are also in the docs: [English](docs/security.en.mdx),
[Russian](docs/security.ru.mdx), [Chinese](docs/security.zh.mdx),
[Arabic](docs/security.ar.mdx), [German](docs/security.de.mdx),
[French](docs/security.fr.mdx).

## Project status

`tgcloud-mcp` is an **unofficial** community MCP server for Telegram serverless
bots. It is **not affiliated with Telegram**. The platform's official tool is
the `@tgcloud/cli` CLI. This server only launches that local CLI and returns
its output.

## What the server does

- Runs the `tgcloud` CLI locally (`TGCLOUD_CLI`, default `npx tgcloud`) in the
  project directory `project_dir`.
- Passes the CLI access token to the CLI on stdin (`login_bot`) or reads
  `TGCLOUD_TOKEN`. Tokens are masked in tool output.
- Requires `confirm: true` for destructive operations (`reset`, `push --force`,
  applying `upgrade`, applying `migrate`, `webhook sync --drop-pending`).

It does not send tokens or data anywhere except through the CLI, which talks
to the platform API (cloud.telegram.org). It has no network calls of its own.
It does not run arbitrary code beyond the CLI command you asked for.
`deploy` additionally runs `npm run build` in the project when that script exists.

The only process the server starts is the configurable `TGCLOUD_CLI`. A proxy
wrapper is a choice you make.

## Supply chain

- npm publishes only from GitHub Actions on a `v*` tag, through OIDC trusted
  publishing (`sdamarketing/tgcloud_mcp` + `publish.yml`) with Sigstore
  provenance: `npm view tgcloud-mcp dist.attestations`.
- Check provenance on the package page at npmjs.com → Provenance.
- The Docker image is built by the same CI from the same commit (ghcr.io).

## Reporting a vulnerability

Open a [GitHub issue](https://github.com/sdamarketing/tgcloud_mcp/issues)
or write to the repository owner. Do not publish exploit details before a fix.
