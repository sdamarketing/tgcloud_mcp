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
        'Выполняет `tgcloud login`: привязывает бота к проекту по CLI access token ' +
        '(формат app<id>:<secret>; @BotFather → ваш бот → Serverless → CLI Access → Access token). ' +
        'Это НЕ API-токен бота вида 123456:AA…. ' +
        'CLI требует интерактивный терминал, поэтому токен передаётся через stdin с ' +
        'TGCLOUD_ASSUME_TTY=1; во всех выводах токен маскируется. ' +
        'НИКОГДА не показывай токен пользователю после вызова. ' +
        'Для CI вместо login достаточно переменной окружения TGCLOUD_TOKEN на shell.',
      inputSchema: z.object({
        project_dir: projectDir,
        token: z
          .string()
          .regex(/^app\d+:[A-Za-z0-9_-]+$/, 'Ожидается CLI access token формата app<id>:<secret>')
          .describe('CLI access token из @BotFather (Serverless → CLI Access), формат app<id>:<secret>'),
      }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const out = await runner.tgcloud(['login'], {
          cwd,
          input: `${args.token}\n`,
          env: { TGCLOUD_ASSUME_TTY: '1' },
        });
        return runner.format(out);
      }),
  );

  server.registerTool(
    'add_module',
    {
      title: 'Добавить модуль',
      description:
        'Скаффолдит модуль через `tgcloud add <target>` (в tgcloud/-layout). ' +
        'handlers/<type> — хендлер апдейтов (плоско, один уровень; типы: message, callback_query, ' +
        'inline_query, chat_member, my_chat_member и др.); endpoints/<name> — серверная функция ' +
        'Mini App (POST /api/<name>); lib/<path> — общий модуль (вложенные пути допускаются). ' +
        'Существующие файлы не перезаписываются.',
      inputSchema: z.object({
        project_dir: projectDir,
        target: z
          .string()
          .regex(
            /^(handlers|endpoints|lib)\/[a-z0-9._/-]+$/i,
            'target: handlers/<type>, endpoints/<name> или lib/<path>',
          )
          .describe('Путь модуля, например handlers/callback_query, endpoints/getProfile или lib/cart'),
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
