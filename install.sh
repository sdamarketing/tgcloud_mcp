#!/usr/bin/env bash
#
# tgcloud-mcp · MCP-сервер для serverless-ботов Telegram
#
# Установка (macOS / Linux / WSL):
#   curl -fsSL https://raw.githubusercontent.com/sdamarketing/tgcloud_mcp/main/install.sh | bash
#
# Повторный запуск той же командой = обновление сервера.
# Перед | bash скрипт можно прочитать: уберите «| bash» и посмотрите вывод.
# Скрипт выполняется от обычного пользователя; sudo не нужен.
#
# Переменные окружения (все необязательные):
#   TGCLOUD_MCP_INSTALL_DIR  — куда ставить (по умолчанию ~/.tgcloud-mcp)
#   TGCLOUD_MCP_NO_WIZARD=1  — не запускать мастер настройки в конце
#
set -euo pipefail

REPO_URL="${TGCLOUD_MCP_REPO_URL:-https://github.com/sdamarketing/tgcloud_mcp.git}"
REPO_PUBLIC_URL="github.com/sdamarketing/tgcloud_mcp"
NODE_MAJOR_MIN="20"
INSTALL_DIR="${TGCLOUD_MCP_INSTALL_DIR:-$HOME/.tgcloud-mcp}"

say() { printf '%s\n' "$*"; }
ok()   { printf '  ✔ %s\n' "$*"; }
die()  { printf '  ✖ %s\n' "$*" >&2; exit 1; }

say ""
say "tgcloud-mcp — MCP-сервер для serverless-ботов Telegram"
say "Исходники: ${REPO_PUBLIC_URL}"
say ""

# --- Node.js ---
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt "$NODE_MAJOR_MIN" ]; then
  die "Нужен Node.js >= ${NODE_MAJOR_MIN}. Установите: https://nodejs.org (или nvm)"
fi
ok "node $(node -v)"

# --- git ---
command -v git >/dev/null 2>&1 || die "Нужен git"

# --- Установка/обновление ---
if [ -d "$INSTALL_DIR/.git" ]; then
  say "Обновление существующей установки в $INSTALL_DIR"
  git -C "$INSTALL_DIR" fetch --quiet origin
  git -C "$INSTALL_DIR" reset --hard origin/main --quiet
  ok "код обновлён"
else
  say "Клонирование в $INSTALL_DIR"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR" --quiet
  ok "склонировано"
fi

cd "$INSTALL_DIR"
npm install --no-fund --no-audit --loglevel=error
npm run build
npm run smoke
ok "собрано и проверено (smoke)"

# --- Мастер настройки ---
if [ "${TGCLOUD_MCP_NO_WIZARD:-}" != "1" ]; then
  node scripts/setup.mjs || true
else
  say "Мастер пропущен (TGCLOUD_MCP_NO_WIZARD=1). Позже: $INSTALL_DIR/scripts/setup.mjs"
fi
