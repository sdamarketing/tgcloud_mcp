#!/usr/bin/env node
// E2E по stdio: initialize → tools/list → resources/list → resources/read →
// tools/call status на несуществующем каталоге (ожидаем контролируемую ошибку) →
// tools/call reset без confirm (ожидаем отказ guardrail).
import { spawn } from 'node:child_process';

const server = spawn('node', ['dist/index.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '';
const pending = new Map();
let nextId = 1;

server.stdout.on('data', (d) => {
  buffer += d.toString();
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch { /* не-JSON */ }
  }
});

function req(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout: ' + method)); } }, 15000);
  });
}
const call = (name, args) => req('tools/call', { name, arguments: args });

let failed = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`  ok  ${name}`);
  else { console.log(`FAIL  ${name} ${extra}`); failed++; }
};

const init = await req('initialize', {
  protocolVersion: '2025-03-26',
  capabilities: {},
  clientInfo: { name: 'e2e', version: '0.0.0' },
});
server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
check('initialize', init.result?.serverInfo?.name === 'tgcloud');

const tools = await req('tools/list');
check('tools/list = 14', (tools.result?.tools ?? []).length === 14);

const resources = await req('resources/list');
check('resources/list = 5', (resources.result?.resources ?? []).length === 5);

const doc = await req('resources/read', { uri: 'tgcloud://docs/cli' });
check('resources/read cli', doc.result?.contents?.[0]?.text?.includes('tgcloud run'));

const bad = await call('status', { project_dir: '/nonexistent/tgcloud-proj' });
check('status (нет каталога) → isError', bad.result?.isError === true ||
  (bad.error && true), JSON.stringify(bad).slice(0, 120));

const rel = await call('status', { project_dir: 'relative/path' });
const relText = rel.result?.content?.[0]?.text ?? '';
check('status (относительный путь) → отказ', relText.includes('абсолютным'));

const danger = await call('reset', { project_dir: '/tmp' });
check('reset без confirm → отказ', (danger.result?.content?.[0]?.text ?? '').includes('confirm=true'));

server.kill();
if (failed) { console.log(`\n${failed} проверок упало`); process.exit(1); }
console.log('\nE2E OK');
process.exit(0);
