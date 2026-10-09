# Changelog

## [0.2.1] — 2026-10-09

- package.json: `mcpName` (требование Official MCP Registry), `repository`/`homepage`/`bugs` (требование npm provenance)
- publish.yml: setup-node без registry-url, `npm publish --access public` (OIDC сам ставит provenance)

## [0.2.0] — 2026-10-09

Дистрибуция по образцу tracker-mcp:

- `server.json` + публикация в Official MCP Registry по тегу (OIDC)
- Docker-образ `ghcr.io/sdamarketing/tgcloud-mcp` (multi-arch) по тегу
- `install.sh` (curl|bash в `~/.tgcloud-mcp`), мастер `setup`, `self-update`, `links`
- `docs/SETUP.md` — пошаговая настройка клиентов
- `tests/e2e.mjs` — stdio e2e (initialize/tools-list/call)
- `scripts/check-docs-drift.mjs` — сверка ресурсов с `resources/docs/`
- `context7.json`, `CONTEXT.md`, README-бейджи
- кукбук: `docs/cookbook-srl-bot.md` — «serverless-бот с мини-аппом за вечер»
- `migrate` неинтерактивно: `--dry-run` по умолчанию, `--yes` при `confirm: true`
- `login_bot`: токен по stdin с `TGCLOUD_ASSUME_TTY=1`, валидация формата `app<id>:<secret>`
- `add_module`: поддержка `endpoints/<name>`

## [0.1.0] — 2026-10-09

Первый релиз:

- 14 инструментов, полный срез tgcloud CLI: lifecycle (create/init/login/add),
  sync (status/diff/push/pull/fetch/reset), data (run_handler/migrate),
  webhook (status/sync)
- Guardrails: `confirm: true` для деструктивных операций; маскировка токенов в выводе
- MCP-ресурсы `tgcloud://docs/*` — справка платформы
- Скилл `skills/tgcloud`, smoke-тест по stdio
