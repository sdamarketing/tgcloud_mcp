#!/usr/bin/env node
// Docs drift: resource registration, identical skill copies, and page parity.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(path.join(root, 'src', 'resources.ts'), 'utf8');
const registered = [...src.matchAll(/file: '([^']+\.md)'/g)].map((m) => m[1]).sort();
const onDisk = readdirSync(path.join(root, 'resources', 'docs'))
  .filter((f) => f.endsWith('.md'))
  .sort();

let failed = 0;
const fail = (msg) => { console.error(msg); failed++; };

const missing = onDisk.filter((f) => !registered.includes(f));
const stale = registered.filter((f) => !onDisk.includes(f));
if (missing.length) fail('Файлы без ресурса: ' + missing.join(', '));
if (stale.length) fail('Ресурсы без файла: ' + stale.join(', '));

const skillA = path.join(root, 'skills', 'tgcloud', 'SKILL.md');
const skillB = path.join(root, 'agent-plugin', 'skills', 'tgcloud', 'SKILL.md');
if (readFileSync(skillA, 'utf8') !== readFileSync(skillB, 'utf8')) {
  fail('skills/tgcloud/SKILL.md и agent-plugin/skills/tgcloud/SKILL.md различаются');
}

for (const file of ['plugin.json', 'mcp.json']) {
  const doc = JSON.parse(readFileSync(path.join(root, 'agent-plugin', file), 'utf8'));
  if (typeof doc.$schema !== 'string' || !doc.$schema.includes('agent-plugins.org/schemas/1.0.0')) {
    fail(`${file}: $schema должен указывать на agent-plugins.org 1.0.0`);
  }
}

const LANGS = ['en', 'ru', 'zh', 'ar', 'de', 'fr'];
const docsDir = path.join(root, 'docs');
const englishPages = readdirSync(docsDir).filter((f) => f.endsWith('.en.mdx'));
for (const page of englishPages) {
  const stem = page.slice(0, -'.en.mdx'.length);
  for (const lang of LANGS) {
    if (lang === 'en') continue;
    const sibling = `${stem}.${lang}.mdx`;
    if (!readdirSync(docsDir).includes(sibling)) fail(`Нет перевода: docs/${sibling}`);
  }
}

if (failed) process.exit(1);
console.log(`OK: ${registered.length} docs, skill copies match, ${englishPages.length} pages × ${LANGS.length} languages`);
