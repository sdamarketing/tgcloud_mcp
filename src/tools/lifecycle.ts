import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/server';
import type { TgcloudRunner } from '../runner.js';
import { dangerTool, runTool } from '../utils.js';

const projectDir = z
  .string()
  .describe('Absolute path to a tgcloud project directory (contains .tgcloud/)');

export function registerLifecycleTools(server: McpServer, runner: TgcloudRunner) {
  server.registerTool(
    'create_project',
    {
      title: 'Create a bot project',
      description:
        'Scaffolds a serverless bot with `npm create @tgcloud/bot <name>` inside parent_dir. ' +
        'Needs Node.js 18+ and the npm registry. Does not overwrite existing files.',
      inputSchema: z.object({
        parent_dir: z.string().describe('Absolute path of the directory that will contain the new project'),
        name: z
          .string()
          .regex(/^[a-z0-9][a-z0-9._-]*$/i, 'Project name: letters, digits, dots, hyphens, underscores')
          .describe('New project directory name, for example my-bot'),
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
      title: 'Initialize a project in place',
      description:
        'Scaffolds tgcloud into an existing directory (tgcloud init, offline): tgcloud/schema.js, ' +
        'handlers/, endpoints/, lib/, tgcloud.jsonc, AGENTS.md, docs/tgcloud-sdk.md. ' +
        'In a front-end project it detects the bundler, sets static.source, and adds an npm run deploy ' +
        'script (build, then push) without overwriting files you already have.',
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
      title: 'Link a bot to the project',
      description:
        'Runs `tgcloud login` with a CLI access token (app<id>:<secret> from @BotFather → your bot → ' +
        'Serverless → CLI Access → Access token). This is NOT the Bot API token (123456:AA…). ' +
        'The CLI wants a TTY, so the token is written to stdin with TGCLOUD_ASSUME_TTY=1 and masked ' +
        'in every tool result. NEVER show the token to the user after this call. ' +
        'In CI, set TGCLOUD_TOKEN and skip login.',
      inputSchema: z.object({
        project_dir: projectDir,
        token: z
          .string()
          .regex(/^app\d+:[A-Za-z0-9_-]+$/, 'Expected a CLI access token of the form app<id>:<secret>')
          .describe('CLI access token from @BotFather (Serverless → CLI Access), form app<id>:<secret>'),
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
      title: 'Add a module',
      description:
        'Scaffolds a module with `tgcloud add <target>` (tgcloud/ layout). ' +
        'handlers/<type> is one flat update handler (message, edited_message, callback_query, ' +
        'inline_query, chosen_inline_result, shipping_query, pre_checkout_query, poll, poll_answer, ' +
        'my_chat_member, chat_member, chat_join_request, message_reaction, channel_post, …). ' +
        'endpoints/<name> is a Mini App function (POST /api/<name>; identifier, not starting with a digit). ' +
        'lib/<path> is shared code and may be nested. Existing files are never overwritten.',
      inputSchema: z.object({
        project_dir: projectDir,
        target: z
          .string()
          .regex(
            /^(handlers|endpoints|lib)\/[a-z0-9._/-]+$/i,
            'target: handlers/<type>, endpoints/<name>, or lib/<path>',
          )
          .describe('Module path, for example handlers/callback_query, endpoints/getProfile, or lib/cart'),
      }),
    },
    async (args) =>
      runTool(async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        const out = await runner.tgcloud(['add', args.target], { cwd });
        return runner.format(out);
      }),
  );

  server.registerTool(
    'upgrade',
    {
      title: 'Upgrade a pre-0.2.0 project layout',
      description:
        'One-time move of schema.js, handlers/, and lib/ from the project root into tgcloud/ ' +
        '(tgcloud upgrade). Required before other commands on projects created before CLI 0.2.0. ' +
        'Keeps the bot link; nothing needs to be redeployed. dry_run defaults to true and only ' +
        'prints the planned moves. Applying (dry_run: false) requires confirm: true.',
      inputSchema: z.object({
        project_dir: projectDir,
        dry_run: z
          .boolean()
          .optional()
          .describe('true (default) — print planned moves only (--dry-run)'),
        confirm: z.boolean().optional().describe('Required confirm: true when dry_run is false'),
      }),
    },
    async (args) => {
      if (args.dry_run !== false) {
        return runTool(async () => {
          const cwd = runner.resolveProjectDir(args.project_dir);
          return runner.format(await runner.tgcloud(['upgrade', '--dry-run'], { cwd }));
        });
      }
      return dangerTool(args, async () => {
        const cwd = runner.resolveProjectDir(args.project_dir);
        return runner.format(await runner.tgcloud(['upgrade'], { cwd }));
      });
    },
  );
}
