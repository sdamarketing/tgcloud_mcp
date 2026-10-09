#!/usr/bin/env node
// Self-update для git-clone установок (~/.tgcloud-mcp): pull, пересборка, smoke.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const run = (cmd, args) => {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
};

if (!existsSync(path.join(root, '.git'))) {
  console.log('Эта копия установлена из npm. Обновление:');
  console.log('  npm install -g tgcloud-mcp@latest');
  process.exit(0);
}

run('git', ['fetch', '--quiet', 'origin']);
const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root }).toString().trim();
run('git', ['reset', '--hard', `origin/${branch}`]);
run('npm', ['install', '--no-fund', '--no-audit', '--loglevel=error']);
run('npm', ['run', 'build']);
run('npm', ['run', 'smoke']);
console.log('\n✔ tgcloud-mcp обновлён');
