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
    console.log(`  ✔ ${client.name}: уже настроен`);
    return;
  }
  mkdirSync(path.dirname(client.file), { recursive: true });
  if (existsSync(client.file)) copyFileSync(client.file, client.file + '.bak');
  writeFileSync(client.file, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`  ✔ ${client.name}: записано в ${client.file} (бэкап .bak)`);
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
    console.log('  ! agent-plugin/plugin.json не найден — плагин пропущен');
    return;
  }
  const dest = path.join(os.homedir(), '.tgcloud-mcp', 'agent-plugin');
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(pluginSrc, dest, { recursive: true });
  console.log(`  ✔ Agent Plugin скопирован в ${dest}`);

  const keys = new Set(chosen.map((c) => c.key));
  if (keys.has('cursor')) {
    const local = path.join(os.homedir(), '.cursor', 'plugins', 'local', 'tgcloud');
    rmSync(local, { recursive: true, force: true });
    mkdirSync(path.dirname(local), { recursive: true });
    cpSync(dest, local, { recursive: true });
    console.log(`  ✔ Cursor: локальный плагин ${local}`);
  }
  if (keys.has('vscode')) {
    wireVSCode(dest);
  }
  console.log(`
  Плагин (plugin.json + mcp.json + skill) читают Codex, Cursor, Copilot, Kiro, VS Code.
  Claude Code и opencode по-прежнему берут MCP-конфиг выше и скилл:
    npx skills add sdamarketing/tgcloud_mcp
  Каталог для ручной установки: ${dest}
`);
}

function wireVSCode(dest) {
  const settingsPath = vscodeSettingsPath();
  let cfg;
  try {
    cfg = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, 'utf8')) : {};
  } catch {
    console.log('  ! VS Code settings.json не строгий JSON — добавьте вручную:');
    console.log(`    "chat.pluginLocations": { ${JSON.stringify(dest)}: true }`);
    return;
  }
  cfg['chat.pluginLocations'] ??= {};
  if (cfg['chat.pluginLocations'][dest] === true) {
    console.log('  ✔ VS Code: chat.pluginLocations уже указывает на плагин');
    return;
  }
  cfg['chat.pluginLocations'][dest] = true;
  mkdirSync(path.dirname(settingsPath), { recursive: true });
  if (existsSync(settingsPath)) copyFileSync(settingsPath, settingsPath + '.bak');
  writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`  ✔ VS Code: chat.pluginLocations → ${dest}`);
  console.log('    Если плагины выключены: "chat.plugins.enabled": true');
}

if (!process.stdin.isTTY) {
  console.error('Мастер настройки нужен в терминале. Запустите: tgcloud-mcp setup');
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

console.log('\nМастер настройки tgcloud-mcp\n');
console.log('Сервер: node ' + serverEntry + '\n');
console.log('Выберите клиенты для настройки (номера через запятую):');
CLIENTS.forEach((c, i) => console.log(`  ${i + 1}) ${c.name}  —  ${c.file}`));
console.log('  a) все\n');
const answer = (await ask('> ')).trim().toLowerCase();

let chosen = CLIENTS;
if (answer !== 'a' && answer !== 'all' && answer !== '') {
  const idx = answer.split(',').map((s) => parseInt(s.trim(), 10) - 1);
  chosen = idx.map((i) => CLIENTS[i]).filter(Boolean);
  if (!chosen.length) {
    console.log('Ничего не выбрано — выход.');
    rl.close();
    process.exit(0);
  }
}

for (const c of chosen) applyClient(c);

const pluginAnswer = (await ask('\nУстановить Agent Plugin (скилл + MCP) для Cursor/VS Code? [Y/n] ')).trim().toLowerCase();
rl.close();
if (pluginAnswer !== 'n' && pluginAnswer !== 'no') installPlugin(chosen);

console.log(`
Готово. Перезапустите клиента.

Полезное:
  tgcloud login неинтерактивно:  printf 'app...\\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
  CLI access token:              @BotFather → ваш бот → Serverless → CLI Access
  Переменные сервера:            TGCLOUD_CLI, TGCLOUD_CLI_ARGS, TGCLOUD_TIMEOUT_MS, TGCLOUD_TOKEN
  Подробно:                      docs/SETUP.md
`);
