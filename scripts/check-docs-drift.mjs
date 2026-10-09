#!/usr/bin/env node
// Docs-drift: сверяет список DOCS в src/resources.ts с файлами resources/docs/*.md.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(path.join(root, 'src', 'resources.ts'), 'utf8');
const registered = [...src.matchAll(/file: '([^']+\.md)'/g)].map((m) => m[1]).sort();
const onDisk = readdirSync(path.join(root, 'resources', 'docs'))
  .filter((f) => f.endsWith('.md'))
  .sort();

const missing = onDisk.filter((f) => !registered.includes(f));
const stale = registered.filter((f) => !onDisk.includes(f));

if (missing.length || stale.length) {
  if (missing.length) console.error('Файлы без ресурса:', missing.join(', '));
  if (stale.length) console.error('Ресурсы без файла:', stale.join(', '));
  process.exit(1);
}
console.log(`OK: ${registered.length} docs in sync`);
