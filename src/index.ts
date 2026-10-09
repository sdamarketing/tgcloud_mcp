#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { loadConfig } from './config.js';
import { TgcloudRunner } from './runner.js';
import { registerLifecycleTools } from './tools/lifecycle.js';
import { registerSyncTools } from './tools/sync.js';
import { registerDataTools } from './tools/data.js';
import { registerWebhookTools } from './tools/webhook.js';
import { registerDocResources } from './resources.js';

async function main() {
  const config = loadConfig();
  const runner = new TgcloudRunner(config);
  const server = new McpServer({
    name: 'tgcloud',
    version: JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version,
  });

  registerLifecycleTools(server, runner);
  registerSyncTools(server, runner);
  registerDataTools(server, runner);
  registerWebhookTools(server, runner);
  registerDocResources(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((cause) => {
  const message = cause instanceof Error ? cause.message : String(cause);
  process.stderr.write(`tgcloud-mcp failed to start: ${message}\n`);
  process.exit(1);
});
