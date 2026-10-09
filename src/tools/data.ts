import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/server';
import type { TgcloudRunner } from '../runner.js';
import { dangerTool, runTool } from '../utils.js';

const projectDir = z
  .string()
  .describe('Абсолютный путь к каталогу проекта tgcloud (содержит .tgcloud/)');

const confirm = z
  .boolean()
  .optional()
  .describe('Обязательный confirm: true для применения миграций, удаляющих данные (deprecated-колонки/таблицы)');

export function registerDataTools(server: McpServer, runner: TgcloudRunner) {
  server.registerTool(
    'run_handler',
    {
      title: 'Прогнать хендлер без деплоя',
      description:
        'Выполняет модуль на платформе c локальными файлами, без деплоя (tgcloud run). ' +
        'Быстрый способ проверить хендлер: payload и контекст — в формате JSON5. ' +
        'Возвращает вывод и захваченные console-логи.',
      inputSchema: z.object({
        project_dir: projectDir,
        module: z.string().describe('Путь модуля, например handlers/message'),
        args: z
          .string()
          .optional()
          .describe('Аргумент-хендлера в JSON5, например \'{ chat: { id: 1 }, text: "hi" }\''),
        ctx: z.string().optional().describe('Контекст выполнения в JSON5 (передаётся как --ctx)'),
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
      title: 'Миграции базы данных',
      description:
        'Применяет изменения schema.js к базе (tgcloud migrate). ' +
        'По умолчанию dry_run=true — только показывает diff без изменений (--dry-run). ' +
        'Применение (dry_run=false) требует confirm: true и идёт неинтерактивно через --yes: ' +
        'если в схеме есть .deprecated(...)-колонки/таблицы, данные будут удалены безвозвратно. ' +
        'В интерактивном терминале migrate без флагов спрашивает по каждому изменению ' +
        '([y]es / [n]o / [q]uit); для агента используй только --dry-run и --yes.',
      inputSchema: z.object({
        project_dir: projectDir,
        dry_run: z
          .boolean()
          .optional()
          .describe('true (по умолчанию) — только предпросмотр изменений (--dry-run)'),
        confirm,
      }),
    },
    async (args) => {
      if (args.dry_run !== false) {
        return runTool(async () => {
          const cwd = runner.resolveProjectDir(args.project_dir);
          return runner.format(await runner.tgcloud(['migrate', '--dry-run'], { cwd }));
        });
      }
      return dangerTool(args, async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const out = await runner.tgcloud(['migrate', '--yes'], { cwd });
        return runner.format(out);
      });
    },
  );
}
