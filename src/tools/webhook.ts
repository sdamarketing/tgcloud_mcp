import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/server';
import type { TgcloudRunner } from '../runner.js';
import { dangerTool, runTool } from '../utils.js';

const projectDir = z
  .string()
  .describe('Абсолютный путь к каталогу проекта tgcloud (содержит .tgcloud/)');

export function registerWebhookTools(server: McpServer, runner: TgcloudRunner) {
  server.registerTool(
    'webhook_status',
    {
      title: 'Статус вебхука',
      description:
        'Показывает текущее состояние вебхука бота (tgcloud webhook): URL, allowed_updates, ' +
        'накопившиеся апдейты и ошибки доставки. Первый шаг диагностики «бот молчит».',
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
      title: 'Перенастроить вебхук',
      description:
        'Перенаправляет вебхук на проект и пересобирает allowed_updates (tgcloud webhook sync). ' +
        'drop_pending=true отбрасывает накопившиеся апдейты — деструктивно, требует confirm: true.',
      inputSchema: z.object({
        project_dir: projectDir,
        drop_pending: z
          .boolean()
          .optional()
          .describe('Отбросить накопившиеся апдейты (--drop-pending, требует confirm: true)'),
        confirm: z.boolean().optional().describe('Обязательный confirm: true при drop_pending=true'),
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
