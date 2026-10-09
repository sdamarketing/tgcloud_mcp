#!/usr/bin/env node
// Печатает готовые конфиги клиентов для ручного копирования.
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'dist', 'index.js');
const npmCmd = { command: 'npx', args: ['-y', 'tgcloud-mcp'] };

const configs = {
  'opencode (~/.config/opencode/opencode.json)': {
    mcp: { tgcloud: { type: 'local', command: ['npx', '-y', 'tgcloud-mcp'], enabled: true } },
  },
  'Claude Code (~/.claude.json) / Cursor (~/.cursor/mcp.json)': {
    mcpServers: { tgcloud: npmCmd },
  },
  'VS Code (mcp.json)': {
    servers: { tgcloud: { type: 'stdio', ...npmCmd } },
  },
};

console.log('Установка из npm, без клонирования — фрагменты конфигов:\n');
for (const [name, cfg] of Object.entries(configs)) {
  console.log(`# ${name}`);
  console.log(JSON.stringify(cfg, null, 2) + '\n');
}
console.log(`Локальная сборка: замените значение на node + ${entry}`);
