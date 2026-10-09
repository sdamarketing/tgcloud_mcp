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
  .describe('Обязательный confirm: true для деструктивных операций (флаг --force, reset и т.п.)');

export function registerSyncTools(server: McpServer, runner: TgcloudRunner) {
  server.registerTool(
    'status',
    {
      title: 'Статус проекта',
      description:
        'Показывает локальные изменения относительно задеплоенной версии (tgcloud status). Работает офлайн.',
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
      title: 'Построчный diff',
      description:
        'Построчное сравнение локального проекта с задеплоенной версией (tgcloud diff). Работает офлайн.',
      inputSchema: z.object({ project_dir: projectDir }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const out = await runner.tgcloud(['diff'], { cwd });
        return out.stdout.trim() || '(изменений нет)';
      }),
  );

  server.registerTool(
    'push',
    {
      title: 'Деплой в облако',
      description:
        'Загружает изменённые модули в облако атомарным батчем (tgcloud push). ' +
        'Без files — зеркалирует всё локальное состояние. ' +
        'force=true (пропуск проверок конкурентности) — деструктивно, требует confirm: true.',
      inputSchema: z.object({
        project_dir: projectDir,
        files: z
          .array(z.string())
          .optional()
          .describe('Конкретные файлы/каталоги для деплоя; без них — всё изменённое'),
        force: z.boolean().optional().describe('Передать --force (опасно, требует confirm: true)'),
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
      title: 'Синхронизировать из облака',
      description:
        'Приводит локальный проект к состоянию облака: обновляет референс-копию и рабочие файлы (tgcloud pull).',
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
      title: 'Обновить референс-копию',
      description:
        'Обновляет локальную референс-копию задеплоенного состояния, НЕ трогая рабочие файлы (tgcloud fetch). Полезно перед разбором конфликтов.',
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
      title: 'Откатить локальные изменения',
      description:
        'ДЕСТРУКТИВНО: отбрасывает все локальные изменения и восстанавливает рабочий каталог ' +
        'к последнему известному состоянию облака (tgcloud reset). Требует confirm: true.',
      inputSchema: z.object({ project_dir: projectDir, confirm }),
    },
    async (args) =>
      dangerTool(args, async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        return runner.format(await runner.tgcloud(['reset'], { cwd, input: 'y\n' }));
      }),
  );
}
