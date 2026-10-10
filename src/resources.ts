import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/server';

const DOCS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'resources', 'docs');

const DOCS: Array<{ name: string; uri: string; title: string; file: string; description: string }> = [
  {
    name: 'tgcloud-project-structure',
    uri: 'tgcloud://docs/project-structure',
    title: 'Структура проекта tgcloud и правила импортов',
    file: 'project-structure.md',
    description: 'handlers/, lib/, schema.js, .tgcloud/; только bare-импорты, без относительных путей и расширений',
  },
  {
    name: 'tgcloud-cli',
    uri: 'tgcloud://docs/cli',
    title: 'Справочник tgcloud CLI',
    file: 'cli.md',
    description: 'init, login, add, run, status, diff, push, pull, fetch, reset, migrate, webhook, completion',
  },
  {
    name: 'tgcloud-sdk-db',
    uri: 'tgcloud://docs/sdk-db',
    title: 'sdk/db — база данных',
    file: 'sdk-db.md',
    description: 'schema.js, таблицы и модификаторы, query builder, insert/update/delete, raw SQL',
  },
  {
    name: 'tgcloud-sdk-api',
    uri: 'tgcloud://docs/sdk-api',
    title: 'sdk/api — Telegram Bot API',
    file: 'sdk-api.md',
    description: 'Вызов любых методов Bot API, развёрнутый result, BotApiError',
  },
  {
    name: 'tgcloud-sdk-fetch',
    uri: 'tgcloud://docs/sdk-fetch',
    title: 'sdk/fetch — HTTP-клиент',
    file: 'sdk-fetch.md',
    description: 'fetch с body-хелперами и бинарными телами (InputFile/FormData), потоки, лимит 32 МБ',
  },
  {
    name: 'tgcloud-limits',
    uri: 'tgcloud://docs/limits',
    title: 'Лимиты и квоты платформы',
    file: 'limits.md',
    description: 'Задокументированные лимиты (upload/getFile/fetch) и честный список того, что не опубликовано (память, CPU, таймауты)',
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
