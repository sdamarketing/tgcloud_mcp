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
  .describe('Required confirm: true to apply migrations, including drops of .deprecated columns and tables');

export function registerDataTools(server: McpServer, runner: TgcloudRunner) {
  server.registerTool(
    'run_handler',
    {
      title: 'Run a module without deploying',
      description:
        'Runs a handler or an endpoint on the platform using local files, without publishing them ' +
        '(tgcloud run). args is the payload (a Message for handlers/message, or the endpoint input) ' +
        'as a JSON5 object. ctx is the second argument (--ctx): the raw update for a handler, or ' +
        'initData for an endpoint, for example { initData: { user: { id: 1, first_name: "Ann" } } }. ' +
        'Returns the value, captured console logs, and elapsed time.',
      inputSchema: z.object({
        project_dir: projectDir,
        module: z.string().describe('Module path, for example handlers/message or endpoints/getProfile'),
        args: z
          .string()
          .optional()
          .describe('Handler payload or endpoint input as JSON5, for example \'{ chat: { id: 1 }, text: "hi" }\''),
        ctx: z.string().optional().describe('Second-argument context as JSON5 (passed as --ctx)'),
      }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const cliArgs = ['run', args.module];
        if (args.args !== undefined) cliArgs.push(args.args);
        if (args.ctx !== undefined) cliArgs.push('--ctx', args.ctx);
        return runner.format(await runner.tgcloud(cliArgs, { cwd }));
      }),
  );

  server.registerTool(
    'migrate',
    {
      title: 'Database migrations',
      description:
        'Applies schema.js changes to the database (tgcloud migrate). push never does this. ' +
        'dry_run defaults to true (--dry-run): preview only. ' +
        'Applying (dry_run: false) requires confirm: true. apply "safe" passes --safe ' +
        '(auto-apply safe changes, skip warnings and manual steps). apply "yes" or omitting apply ' +
        'passes --yes (safe changes plus every warning, including .deprecated drops that delete data; ' +
        'manual type changes are still skipped). local: true diffs against the local schema.js ' +
        'instead of the deployed one (--local) and can be combined with either mode. ' +
        'Show the user the preview before applying. Warn when the preview contains a drop.',
      inputSchema: z.object({
        project_dir: projectDir,
        dry_run: z
          .boolean()
          .optional()
          .describe('true (default) — preview only (--dry-run)'),
        apply: z
          .enum(['safe', 'yes'])
          .optional()
          .describe('When dry_run is false: "safe" → --safe, "yes" (default) → --yes'),
        local: z
          .boolean()
          .optional()
          .describe('Diff against local schema.js instead of the deployed schema (--local)'),
        confirm,
      }),
    },
    async (args) => {
      const flag = args.dry_run !== false ? '--dry-run' : args.apply === 'safe' ? '--safe' : '--yes';
      const cliArgs = ['migrate', flag];
      if (args.local) cliArgs.push('--local');
      if (args.dry_run !== false) {
        return runTool(async () => {
          const cwd = runner.resolveProjectDir(args.project_dir);
          return runner.format(await runner.tgcloud(cliArgs, { cwd }));
        });
      }
      return dangerTool(args, async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        return runner.format(await runner.tgcloud(cliArgs, { cwd }));
      });
    },
  );
}
