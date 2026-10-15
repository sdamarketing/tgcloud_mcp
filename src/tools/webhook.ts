import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/server';
import type { TgcloudRunner } from '../runner.js';
import { dangerTool, runTool } from '../utils.js';

const projectDir = z
  .string()
  .describe('Absolute path to a tgcloud project directory (contains .tgcloud/)');

export function registerWebhookTools(server: McpServer, runner: TgcloudRunner) {
  server.registerTool(
    'webhook_status',
    {
      title: 'Webhook status',
      description:
        'Shows the platform-managed webhook (tgcloud webhook): URL, allowed_updates, pending ' +
        'update count, the last delivery error, and whether it is in sync with the deployed handlers. ' +
        'First step when a bot is silent. Deploying or removing a handler can leave it out of sync.',
      inputSchema: z.object({ project_dir: projectDir }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        return runner.format(await runner.tgcloud(['webhook'], { cwd }));
      }),
  );

  server.registerTool(
    'webhook_sync',
    {
      title: 'Re-sync the webhook',
      description:
        'Points the webhook at the platform and rebuilds allowed_updates from deployed handlers ' +
        '(tgcloud webhook sync). Call it after adding or removing a handler. ' +
        'drop_pending=true discards updates Telegram already queued — destructive, requires confirm: true.',
      inputSchema: z.object({
        project_dir: projectDir,
        drop_pending: z
          .boolean()
          .optional()
          .describe('Discard queued updates (--drop-pending, requires confirm: true)'),
        confirm: z.boolean().optional().describe('Required confirm: true when drop_pending is true'),
      }),
    },
    async (args) => {
      const exec = async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const cliArgs = ['webhook', 'sync'];
        if (args.drop_pending) cliArgs.push('--drop-pending');
        return runner.format(await runner.tgcloud(cliArgs, { cwd }));
      };
      return args.drop_pending ? dangerTool(args, exec) : runTool(exec);
    },
  );
}
