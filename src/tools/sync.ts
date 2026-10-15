import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/server';
import type { TgcloudRunner } from '../runner.js';
import { dangerTool, runTool } from '../utils.js';

const projectDir = z
  .string()
  .describe('Absolute path to a tgcloud project directory (contains .tgcloud/)');

const confirm = z
  .boolean()
  .optional()
  .describe('Required confirm: true for destructive operations (the --force flag, reset, and similar)');

export function registerSyncTools(server: McpServer, runner: TgcloudRunner) {
  server.registerTool(
    'status',
    {
      title: 'Project status',
      description:
        'Shows local changes against the deployed snapshot (tgcloud status). Offline. ' +
        'Also reports stray .js files inside tgcloud/ that will not deploy, Mini App static diffs, ' +
        'and a webhook that is out of sync with the deployed handlers.',
      inputSchema: z.object({ project_dir: projectDir }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        return runner.format(await runner.tgcloud(['status'], { cwd }));
      }),
  );

  server.registerTool(
    'diff',
    {
      title: 'Line diff',
      description:
        'Line-by-line diff of the local project against the deployed snapshot (tgcloud diff). Offline.',
      inputSchema: z.object({ project_dir: projectDir }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const out = await runner.tgcloud(['diff'], { cwd });
        return out.stdout.trim() || '(no changes)';
      }),
  );

  server.registerTool(
    'push',
    {
      title: 'Deploy to the cloud',
      description:
        'Uploads changed modules in one atomic batch (tgcloud push). Without files, mirrors the ' +
        'whole local module set (deletions included) and, when tgcloud.jsonc names static.source, ' +
        'uploads that build folder exactly as it is on disk. push never runs the bundler — after ' +
        'front-end edits call deploy, or the previous build goes live. A targeted push never deletes ' +
        'other modules and leaves static files untouched unless the target is the build folder. ' +
        'push does not migrate the database; it only prints pending schema changes. Adding or ' +
        'removing a handler can leave the webhook out of sync — follow with webhook_sync. ' +
        'force=true skips the revision check and requires confirm: true.',
      inputSchema: z.object({
        project_dir: projectDir,
        files: z
          .array(z.string())
          .optional()
          .describe('Specific files or directories to deploy; omit to deploy every change'),
        force: z.boolean().optional().describe('Pass --force (dangerous, requires confirm: true)'),
        confirm,
      }),
    },
    async (args) => {
      const exec = async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const cliArgs = ['push'];
        if (args.files?.length) cliArgs.push(...args.files);
        if (args.force) cliArgs.push('--force');
        return runner.format(await runner.tgcloud(cliArgs, { cwd }));
      };
      return args.force ? dangerTool(args, exec) : runTool(exec);
    },
  );

  server.registerTool(
    'pull',
    {
      title: 'Pull from the cloud',
      description:
        'Makes the local project match the cloud: updates the snapshot and working files (tgcloud pull). ' +
        'Does not write the Mini App build folder.',
      inputSchema: z.object({ project_dir: projectDir }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        return runner.format(await runner.tgcloud(['pull'], { cwd }));
      }),
  );

  server.registerTool(
    'fetch',
    {
      title: 'Refresh the cloud snapshot',
      description:
        'Updates the local snapshot of what is deployed without touching working files (tgcloud fetch). ' +
        'Use it before resolving a revision conflict.',
      inputSchema: z.object({ project_dir: projectDir }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        return runner.format(await runner.tgcloud(['fetch'], { cwd }));
      }),
  );

  server.registerTool(
    'reset',
    {
      title: 'Discard local changes',
      description:
        'DESTRUCTIVE: discards local module edits and restores the working tree from the last known ' +
        'cloud snapshot (tgcloud reset). Does not touch the Mini App build folder. Requires confirm: true.',
      inputSchema: z.object({ project_dir: projectDir, confirm }),
    },
    async (args) =>
      dangerTool(args, async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        return runner.format(await runner.tgcloud(['reset'], { cwd, input: 'y\n' }));
      }),
  );

  server.registerTool(
    'deploy',
    {
      title: 'Build the Mini App and push',
      description:
        'Runs `npm run build` when package.json has a build script, then `tgcloud push`. ' +
        'Use this after front-end edits: a plain push uploads static.source as it sits on disk and ' +
        'never runs the bundler, so it would publish a stale dist. Does not migrate the database ' +
        'and never passes --force. skip_build=true pushes without building. ' +
        'If there is no build script, only push runs.',
      inputSchema: z.object({
        project_dir: projectDir,
        skip_build: z
          .boolean()
          .optional()
          .describe('true — skip npm run build and only push'),
      }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const sections: string[] = [];
        if (args.skip_build !== true) {
          const script = await readBuildScript(cwd);
          if (script) {
            const build = await runner.exec('npm', ['run', 'build'], {
              cwd,
              timeoutMs: Math.max(runner.timeoutMs, 300_000),
            });
            sections.push(`--- npm run build ---\n${runner.format(build)}`);
            if (build.code !== 0) {
              throw new Error(
                `npm run build failed (exit ${build.code}); push was not run.\n${runner.format(build)}`,
              );
            }
          } else {
            sections.push('--- npm run build ---\n(no build script in package.json; skipped)');
          }
        }
        const pushed = await runner.tgcloud(['push'], { cwd });
        sections.push(`--- tgcloud push ---\n${runner.format(pushed)}`);
        return sections.join('\n\n');
      }),
  );
}

async function readBuildScript(dir: string): Promise<string | null> {
  try {
    const raw = await readFile(join(dir, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { scripts?: { build?: unknown } };
    const build = pkg.scripts?.build;
    return typeof build === 'string' && build.trim() ? build : null;
  } catch {
    return null;
  }
}
