# Changelog

## [0.3.2] — 2026-10-15

- Установщик: баннер TGCLOUD (градиент #229ED9), спиннер, итог в рамке; мастер при `curl | bash` читает `/dev/tty`
- Документация: карточки CardGroup на главной, установке и инструментах (en, ru, zh, ar, de, fr)

## [0.3.1] — 2026-10-15

- `tgcloud-mcp setup` запускает мастер. Раньше бинарник игнорировал аргумент и молча ждал JSON-RPC на stdin
- В терминале без аргументов печатается справка, а не тишина
- В npm-пакет входят `scripts/`, без них мастеру нечего запускать

## [0.3.0] — 2026-10-15

- Инструменты: `upgrade` (layout до CLI 0.2.0, dry-run по умолчанию) и `deploy` (`npm run build`, затем `push`)
- `migrate`: `apply: "safe" | "yes"` и `local: true` (`--safe` / `--yes` / `--local`)
- Справочник `tgcloud://docs/*` и описания инструментов на английском; поправлены импорты (относительный путь с `.js`), вебхук после push, типы колонок `real` / `numeric` / `blob`
- Agent Plugin 1.0: `agent-plugin/` (`plugin.json`, `mcp.json`, скилл). `tgcloud-mcp setup` копирует его в `~/.tgcloud-mcp/agent-plugin` и подключает Cursor и VS Code
- Документация: английский канон, переводы ru, zh, ar, de, fr. `docs:check` сверяет пары страниц и две копии скилла

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
