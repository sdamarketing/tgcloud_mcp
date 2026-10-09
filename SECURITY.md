# Security Policy

## Статус проекта

`tgcloud-mcp` — **неофициальный** (community) MCP-сервер для платформы Telegram
serverless bots. Он **не аффилирован с Telegram**; официальный инструмент
платформы — CLI `@tgcloud/cli`. Этот сервер только запускает локальный CLI и
возвращает его вывод.

## Что сервер делает и чего не делает

**Делает:**

- запускает `tgcloud` CLI локально (`TGCLOUD_CLI`, по умолчанию `npx tgcloud`),
  в каталоге проекта `project_dir`;
- CLI access token передаёт CLI через stdin (`login_bot`) или берётся из
  `TGCLOUD_TOKEN`; в выводах инструментов токены маскируются;
- требует `confirm: true` для деструктивных операций.

**Не делает:**

- не отправляет токены и данные никуда, кроме официального API платформы
  (куда ходит сам CLI — cloud.telegram.org);
- не содержит сетевых вызовов кроме как через CLI;
- не выполняет произвольный код, кроме явно запрошенных команд CLI.

Единственный процесс, который сервер запускает — настраиваемый `TGCLOUD_CLI`.
Экзотический вариант (обёртка с прокси) — осознанный выбор пользователя.

## Supply chain

- Публикация в npm — только из GitHub Actions по тегу `v*`, через OIDC
  Trusted Publisher (`sdamarketing/tgcloud_mcp` + `publish.yml`) с Sigstore
  provenance: `npm view tgcloud-mcp dist.attestations`.
- Проверить прованенс: страница пакета на npmjs.com → Provenance.
- Docker-образ строится тем же CI из того же коммита (ghcr.io).

## Отчёт об уязвимости

Откройте [GitHub Issue](https://github.com/sdamarketing/tgcloud_mcp/issues)
или напишите владельцу репозитория. Не публикуйте детали эксплойта до фикса.
