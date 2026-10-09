#!/usr/bin/env node
// Smoke-тест: поднимает сервер по stdio и проверяет initialize, tools/list, resources/list.
import { spawn } from 'node:child_process';

const server = spawn('node', ['dist/index.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '';
const pending = new Map();
let nextId = 1;
let stderr = '';

server.stdout.on('data', (d) => {
  buffer += d.toString();
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});
server.stderr.on('data', (d) => { stderr += d.toString(); });

function request(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)); } }, 10000);
  });
}

function notify(method, params = {}) {
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  if (stderr) console.error(`server stderr: ${stderr}`);
  server.kill();
  process.exit(1);
}

const init = await request('initialize', {
  protocolVersion: '2025-03-26',
  capabilities: {},
  clientInfo: { name: 'smoke-test', version: '0.0.0' },
});
if (!init.result?.serverInfo) fail('initialize вернул пустой serverInfo');

notify('notifications/initialized');

const tools = await request('tools/list');
const toolNames = (tools.result?.tools ?? []).map((t) => t.name);
const expectedTools = [
  'create_project', 'init_project', 'login_bot', 'add_module',
  'status', 'diff', 'push', 'pull', 'fetch', 'reset',
  'run_handler', 'migrate', 'webhook_status', 'webhook_sync',
];
const missing = expectedTools.filter((n) => !toolNames.includes(n));
if (missing.length) fail(`нет инструментов: ${missing.join(', ')}`);

const resources = await request('resources/list');
const resourceUris = (resources.result?.resources ?? []).map((r) => r.uri);
if (resourceUris.length < 5) fail(`ожидалось >=5 ресурсов, получено ${resourceUris.length}`);

console.log(`OK: server "${init.result.serverInfo.name}" v${init.result.serverInfo.version}, ` +
  `${toolNames.length} tools, ${resourceUris.length} resources listed`);
server.kill();
process.exit(0);
