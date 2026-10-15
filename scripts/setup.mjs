#!/usr/bin/env node
// Мастер настройки tgcloud-mcp: MCP-клиент и установка Agent Plugin.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = path.join(root, 'dist', 'index.js');
const pluginSrc = path.join(root, 'agent-plugin');

const CLIENTS = [
  { key: 'opencode', name: 'opencode', file: path.join(os.homedir(), '.config', 'opencode', 'opencode.json'), style: 'opencode' },
  { key: 'claude-code', name: 'Claude Code', file: path.join(os.homedir(), '.claude.json'), style: 'mcpServers' },
  { key: 'cursor', name: 'Cursor', file: path.join(os.homedir(), '.cursor', 'mcp.json'), style: 'mcpServers' },
  { key: 'vscode', name: 'VS Code (Copilot)', file: path.join(os.homedir(), '.config', 'Code', 'User', 'mcp.json'), style: 'vscode' },
];

function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; }
}

function serverConfig(style) {
  const cmd = ['node', serverEntry];
  switch (style) {
    case 'opencode':
      return { type: 'local', command: cmd, enabled: true };
    case 'vscode':
      return { type: 'stdio', command: cmd[0], args: cmd.slice(1) };
    default:
      return { command: cmd[0], args: cmd.slice(1) };
  }
}

function applyClient(client) {
  const cfg = readJson(client.file);
  const before = JSON.stringify(cfg);
  if (client.style === 'opencode') {
    cfg.mcp ??= {};
    cfg.mcp.tgcloud = serverConfig('opencode');
  } else if (client.style === 'vscode') {
    cfg.servers ??= {};
    cfg.servers.tgcloud = serverConfig('vscode');
  } else {
    cfg.mcpServers ??= {};
    cfg.mcpServers.tgcloud = serverConfig('mcpServers');
  }
  if (JSON.stringify(cfg) === before) {
    console.log(`  ✔ ${t('already', { name: client.name })}`);
    return;
  }
  mkdirSync(path.dirname(client.file), { recursive: true });
  if (existsSync(client.file)) copyFileSync(client.file, client.file + '.bak');
  writeFileSync(client.file, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`  ✔ ${t('wrote', { name: client.name, file: client.file })}`);
}

function vscodeSettingsPath() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json');
  }
  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'settings.json');
  }
  return path.join(os.homedir(), '.config', 'Code', 'User', 'settings.json');
}

/** Copies agent-plugin/ to a stable user path and wires clients that can load it. */
function installPlugin(chosen) {
  if (!existsSync(path.join(pluginSrc, 'plugin.json'))) {
    console.log(`  ! ${t('plugin_missing')}`);
    return;
  }
  const dest = path.join(os.homedir(), '.tgcloud-mcp', 'agent-plugin');
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(pluginSrc, dest, { recursive: true });
  console.log(`  ✔ ${t('plugin_copied', { dest })}`);

  const keys = new Set(chosen.map((c) => c.key));
  if (keys.has('cursor')) {
    const local = path.join(os.homedir(), '.cursor', 'plugins', 'local', 'tgcloud');
    rmSync(local, { recursive: true, force: true });
    mkdirSync(path.dirname(local), { recursive: true });
    cpSync(dest, local, { recursive: true });
    console.log(`  ✔ ${t('cursor_local', { path: local })}`);
  }
  if (keys.has('vscode')) {
    wireVSCode(dest);
  }
  console.log(`\n${t('plugin_blurb', { dest })}\n`);
}

function wireVSCode(dest) {
  const settingsPath = vscodeSettingsPath();
  let cfg;
  try {
    cfg = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, 'utf8')) : {};
  } catch {
    console.log(`  ! ${t('vscode_jsonc')}`);
    console.log(`    "chat.pluginLocations": { ${JSON.stringify(dest)}: true }`);
    return;
  }
  cfg['chat.pluginLocations'] ??= {};
  if (cfg['chat.pluginLocations'][dest] === true) {
    console.log(`  ✔ ${t('vscode_already')}`);
    return;
  }
  cfg['chat.pluginLocations'][dest] = true;
  mkdirSync(path.dirname(settingsPath), { recursive: true });
  if (existsSync(settingsPath)) copyFileSync(settingsPath, settingsPath + '.bak');
  writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`  ✔ ${t('vscode_set', { dest })}`);
  console.log(`    ${t('vscode_hint')}`);
}

const MESSAGES = {
  en: {
    need_tty: 'The setup wizard needs a terminal. Run: tgcloud-mcp setup',
    title: 'tgcloud-mcp setup',
    server: 'Server',
    pick: 'Choose clients (numbers separated by commas, empty = all):',
    all: 'all',
    none: 'Nothing selected — exiting.',
    already: '{name}: already configured',
    wrote: '{name}: written to {file} (backup .bak)',
    plugin_missing: 'agent-plugin/plugin.json was not found — plugin skipped',
    plugin_copied: 'Agent Plugin copied to {dest}',
    cursor_local: 'Cursor: local plugin {path}',
    vscode_jsonc: 'VS Code settings.json is not strict JSON — add this by hand:',
    vscode_already: 'VS Code: chat.pluginLocations already points at the plugin',
    vscode_set: 'VS Code: chat.pluginLocations → {dest}',
    vscode_hint: 'If plugins are off: "chat.plugins.enabled": true',
    plugin_blurb: `  Codex, Cursor, Copilot, Kiro, and VS Code read the plugin (plugin.json + mcp.json + skill).
  Claude Code and opencode keep the MCP config above, plus the skill:
    npx skills add sdamarketing/tgcloud_mcp
  Folder for a manual install: {dest}`,
    plugin_ask: 'Install the Agent Plugin (skill + MCP) for Cursor/VS Code? [Y/n] ',
    done: `Done. Restart the client.

Useful:
  tgcloud login, noninteractive:  printf 'app...\\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
  CLI access token:               @BotFather → your bot → Serverless → CLI Access
  Server variables:               TGCLOUD_CLI, TGCLOUD_CLI_ARGS, TGCLOUD_TIMEOUT_MS, TGCLOUD_TOKEN
  Details:                        docs/SETUP.md`,
  },
  ru: {
    need_tty: 'Мастер настройки нужен в терминале. Запустите: tgcloud-mcp setup',
    title: 'Мастер настройки tgcloud-mcp',
    server: 'Сервер',
    pick: 'Выберите клиенты (номера через запятую, пусто = все):',
    all: 'все',
    none: 'Ничего не выбрано — выход.',
    already: '{name}: уже настроен',
    wrote: '{name}: записано в {file} (бэкап .bak)',
    plugin_missing: 'agent-plugin/plugin.json не найден — плагин пропущен',
    plugin_copied: 'Agent Plugin скопирован в {dest}',
    cursor_local: 'Cursor: локальный плагин {path}',
    vscode_jsonc: 'VS Code settings.json не строгий JSON — добавьте вручную:',
    vscode_already: 'VS Code: chat.pluginLocations уже указывает на плагин',
    vscode_set: 'VS Code: chat.pluginLocations → {dest}',
    vscode_hint: 'Если плагины выключены: "chat.plugins.enabled": true',
    plugin_blurb: `  Плагин (plugin.json + mcp.json + skill) читают Codex, Cursor, Copilot, Kiro, VS Code.
  Claude Code и opencode по-прежнему берут MCP-конфиг выше и скилл:
    npx skills add sdamarketing/tgcloud_mcp
  Каталог для ручной установки: {dest}`,
    plugin_ask: 'Установить Agent Plugin (скилл + MCP) для Cursor/VS Code? [Y/n] ',
    done: `Готово. Перезапустите клиента.

Полезное:
  tgcloud login неинтерактивно:  printf 'app...\\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
  CLI access token:              @BotFather → ваш бот → Serverless → CLI Access
  Переменные сервера:            TGCLOUD_CLI, TGCLOUD_CLI_ARGS, TGCLOUD_TIMEOUT_MS, TGCLOUD_TOKEN
  Подробно:                      docs/SETUP.md`,
  },
  zh: {
    need_tty: '设置向导需要终端。请运行：tgcloud-mcp setup',
    title: 'tgcloud-mcp 设置向导',
    server: '服务器',
    pick: '选择要配置的客户端（逗号分隔的编号，留空 = 全部）：',
    all: '全部',
    none: '未选择任何客户端 — 退出。',
    already: '{name}：已经配置好',
    wrote: '{name}：已写入 {file}（备份 .bak）',
    plugin_missing: '未找到 agent-plugin/plugin.json — 已跳过插件',
    plugin_copied: 'Agent Plugin 已复制到 {dest}',
    cursor_local: 'Cursor：本地插件 {path}',
    vscode_jsonc: 'VS Code 的 settings.json 不是严格 JSON — 请手动加入：',
    vscode_already: 'VS Code：chat.pluginLocations 已指向该插件',
    vscode_set: 'VS Code：chat.pluginLocations → {dest}',
    vscode_hint: '若插件被关闭："chat.plugins.enabled": true',
    plugin_blurb: `  Codex、Cursor、Copilot、Kiro、VS Code 读取该插件（plugin.json + mcp.json + skill）。
  Claude Code 和 opencode 仍使用上面的 MCP 配置，外加 skill：
    npx skills add sdamarketing/tgcloud_mcp
  手动安装目录：{dest}`,
    plugin_ask: '为 Cursor/VS Code 安装 Agent Plugin（skill + MCP）？[Y/n] ',
    done: `完成。请重启客户端。

参考：
  非交互 tgcloud login：  printf 'app...\\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
  CLI access token：       @BotFather → 你的机器人 → Serverless → CLI Access
  服务器变量：             TGCLOUD_CLI、TGCLOUD_CLI_ARGS、TGCLOUD_TIMEOUT_MS、TGCLOUD_TOKEN
  详情：                   docs/SETUP.md`,
  },
  ar: {
    need_tty: 'معالج الإعداد يحتاج طرفية. شغّل: tgcloud-mcp setup',
    title: 'معالج إعداد tgcloud-mcp',
    server: 'الخادم',
    pick: 'اختر العملاء (أرقام مفصولة بفواصل، الفراغ = الكل):',
    all: 'الكل',
    none: 'لم يُختر شيء — خروج.',
    already: '{name}: مُعدّ مسبقًا',
    wrote: '{name}: كُتب في {file} (نسخة .bak)',
    plugin_missing: 'agent-plugin/plugin.json غير موجود — تم تخطي الإضافة',
    plugin_copied: 'نُسخ Agent Plugin إلى {dest}',
    cursor_local: 'Cursor: إضافة محلية {path}',
    vscode_jsonc: 'settings.json في VS Code ليس JSON صارمًا — أضف هذا يدويًا:',
    vscode_already: 'VS Code: chat.pluginLocations يشير إلى الإضافة مسبقًا',
    vscode_set: 'VS Code: chat.pluginLocations → {dest}',
    vscode_hint: 'إن كانت الإضافات متوقفة: "chat.plugins.enabled": true',
    plugin_blurb: `  تقرأ Codex وCursor وCopilot وKiro وVS Code الإضافة (plugin.json + mcp.json + skill).
  يبقى Claude Code وopencode على إعداد MCP أعلاه مع المهارة:
    npx skills add sdamarketing/tgcloud_mcp
  مجلد التثبيت اليدوي: {dest}`,
    plugin_ask: 'تثبيت Agent Plugin (المهارة + MCP) لـ Cursor/VS Code؟ [Y/n] ',
    done: `تم. أعد تشغيل العميل.

مفيد:
  tgcloud login دون تفاعل:  printf 'app...\\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
  CLI access token:          @BotFather → بوتك → Serverless → CLI Access
  متغيرات الخادم:            TGCLOUD_CLI وTGCLOUD_CLI_ARGS وTGCLOUD_TIMEOUT_MS وTGCLOUD_TOKEN
  التفاصيل:                  docs/SETUP.md`,
  },
  de: {
    need_tty: 'Der Assistent braucht ein Terminal. Starten: tgcloud-mcp setup',
    title: 'tgcloud-mcp einrichten',
    server: 'Server',
    pick: 'Clients wählen (Nummern mit Komma, leer = alle):',
    all: 'alle',
    none: 'Nichts gewählt — Ende.',
    already: '{name}: bereits eingerichtet',
    wrote: '{name}: geschrieben nach {file} (Backup .bak)',
    plugin_missing: 'agent-plugin/plugin.json fehlt — Plugin übersprungen',
    plugin_copied: 'Agent Plugin kopiert nach {dest}',
    cursor_local: 'Cursor: lokales Plugin {path}',
    vscode_jsonc: 'VS Code settings.json ist kein striktes JSON — von Hand ergänzen:',
    vscode_already: 'VS Code: chat.pluginLocations zeigt schon auf das Plugin',
    vscode_set: 'VS Code: chat.pluginLocations → {dest}',
    vscode_hint: 'Falls Plugins aus sind: "chat.plugins.enabled": true',
    plugin_blurb: `  Codex, Cursor, Copilot, Kiro und VS Code lesen das Plugin (plugin.json + mcp.json + skill).
  Claude Code und opencode behalten die MCP-Konfiguration oben und den Skill:
    npx skills add sdamarketing/tgcloud_mcp
  Ordner für eine manuelle Installation: {dest}`,
    plugin_ask: 'Agent Plugin (Skill + MCP) für Cursor/VS Code installieren? [Y/n] ',
    done: `Fertig. Client neu starten.

Nützlich:
  tgcloud login ohne Dialog:  printf 'app...\\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
  CLI access token:            @BotFather → Ihr Bot → Serverless → CLI Access
  Server-Variablen:            TGCLOUD_CLI, TGCLOUD_CLI_ARGS, TGCLOUD_TIMEOUT_MS, TGCLOUD_TOKEN
  Details:                     docs/SETUP.md`,
  },
  fr: {
    need_tty: "L'assistant a besoin d'un terminal. Lancez : tgcloud-mcp setup",
    title: 'Assistant tgcloud-mcp',
    server: 'Serveur',
    pick: 'Choisissez les clients (numéros séparés par des virgules, vide = tous) :',
    all: 'tous',
    none: 'Rien de choisi — arrêt.',
    already: '{name} : déjà configuré',
    wrote: '{name} : écrit dans {file} (sauvegarde .bak)',
    plugin_missing: 'agent-plugin/plugin.json est absent — plugin ignoré',
    plugin_copied: 'Agent Plugin copié dans {dest}',
    cursor_local: 'Cursor : plugin local {path}',
    vscode_jsonc: "settings.json de VS Code n'est pas du JSON strict — ajoutez ceci à la main :",
    vscode_already: "VS Code : chat.pluginLocations pointe déjà vers le plugin",
    vscode_set: 'VS Code : chat.pluginLocations → {dest}',
    vscode_hint: 'Si les plugins sont désactivés : "chat.plugins.enabled": true',
    plugin_blurb: `  Codex, Cursor, Copilot, Kiro et VS Code lisent le plugin (plugin.json + mcp.json + skill).
  Claude Code et opencode gardent la config MCP ci-dessus et le skill :
    npx skills add sdamarketing/tgcloud_mcp
  Dossier pour une installation manuelle : {dest}`,
    plugin_ask: "Installer l'Agent Plugin (skill + MCP) pour Cursor/VS Code ? [Y/n] ",
    done: `Terminé. Redémarrez le client.

Utile :
  tgcloud login sans dialogue :  printf 'app...\\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
  CLI access token :              @BotFather → votre bot → Serverless → CLI Access
  Variables du serveur :          TGCLOUD_CLI, TGCLOUD_CLI_ARGS, TGCLOUD_TIMEOUT_MS, TGCLOUD_TOKEN
  Détails :                       docs/SETUP.md`,
  },
};

function normalizeLang(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s.startsWith('en') || s === 'english') return 'en';
  if (s.startsWith('ru') || s.startsWith('рус')) return 'ru';
  if (s.startsWith('zh') || s === 'cn' || s === '中文') return 'zh';
  if (s.startsWith('ar') || s === 'العربية') return 'ar';
  if (s.startsWith('de') || s === 'deutsch' || s === 'german') return 'de';
  if (s.startsWith('fr') || s.startsWith('franç') || s === 'francais' || s === 'french') return 'fr';
  return null;
}

let lang = normalizeLang(process.env.TGCLOUD_MCP_LANG) ?? 'en';
const t = (key, vars = {}) => {
  const pack = MESSAGES[lang] ?? MESSAGES.en;
  let s = pack[key] ?? MESSAGES.en[key] ?? key;
  for (const [name, value] of Object.entries(vars)) s = s.replaceAll(`{${name}}`, value);
  return s;
};
const isNo = (s) => ['n', 'no', 'нет', 'н', 'nein', 'non', '否', 'لا'].includes(s);
const isAll = (s) => ['', 'a', 'all', 'все', '全部', 'الكل', 'alle', 'tous'].includes(s);

if (!process.stdin.isTTY) {
  console.error(t('need_tty'));
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

if (!normalizeLang(process.env.TGCLOUD_MCP_LANG)) {
  console.log('\n  Language / Язык / 语言 / Sprache / Langue\n');
  console.log('    1) English');
  console.log('    2) Русский');
  console.log('    3) 中文');
  console.log('    4) العربية');
  console.log('    5) Deutsch');
  console.log('    6) Français\n');
  console.log('  Enter = English\n');
  while (true) {
    const pick = (await ask('  > ')).trim().toLowerCase();
    const chosenLang = pick === '' || pick === '1' ? 'en' : normalizeLang(pick) ?? (pick === '2' ? 'ru' : pick === '3' ? 'zh' : pick === '4' ? 'ar' : pick === '5' ? 'de' : pick === '6' ? 'fr' : null);
    if (chosenLang) { lang = chosenLang; break; }
    console.log('  1–6');
  }
}

console.log(`\n${t('title')}\n`);
console.log(`${t('server')}: node ${serverEntry}\n`);
console.log(t('pick'));
CLIENTS.forEach((c, i) => console.log(`  ${i + 1}) ${c.name}  —  ${c.file}`));
console.log(`  a) ${t('all')}\n`);
const answer = (await ask('> ')).trim().toLowerCase();

let chosen = CLIENTS;
if (!isAll(answer)) {
  const idx = answer.split(',').map((s) => parseInt(s.trim(), 10) - 1);
  chosen = idx.map((i) => CLIENTS[i]).filter(Boolean);
  if (!chosen.length) {
    console.log(t('none'));
    rl.close();
    process.exit(0);
  }
}

for (const c of chosen) applyClient(c);

const pluginAnswer = (await ask(`\n${t('plugin_ask')}`)).trim().toLowerCase();
rl.close();
if (!isNo(pluginAnswer)) installPlugin(chosen);

console.log(`\n${t('done')}\n`);
