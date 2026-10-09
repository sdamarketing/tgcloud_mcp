#!/usr/bin/env node
// Мастер настройки tgcloud-mcp: выбор MCP-клиента и запись конфига.
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = path.join(root, 'dist', 'index.js');

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

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

console.log('\nМастер настройки tgcloud-mcp\n');
console.log('Сервер: node ' + serverEntry + '\n');
console.log('Выберите клиенты для настройки (номера через запятую):');
CLIENTS.forEach((c, i) => console.log(`  ${i + 1}) ${c.name}  —  ${c.file}`));
console.log('  a) все\n');
const answer = (await ask('> ')).trim().toLowerCase();
rl.close();

let chosen = CLIENTS;
if (answer !== 'a' && answer !== 'all' && answer !== '') {
  const idx = answer.split(',').map((s) => parseInt(s.trim(), 10) - 1);
  chosen = idx.map((i) => CLIENTS[i]).filter(Boolean);
  if (!chosen.length) {
    console.log('Ничего не выбрано — выход.');
    process.exit(0);
  }
}

for (const c of chosen) applyClient(c);

console.log(`
Готово. Перезапустите клиента.

Полезное:
  tgcloud login неинтерактивно:  printf 'app...\\n' | TGCLOUD_ASSUME_TTY=1 npx tgcloud login
  CLI access token:              @BotFather → ваш бот → Serverless → CLI Access
  Переменные сервера:            TGCLOUD_CLI, TGCLOUD_CLI_ARGS, TGCLOUD_TIMEOUT_MS, TGCLOUD_TOKEN
  Подробно:                      docs/SETUP.md
`);
