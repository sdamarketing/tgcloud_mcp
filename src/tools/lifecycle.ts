import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/server';
import type { TgcloudRunner } from '../runner.js';
import { runTool } from '../utils.js';

const projectDir = z
  .string()
  .describe('Абсолютный путь к каталогу проекта tgcloud (содержит .tgcloud/)');

export function registerLifecycleTools(server: McpServer, runner: TgcloudRunner) {
  server.registerTool(
    'create_project',
    {
      title: 'Создать проект бота',
      description:
        'Скаффолдит новый проект serverless-бота через `npm create @tgcloud/bot <name>` ' +
        'внутри каталога parent_dir. Требуется Node.js 18+ и доступ к npm registry.',
      inputSchema: z.object({
        parent_dir: z.string().describe('Абсолютный путь к каталогу, где будет создан проект'),
        name: z
          .string()
          .regex(/^[a-z0-9][a-z0-9._-]*$/i, 'Имя проекта: латиница, цифры, точки, - и _')
          .describe('Имя каталога нового проекта, например my-bot'),
      }),
    },
    async (args) =>
      runTool(async () => {
        const parent = runner.resolveProjectDir(args.parent_dir);
        const out = await runner.exec('npm', ['create', '--yes', '@tgcloud/bot', args.name], {
          cwd: parent,
        });
        return runner.format(out);
      }),
  );

  server.registerTool(
    'init_project',
    {
      title: 'Инициализировать пустой проект',
      description:
        'Скаффолдит проект tgcloud в существующем (обычно пустом) каталоге: schema.js, handlers/, lib/. Работает офлайн.',
      inputSchema: z.object({ project_dir: projectDir }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        return runner.format(await runner.tgcloud(['init'], { cwd }));
      }),
  );

  server.registerTool(
    'login_bot',
    {
      title: 'Привязать бота к проекту',
      description:
        'Выполняет `tgcloud login`: привязывает бота к проекту по CLI-токену из @BotFather. ' +
        'Токен передаётся в CLI через stdin и маскируется во всех выводах. ' +
        'НИКОГДА не показывай токен пользователю после вызова.',
      inputSchema: z.object({
        project_dir: projectDir,
        token: z.string().describe('CLI-токен доступа, полученный от @BotFather'),
      }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const out = await runner.tgcloud(['login'], { cwd, input: `${args.token}\n` });
        return runner.format(out);
      }),
  );

  server.registerTool(
    'add_module',
    {
      title: 'Добавить модуль',
      description:
        'Скаффолдит модуль через `tgcloud add <target>`. handlers/<type> — хендлер апдейтов ' +
        '(плоско, один уровень; типы: message, callback_query, inline_query, chat_member и др.), ' +
        'lib/<name> — общий модуль (допускаются вложенные, например lib/internal/util). ' +
        'Существующие файлы не перезаписываются.',
      inputSchema: z.object({
        project_dir: projectDir,
        target: z
          .string()
          .regex(/^(handlers|lib)\/[a-z0-9._/-]+$/i, 'target: handlers/<type> или lib/<path>')
          .describe('Путь модуля, например handlers/callback_query или lib/cart'),
      }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const out = await runner.tgcloud(['add', args.target], { cwd });
        return runner.format(out);
      }),
  );
}
