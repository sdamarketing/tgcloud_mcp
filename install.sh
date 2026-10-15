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
#   TGCLOUD_MCP_INSTALL_DIR   — куда ставить (по умолчанию ~/.tgcloud-mcp)
#   TGCLOUD_MCP_REPO_URL      — свой форк
#   TGCLOUD_MCP_NO_WIZARD=1   — не запускать мастер настройки в конце
#   TGCLOUD_MCP_BANNER_ONLY=1 — только нарисовать баннер и выйти
#
set -euo pipefail

AUTHOR="@sdamarketing"
REPO_URL="${TGCLOUD_MCP_REPO_URL:-https://github.com/sdamarketing/tgcloud_mcp.git}"
REPO_PUBLIC_URL="github.com/sdamarketing/tgcloud_mcp"
NODE_MAJOR_MIN="20"
INSTALL_DIR="${TGCLOUD_MCP_INSTALL_DIR:-$HOME/.tgcloud-mcp}"

# --- Оформление ----------------------------------------------------------------

if [ -n "${NO_COLOR:-}" ]; then
  C_CYAN=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_BOLD=""; C_DIM=""; C_OFF=""
  TRUECOLOR="no"
elif command -v tput >/dev/null 2>&1 && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
  C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_RED=$'\033[31m'
  C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'; C_OFF=$'\033[0m'
  TRUECOLOR="no"
  if [ "${COLORTERM:-}" = "truecolor" ] || [ "${COLORTERM:-}" = "24bit" ]; then
    TRUECOLOR="yes"
  fi
else
  C_CYAN=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_BOLD=""; C_DIM=""; C_OFF=""
  TRUECOLOR="no"
fi

say()  { printf '%s\n' "${C_BOLD}$*${C_OFF}"; }
ok()   { printf '  %s %s\n' "${C_GREEN}✔${C_OFF}" "$*"; }
warn() { printf '  %s %s\n' "${C_YELLOW}⚠${C_OFF}" "$*"; }
die()  { printf '  %s %s\n' "${C_RED}✖${C_OFF}" "$*" >&2; exit 1; }

# Арт «TGCLOUD» (figlet standard). Heredoc, чтобы бэкслеши не съел shell.
ART_ROWS=()
while IFS= read -r __banner_line; do
  ART_ROWS+=("$__banner_line")
done << 'TGCLOUD_BANNER_EOF'
 _____ ____  ____ _     ___  _   _ ____
|_   _/ ___|/ ___| |   / _ \| | | |  _ \
  | || |  _| |   | |  | | | | | | | | | |
  | || |_| | |___| |__| |_| | |_| | |_| |
  |_| \____|\____|_____\___/ \___/|____/
TGCLOUD_BANNER_EOF

BANNER_INFO=(
  "MCP-сервер для serverless-ботов Telegram"
  "Автор: ${AUTHOR}"
  "Исходники: ${REPO_PUBLIC_URL}"
)

dispw() { printf '%s' "$1" | wc -m; }

# Горизонтальный градиент: telegram blue #229ED9 → sky #7DD3FC.
gradient() {
  local s="$1"
  if [ "$TRUECOLOR" != "yes" ]; then
    printf '%s%s%s' "$C_CYAN" "$s" "$C_OFF"
    return
  fi
  local len=${#s} x r g b
  local denom=$((len > 1 ? len - 1 : 1))
  for ((x = 0; x < len; x++)); do
    r=$((34 + (125 - 34) * x / denom))
    g=$((158 + (211 - 158) * x / denom))
    b=$((217 + (252 - 217) * x / denom))
    printf '\033[38;2;%d;%d;%dm%s' "$r" "$g" "$b" "${s:x:1}"
  done
  printf '%s' "$C_OFF"
}

banner() {
  local max=0 line w padl padr i hbar
  for line in "${ART_ROWS[@]}"; do w=${#line}; [ "$w" -gt "$max" ] && max=$w; done
  for line in "${BANNER_INFO[@]}"; do w=$(dispw "$line"); [ "$w" -gt "$max" ] && max=$w; done
  hbar=""
  for ((i = 0; i < max + 2; i++)); do hbar+="─"; done

  printf '\n'
  printf '  %s┌%s┐%s\n' "$C_DIM" "$hbar" "$C_OFF"
  for line in "${ART_ROWS[@]}"; do
    printf '  %s│%s ' "$C_DIM" "$C_OFF"
    gradient "$line"
    printf '%*s' $((max - ${#line})) ''
    printf ' %s│%s\n' "$C_DIM" "$C_OFF"
  done
  printf '  %s│%*s│%s\n' "$C_DIM" $((max + 2)) '' "$C_OFF"
  for line in "${BANNER_INFO[@]}"; do
    w=$(dispw "$line")
    padl=$(((max - w) / 2 + 1))
    [ "$padl" -lt 1 ] && padl=1
    padr=$((max + 2 - padl - w))
    [ "$padr" -lt 1 ] && padr=1
    printf '  %s│%s' "$C_DIM" "$C_OFF"
    printf '%*s' "$padl" ''
    printf '%s%s%s' "$C_BOLD" "$line" "$C_OFF"
    printf '%*s' "$padr" ''
    printf '%s│%s\n' "$C_DIM" "$C_OFF"
  done
  printf '  %s└%s┘%s\n' "$C_DIM" "$hbar" "$C_OFF"
  printf '\n'
}

spin() {
  local msg="$1"; shift
  [ "${1:-}" = "--" ] && shift
  local log; log="$(mktemp)"
  local -a frames=( '⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏' )
  local i=0 pid
  "$@" >"$log" 2>&1 &
  pid=$!
  if [ -t 1 ]; then
    while kill -0 "$pid" 2>/dev/null; do
      printf '\r  %s%s%s %s' "$C_CYAN" "${frames[$((i % 10))]}" "$C_OFF" "$msg"
      i=$((i + 1))
      sleep 0.08
    done
  else
    printf '  … %s\n' "$msg"
  fi
  if wait "$pid"; then
    if [ -t 1 ]; then printf '\r'; fi
    ok "$msg"
    rm -f "$log"
  else
    local rc=$?
    if [ -t 1 ]; then printf '\r'; fi
    printf '  %s %s\n' "${C_RED}✖${C_OFF}" "$msg" >&2
    tail -n 15 "$log" >&2
    rm -f "$log"
    return "$rc"
  fi
}

TTY_OK="no"
if (exec 3< /dev/tty) 2>/dev/null; then
  TTY_OK="yes"
fi

banner

if [ "${TGCLOUD_MCP_BANNER_ONLY:-}" = "1" ]; then
  exit 0
fi

say "  Устанавливаю в ${INSTALL_DIR}"
printf '\n'

[ -n "${HOME:-}" ] || die 'Не задан HOME — запустите из обычного терминала.'
command -v git >/dev/null 2>&1 || die 'Нужен git'
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt "$NODE_MAJOR_MIN" ]; then
  die "Нужен Node.js >= ${NODE_MAJOR_MIN}. Установите: https://nodejs.org (или nvm)"
fi
ok "node $(node -v)"

if [ -d "$INSTALL_DIR/.git" ]; then
  say "  Ранее установлен: $INSTALL_DIR — обновляю"
  spin 'Обновляю код' -- git -C "$INSTALL_DIR" fetch --quiet origin
  git -C "$INSTALL_DIR" reset --hard origin/main --quiet
  ok 'Код обновлён'
elif [ -e "$INSTALL_DIR" ]; then
  die "Папка $INSTALL_DIR уже есть и это не копия репозитория.
  Удалите её или задайте другую: TGCLOUD_MCP_INSTALL_DIR=~/tgcloud-mcp bash install.sh"
else
  spin "Скачиваю tgcloud-mcp в $INSTALL_DIR" -- git clone --depth 1 --quiet "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
spin 'Ставлю зависимости' -- npm install --no-fund --no-audit --loglevel=error
spin 'Собираю сервер' -- npm run build
SMOKE_OUT="$(npm run smoke --silent </dev/null)" || die 'Сервер собрался, но smoke-тест не прошёл.'
ok "$SMOKE_OUT"

VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo '?')"
WIZARD_DONE="no"
if [ "${TGCLOUD_MCP_NO_WIZARD:-}" = "1" ]; then
  warn 'Мастер пропущен (TGCLOUD_MCP_NO_WIZARD=1). Позже: tgcloud-mcp setup'
elif [ "$TTY_OK" = "yes" ]; then
  printf '\n'
  say '  Мастер настройки: клиенты и Agent Plugin'
  if node scripts/setup.mjs < /dev/tty; then
    WIZARD_DONE="yes"
  else
    warn 'Мастер завершился с ошибкой — запустите позже: tgcloud-mcp setup'
  fi
else
  warn 'Нет интерактивного терминала. Позже: tgcloud-mcp setup'
fi

printf '\n'
printf '%s\n' "${C_BOLD}${C_GREEN}═══════════════════════════════════════════════════════════════${C_OFF}"
printf '%s\n' "${C_BOLD}${C_GREEN}  tgcloud-mcp v${VERSION} — установка завершена${C_OFF}"
printf '%s\n' "${C_BOLD}${C_GREEN}═══════════════════════════════════════════════════════════════${C_OFF}"
printf '\n'
printf '  Папка:     %s\n' "$INSTALL_DIR"
printf '  Сервер:    %s\n' "node $INSTALL_DIR/dist/index.js"
if [ "$WIZARD_DONE" = "yes" ]; then
  printf '  Настройка: выполнена мастером\n'
else
  printf '  Настройка: cd %s && node scripts/setup.mjs\n' "$INSTALL_DIR"
fi
printf '\n'
printf '  Обновление: той же командой curl | bash\n'
printf '  %sДокументация: %s/docs/SETUP.md%s\n' "$C_DIM" "$INSTALL_DIR" "$C_OFF"
printf '  %sПроблемы:     github.com/sdamarketing/tgcloud_mcp/issues%s\n\n' "$C_DIM" "$C_OFF"
