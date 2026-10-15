#!/usr/bin/env node
// Без аргументов — MCP-сервер по stdin (так его запускает клиент).
// tgcloud-mcp setup|update|links — команды для человека в терминале.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cmd = process.argv[2];

const scripts = {
  setup: 'scripts/setup.mjs',
  update: 'scripts/self-update.mjs',
  links: 'scripts/generate-install-links.mjs',
};

function help() {
  console.log(`tgcloud-mcp — MCP-сервер для serverless-ботов Telegram

  tgcloud-mcp           сервер stdio (его запускает клиент, не терминал)
  tgcloud-mcp setup     мастер: конфиг MCP и Agent Plugin
  tgcloud-mcp update    обновить git-установку
  tgcloud-mcp links     готовые фрагменты конфигов
`);
}

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  help();
  process.exit(0);
}

if (cmd && Object.hasOwn(scripts, cmd)) {
  const child = spawn(process.execPath, [path.join(root, scripts[cmd]), ...process.argv.slice(3)], {
    stdio: 'inherit',
    cwd: root,
  });
  child.on('error', (err) => {
    console.error(err.message);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
} else if (cmd) {
  console.error(`Неизвестная команда: ${cmd}\n`);
  help();
  process.exit(1);
} else if (process.stdin.isTTY) {
  help();
  console.error('В терминале сервер молчит: он ждёт JSON-RPC на stdin. Для настройки: tgcloud-mcp setup');
  process.exit(0);
} else {
  await import('../dist/index.js');
}
