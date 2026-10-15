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
#   TGCLOUD_MCP_LANG=en|ru|zh|ar|de|fr  — язык без вопроса (иначе меню)
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

# BANNER_INFO заполняется после выбора языка.
BANNER_INFO=()

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

# Ширина строки: иероглифы занимают две колонки. python3 есть не везде.
dispw() {
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$1" | python3 -c 'import sys,unicodedata
s=sys.stdin.read()
w=0
for ch in s:
    w += 2 if unicodedata.east_asian_width(ch) in ("W","F") else 1
print(w)'
    return
  fi
  printf '%s' "$1" | wc -m
}

# UI_LANG задаётся до баннера. Ключи — короткие, текст зависит от языка.
msg() {
  local key="$1"
  case "${UI_LANG}:${key}" in
    en:tagline) printf '%s' 'MCP server for Telegram serverless bots' ;;
    ru:tagline) printf '%s' 'MCP-сервер для serverless-ботов Telegram' ;;
    zh:tagline) printf '%s' 'Telegram 无服务器机器人的 MCP 服务器' ;;
    ar:tagline) printf '%s' 'خادم MCP لبوتات تيليغرام بلا خادم' ;;
    de:tagline) printf '%s' 'MCP-Server für serverlose Telegram-Bots' ;;
    fr:tagline) printf '%s' 'Serveur MCP pour les bots Telegram serverless' ;;

    en:author_label) printf '%s' 'Author' ;;
    ru:author_label) printf '%s' 'Автор' ;;
    zh:author_label) printf '%s' '作者' ;;
    ar:author_label) printf '%s' 'المؤلف' ;;
    de:author_label) printf '%s' 'Autor' ;;
    fr:author_label) printf '%s' 'Auteur' ;;

    en:sources_label) printf '%s' 'Source' ;;
    ru:sources_label) printf '%s' 'Исходники' ;;
    zh:sources_label) printf '%s' '源码' ;;
    ar:sources_label) printf '%s' 'المصدر' ;;
    de:sources_label) printf '%s' 'Quelltext' ;;
    fr:sources_label) printf '%s' 'Source' ;;

    en:installing_to) printf '%s' "Installing into ${INSTALL_DIR}" ;;
    ru:installing_to) printf '%s' "Устанавливаю в ${INSTALL_DIR}" ;;
    zh:installing_to) printf '%s' "正在安装到 ${INSTALL_DIR}" ;;
    ar:installing_to) printf '%s' "التثبيت في ${INSTALL_DIR}" ;;
    de:installing_to) printf '%s' "Installation nach ${INSTALL_DIR}" ;;
    fr:installing_to) printf '%s' "Installation dans ${INSTALL_DIR}" ;;

    en:no_home) printf '%s' 'HOME is not set — run this from a normal terminal.' ;;
    ru:no_home) printf '%s' 'Не задан HOME — запустите из обычного терминала.' ;;
    zh:no_home) printf '%s' '未设置 HOME — 请在普通终端中运行。' ;;
    ar:no_home) printf '%s' 'HOME غير معيّن — شغّل الأمر من طرفية عادية.' ;;
    de:no_home) printf '%s' 'HOME ist nicht gesetzt — in einem normalen Terminal starten.' ;;
    fr:no_home) printf '%s' 'HOME est absent — lancez ceci dans un terminal normal.' ;;

    en:need_git) printf '%s' 'git is required' ;;
    ru:need_git) printf '%s' 'Нужен git' ;;
    zh:need_git) printf '%s' '需要 git' ;;
    ar:need_git) printf '%s' 'يلزم git' ;;
    de:need_git) printf '%s' 'git wird benötigt' ;;
    fr:need_git) printf '%s' 'git est requis' ;;

    en:need_node) printf '%s' "Node.js >= ${NODE_MAJOR_MIN} is required. Install it: https://nodejs.org (or nvm)" ;;
    ru:need_node) printf '%s' "Нужен Node.js >= ${NODE_MAJOR_MIN}. Установите: https://nodejs.org (или nvm)" ;;
    zh:need_node) printf '%s' "需要 Node.js >= ${NODE_MAJOR_MIN}。请安装：https://nodejs.org（或 nvm）" ;;
    ar:need_node) printf '%s' "يلزم Node.js >= ${NODE_MAJOR_MIN}. ثبّته من https://nodejs.org (أو nvm)" ;;
    de:need_node) printf '%s' "Node.js >= ${NODE_MAJOR_MIN} wird benötigt. Installation: https://nodejs.org (oder nvm)" ;;
    fr:need_node) printf '%s' "Node.js >= ${NODE_MAJOR_MIN} est requis. Installez-le : https://nodejs.org (ou nvm)" ;;

    en:updating_existing) printf '%s' "Already installed: ${INSTALL_DIR} — updating" ;;
    ru:updating_existing) printf '%s' "Ранее установлен: ${INSTALL_DIR} — обновляю" ;;
    zh:updating_existing) printf '%s' "已安装于 ${INSTALL_DIR} — 正在更新" ;;
    ar:updating_existing) printf '%s' "مثبّت مسبقًا: ${INSTALL_DIR} — جارٍ التحديث" ;;
    de:updating_existing) printf '%s' "Bereits installiert: ${INSTALL_DIR} — Aktualisierung" ;;
    fr:updating_existing) printf '%s' "Déjà installé : ${INSTALL_DIR} — mise à jour" ;;

    en:updating_code) printf '%s' 'Updating code' ;;
    ru:updating_code) printf '%s' 'Обновляю код' ;;
    zh:updating_code) printf '%s' '正在更新代码' ;;
    ar:updating_code) printf '%s' 'تحديث الشفرة' ;;
    de:updating_code) printf '%s' 'Code wird aktualisiert' ;;
    fr:updating_code) printf '%s' 'Mise à jour du code' ;;

    en:code_updated) printf '%s' 'Code updated' ;;
    ru:code_updated) printf '%s' 'Код обновлён' ;;
    zh:code_updated) printf '%s' '代码已更新' ;;
    ar:code_updated) printf '%s' 'تم تحديث الشفرة' ;;
    de:code_updated) printf '%s' 'Code aktualisiert' ;;
    fr:code_updated) printf '%s' 'Code mis à jour' ;;

    en:dir_exists) printf '%s' "Folder ${INSTALL_DIR} exists and is not a checkout of this repo.
  Remove it or set TGCLOUD_MCP_INSTALL_DIR=~/tgcloud-mcp" ;;
    ru:dir_exists) printf '%s' "Папка ${INSTALL_DIR} уже есть и это не копия репозитория.
  Удалите её или задайте другую: TGCLOUD_MCP_INSTALL_DIR=~/tgcloud-mcp bash install.sh" ;;
    zh:dir_exists) printf '%s' "目录 ${INSTALL_DIR} 已存在，且不是本仓库的副本。
  请删除它，或设置 TGCLOUD_MCP_INSTALL_DIR=~/tgcloud-mcp" ;;
    ar:dir_exists) printf '%s' "المجلد ${INSTALL_DIR} موجود وليس نسخة من المستودع.
  احذفه أو عيّن TGCLOUD_MCP_INSTALL_DIR=~/tgcloud-mcp" ;;
    de:dir_exists) printf '%s' "Ordner ${INSTALL_DIR} existiert und ist kein Checkout dieses Repos.
  Löschen oder TGCLOUD_MCP_INSTALL_DIR=~/tgcloud-mcp setzen" ;;
    fr:dir_exists) printf '%s' "Le dossier ${INSTALL_DIR} existe et n'est pas une copie du dépôt.
  Supprimez-le ou définissez TGCLOUD_MCP_INSTALL_DIR=~/tgcloud-mcp" ;;

    en:cloning) printf '%s' "Downloading tgcloud-mcp into ${INSTALL_DIR}" ;;
    ru:cloning) printf '%s' "Скачиваю tgcloud-mcp в ${INSTALL_DIR}" ;;
    zh:cloning) printf '%s' "正在下载 tgcloud-mcp 到 ${INSTALL_DIR}" ;;
    ar:cloning) printf '%s' "تنزيل tgcloud-mcp إلى ${INSTALL_DIR}" ;;
    de:cloning) printf '%s' "tgcloud-mcp wird nach ${INSTALL_DIR} geladen" ;;
    fr:cloning) printf '%s' "Téléchargement de tgcloud-mcp dans ${INSTALL_DIR}" ;;

    en:installing_deps) printf '%s' 'Installing dependencies' ;;
    ru:installing_deps) printf '%s' 'Ставлю зависимости' ;;
    zh:installing_deps) printf '%s' '正在安装依赖' ;;
    ar:installing_deps) printf '%s' 'تثبيت الاعتماديات' ;;
    de:installing_deps) printf '%s' 'Abhängigkeiten werden installiert' ;;
    fr:installing_deps) printf '%s' 'Installation des dépendances' ;;

    en:building) printf '%s' 'Building the server' ;;
    ru:building) printf '%s' 'Собираю сервер' ;;
    zh:building) printf '%s' '正在构建服务器' ;;
    ar:building) printf '%s' 'بناء الخادم' ;;
    de:building) printf '%s' 'Server wird gebaut' ;;
    fr:building) printf '%s' 'Compilation du serveur' ;;

    en:smoke_failed) printf '%s' 'The server built, but the smoke test failed.' ;;
    ru:smoke_failed) printf '%s' 'Сервер собрался, но smoke-тест не прошёл.' ;;
    zh:smoke_failed) printf '%s' '服务器已构建，但 smoke 测试失败。' ;;
    ar:smoke_failed) printf '%s' 'بُني الخادم، لكن اختبار smoke فشل.' ;;
    de:smoke_failed) printf '%s' 'Der Server wurde gebaut, der Smoke-Test ist fehlgeschlagen.' ;;
    fr:smoke_failed) printf '%s' 'Le serveur est compilé, mais le test smoke a échoué.' ;;

    en:wizard_skipped) printf '%s' 'Wizard skipped (TGCLOUD_MCP_NO_WIZARD=1). Later: tgcloud-mcp setup' ;;
    ru:wizard_skipped) printf '%s' 'Мастер пропущен (TGCLOUD_MCP_NO_WIZARD=1). Позже: tgcloud-mcp setup' ;;
    zh:wizard_skipped) printf '%s' '已跳过向导（TGCLOUD_MCP_NO_WIZARD=1）。稍后：tgcloud-mcp setup' ;;
    ar:wizard_skipped) printf '%s' 'تم تخطي المعالج (TGCLOUD_MCP_NO_WIZARD=1). لاحقًا: tgcloud-mcp setup' ;;
    de:wizard_skipped) printf '%s' 'Assistent übersprungen (TGCLOUD_MCP_NO_WIZARD=1). Später: tgcloud-mcp setup' ;;
    fr:wizard_skipped) printf '%s' 'Assistant ignoré (TGCLOUD_MCP_NO_WIZARD=1). Plus tard : tgcloud-mcp setup' ;;

    en:wizard_title) printf '%s' 'Setup wizard: clients and the Agent Plugin' ;;
    ru:wizard_title) printf '%s' 'Мастер настройки: клиенты и Agent Plugin' ;;
    zh:wizard_title) printf '%s' '设置向导：客户端与 Agent Plugin' ;;
    ar:wizard_title) printf '%s' 'معالج الإعداد: العملاء وAgent Plugin' ;;
    de:wizard_title) printf '%s' 'Assistent: Clients und Agent Plugin' ;;
    fr:wizard_title) printf '%s' 'Assistant : clients et Agent Plugin' ;;

    en:wizard_failed) printf '%s' 'The wizard failed — run it later: tgcloud-mcp setup' ;;
    ru:wizard_failed) printf '%s' 'Мастер завершился с ошибкой — запустите позже: tgcloud-mcp setup' ;;
    zh:wizard_failed) printf '%s' '向导失败 — 请稍后运行：tgcloud-mcp setup' ;;
    ar:wizard_failed) printf '%s' 'فشل المعالج — شغّله لاحقًا: tgcloud-mcp setup' ;;
    de:wizard_failed) printf '%s' 'Der Assistent ist fehlgeschlagen — später: tgcloud-mcp setup' ;;
    fr:wizard_failed) printf '%s' "L'assistant a échoué — plus tard : tgcloud-mcp setup" ;;

    en:no_tty_wizard) printf '%s' 'No interactive terminal. Later: tgcloud-mcp setup' ;;
    ru:no_tty_wizard) printf '%s' 'Нет интерактивного терминала. Позже: tgcloud-mcp setup' ;;
    zh:no_tty_wizard) printf '%s' '没有交互式终端。稍后：tgcloud-mcp setup' ;;
    ar:no_tty_wizard) printf '%s' 'لا توجد طرفية تفاعلية. لاحقًا: tgcloud-mcp setup' ;;
    de:no_tty_wizard) printf '%s' 'Kein interaktives Terminal. Später: tgcloud-mcp setup' ;;
    fr:no_tty_wizard) printf '%s' 'Pas de terminal interactif. Plus tard : tgcloud-mcp setup' ;;

    en:done) printf '%s' 'installation complete' ;;
    ru:done) printf '%s' 'установка завершена' ;;
    zh:done) printf '%s' '安装完成' ;;
    ar:done) printf '%s' 'اكتمل التثبيت' ;;
    de:done) printf '%s' 'Installation abgeschlossen' ;;
    fr:done) printf '%s' 'installation terminée' ;;

    en:folder) printf '%s' 'Folder' ;;
    ru:folder) printf '%s' 'Папка' ;;
    zh:folder) printf '%s' '目录' ;;
    ar:folder) printf '%s' 'المجلد' ;;
    de:folder) printf '%s' 'Ordner' ;;
    fr:folder) printf '%s' 'Dossier' ;;

    en:server) printf '%s' 'Server' ;;
    ru:server) printf '%s' 'Сервер' ;;
    zh:server) printf '%s' '服务器' ;;
    ar:server) printf '%s' 'الخادم' ;;
    de:server) printf '%s' 'Server' ;;
    fr:server) printf '%s' 'Serveur' ;;

    en:configured) printf '%s' 'Setup: done by the wizard' ;;
    ru:configured) printf '%s' 'Настройка: выполнена мастером' ;;
    zh:configured) printf '%s' '设置：向导已完成' ;;
    ar:configured) printf '%s' 'الإعداد: أكمله المعالج' ;;
    de:configured) printf '%s' 'Einrichtung: vom Assistenten erledigt' ;;
    fr:configured) printf '%s' "Réglage : fait par l'assistant" ;;

    en:configure_later) printf '%s' 'Setup' ;;
    ru:configure_later) printf '%s' 'Настройка' ;;
    zh:configure_later) printf '%s' '设置' ;;
    ar:configure_later) printf '%s' 'الإعداد' ;;
    de:configure_later) printf '%s' 'Einrichtung' ;;
    fr:configure_later) printf '%s' 'Réglage' ;;

    en:update_hint) printf '%s' 'Update: run the same curl | bash command again' ;;
    ru:update_hint) printf '%s' 'Обновление: той же командой curl | bash' ;;
    zh:update_hint) printf '%s' '更新：再次运行同一条 curl | bash' ;;
    ar:update_hint) printf '%s' 'التحديث: نفس أمر curl | bash مرة أخرى' ;;
    de:update_hint) printf '%s' 'Aktualisieren: denselben curl | bash-Befehl erneut ausführen' ;;
    fr:update_hint) printf '%s' 'Mise à jour : relancer la même commande curl | bash' ;;

    en:docs) printf '%s' 'Documentation' ;;
    ru:docs) printf '%s' 'Документация' ;;
    zh:docs) printf '%s' '文档' ;;
    ar:docs) printf '%s' 'التوثيق' ;;
    de:docs) printf '%s' 'Dokumentation' ;;
    fr:docs) printf '%s' 'Documentation' ;;

    en:issues) printf '%s' 'Issues' ;;
    ru:issues) printf '%s' 'Проблемы' ;;
    zh:issues) printf '%s' '问题' ;;
    ar:issues) printf '%s' 'المشكلات' ;;
    de:issues) printf '%s' 'Probleme' ;;
    fr:issues) printf '%s' 'Problèmes' ;;

    *) printf '%s' "$key" ;;
  esac
}

normalize_lang() {
  local raw
  raw=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  case "$raw" in
    en*|english) printf en ;;
    ru*|russian|рус*) printf ru ;;
    zh*|chinese|cn|中文) printf zh ;;
    ar*|arabic|العربية) printf ar ;;
    de*|german|deutsch) printf de ;;
    fr*|french|français|francais) printf fr ;;
    *) printf '' ;;
  esac
}

guess_lang() {
  local loc="${LANGUAGE:-${LC_ALL:-${LANG:-en}}}"
  local g
  g=$(normalize_lang "$loc")
  if [ -n "$g" ]; then printf '%s' "$g"; else printf en; fi
}

choose_lang() {
  if [ -n "${TGCLOUD_MCP_LANG:-}" ]; then
    UI_LANG=$(normalize_lang "$TGCLOUD_MCP_LANG")
    if [ -z "$UI_LANG" ]; then UI_LANG=en; fi
    return
  fi
  if [ "$TTY_OK" != "yes" ] || [ "${TGCLOUD_MCP_BANNER_ONLY:-}" = "1" ]; then
    UI_LANG=$(guess_lang)
    return
  fi
  local answer
  printf '\n'
  printf '  %sLanguage / Язык / 语言 / Sprache / Langue%s\n\n' "$C_BOLD" "$C_OFF"
  printf '    1) English\n'
  printf '    2) Русский\n'
  printf '    3) 中文\n'
  printf '    4) العربية\n'
  printf '    5) Deutsch\n'
  printf '    6) Français\n\n'
  printf '  %sEnter = English%s\n\n' "$C_DIM" "$C_OFF"
  while :; do
    printf '  > '
    if ! IFS= read -r answer < /dev/tty; then
      UI_LANG=en
      return
    fi
    case "$(printf '%s' "$answer" | tr '[:upper:]' '[:lower:]')" in
      ''|1|en|english) UI_LANG=en; return ;;
      2|ru|russian|рус*) UI_LANG=ru; return ;;
      3|zh|chinese|cn|中文) UI_LANG=zh; return ;;
      4|ar|arabic|العربية) UI_LANG=ar; return ;;
      5|de|german|deutsch) UI_LANG=de; return ;;
      6|fr|french|français|francais) UI_LANG=fr; return ;;
      *) printf '  1–6\n' ;;
    esac
  done
}

choose_lang
export TGCLOUD_MCP_LANG="$UI_LANG"
BANNER_INFO=(
  "$(msg tagline)"
  "$(msg author_label): ${AUTHOR}"
  "$(msg sources_label): ${REPO_PUBLIC_URL}"
)

banner

if [ "${TGCLOUD_MCP_BANNER_ONLY:-}" = "1" ]; then
  exit 0
fi

say "  $(msg installing_to)"
printf '\n'

[ -n "${HOME:-}" ] || die "$(msg no_home)"
command -v git >/dev/null 2>&1 || die "$(msg need_git)"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt "$NODE_MAJOR_MIN" ]; then
  die "$(msg need_node)"
fi
ok "node $(node -v)"

if [ -d "$INSTALL_DIR/.git" ]; then
  say "  $(msg updating_existing)"
  spin "$(msg updating_code)" -- git -C "$INSTALL_DIR" fetch --quiet origin
  git -C "$INSTALL_DIR" reset --hard origin/main --quiet
  ok "$(msg code_updated)"
elif [ -e "$INSTALL_DIR" ]; then
  die "$(msg dir_exists)"
else
  spin "$(msg cloning)" -- git clone --depth 1 --quiet "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
spin "$(msg installing_deps)" -- npm install --no-fund --no-audit --loglevel=error
spin "$(msg building)" -- npm run build
SMOKE_OUT="$(npm run smoke --silent </dev/null)" || die "$(msg smoke_failed)"
ok "$SMOKE_OUT"

VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo '?')"
WIZARD_DONE="no"
if [ "${TGCLOUD_MCP_NO_WIZARD:-}" = "1" ]; then
  warn "$(msg wizard_skipped)"
elif [ "$TTY_OK" = "yes" ]; then
  printf '\n'
  say "  $(msg wizard_title)"
  if TGCLOUD_MCP_LANG="$UI_LANG" node scripts/setup.mjs < /dev/tty; then
    WIZARD_DONE="yes"
  else
    warn "$(msg wizard_failed)"
  fi
else
  warn "$(msg no_tty_wizard)"
fi

printf '\n'
printf '%s\n' "${C_BOLD}${C_GREEN}═══════════════════════════════════════════════════════════════${C_OFF}"
printf '%s\n' "${C_BOLD}${C_GREEN}  tgcloud-mcp v${VERSION} — $(msg done)${C_OFF}"
printf '%s\n' "${C_BOLD}${C_GREEN}═══════════════════════════════════════════════════════════════${C_OFF}"
printf '\n'
printf '  %s:  %s\n' "$(msg folder)" "$INSTALL_DIR"
printf '  %s:  %s\n' "$(msg server)" "node $INSTALL_DIR/dist/index.js"
if [ "$WIZARD_DONE" = "yes" ]; then
  printf '  %s\n' "$(msg configured)"
else
  printf '  %s: cd %s && node scripts/setup.mjs\n' "$(msg configure_later)" "$INSTALL_DIR"
fi
printf '\n'
printf '  %s\n' "$(msg update_hint)"
printf '  %s%s: %s/docs/SETUP.md%s\n' "$C_DIM" "$(msg docs)" "$INSTALL_DIR" "$C_OFF"
printf '  %s%s: github.com/sdamarketing/tgcloud_mcp/issues%s\n\n' "$C_DIM" "$(msg issues)" "$C_OFF"
