import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/server';

const DOCS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'resources', 'docs');

const DOCS: Array<{ name: string; uri: string; title: string; file: string; description: string }> = [
  {
    name: 'tgcloud-project-structure',
    uri: 'tgcloud://docs/project-structure',
    title: 'tgcloud project layout and import rules',
    file: 'project-structure.md',
    description:
      'tgcloud/ handlers, endpoints, lib, schema.js, tgcloud.jsonc. Project imports are relative paths WITH a .js extension. SDK imports are bare (sdk, sdk/db).',
  },
  {
    name: 'tgcloud-cli',
    uri: 'tgcloud://docs/cli',
    title: 'tgcloud CLI reference',
    file: 'cli.md',
    description:
      'init, login, add, run, status, diff, push, pull, fetch, reset, migrate (--dry-run/--safe/--yes/--local), webhook, upgrade, completion',
  },
  {
    name: 'tgcloud-sdk-db',
    uri: 'tgcloud://docs/sdk-db',
    title: 'sdk/db — database',
    file: 'sdk-db.md',
    description:
      'schema.js column types (text, integer, real, numeric, blob, boolean, json) and modes, query builder, insert/update/delete, raw SQL, no foreign keys',
  },
  {
    name: 'tgcloud-sdk-api',
    uri: 'tgcloud://docs/sdk-api',
    title: 'sdk/api — Telegram Bot API',
    file: 'sdk-api.md',
    description: 'Any Bot API method, unwrapped result, BotApiError, InputFile uploads',
  },
  {
    name: 'tgcloud-sdk-fetch',
    uri: 'tgcloud://docs/sdk-fetch',
    title: 'sdk/fetch — HTTP client',
    file: 'sdk-fetch.md',
    description: 'fetch with body helpers and binary bodies (InputFile/FormData), streams, 32 MB cap',
  },
  {
    name: 'tgcloud-limits',
    uri: 'tgcloud://docs/limits',
    title: 'Platform limits',
    file: 'limits.md',
    description:
      'Documented limits (upload, getFile, fetch) and the unpublished list (memory, CPU, timeouts)',
  },
];

export function registerDocResources(server: McpServer) {
  for (const doc of DOCS) {
    server.registerResource(
      doc.name,
      doc.uri,
      { title: doc.title, description: doc.description, mimeType: 'text/markdown' },
      async (uri) => {
        const text = await readFile(join(DOCS_DIR, doc.file), 'utf8');
        return { contents: [{ uri: uri.href, text, mimeType: 'text/markdown' }] };
      },
    );
  }
}
