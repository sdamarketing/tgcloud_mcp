import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import type { TgcloudMcpConfig } from './config.js';
import { maskSecrets } from './utils.js';

export class TgcloudError extends Error {
  constructor(
    message: string,
    public readonly code: number | null,
    public readonly stderr: string,
  ) {
    super(message);
    this.name = 'TgcloudError';
  }
}

export interface RunOptions {
  cwd: string;
  /** Данные для stdin (например, токен бота при login). */
  input?: string;
  /** Дополнительные переменные окружения для процесса. */
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface RunOutput {
  code: number;
  stdout: string;
  stderr: string;
}

export class TgcloudRunner {
  constructor(private readonly config: TgcloudMcpConfig) {}

  /** Проверяет project_dir: абсолютный путь к существующему каталогу. */
  resolveProjectDir(dir: string): string {
    if (!isAbsolute(dir)) {
      throw new Error(`project_dir должен быть абсолютным путём, получено: ${dir}`);
    }
    let st;
    try {
      st = statSync(dir);
    } catch {
      throw new Error(`Каталог не существует: ${dir}`);
    }
    if (!st.isDirectory()) {
      throw new Error(`Не является каталогом: ${dir}`);
    }
    return resolve(dir);
  }

  /** Запуск произвольной команды (npm create и т.п.). */
  exec(command: string, args: string[], opts: RunOptions): Promise<RunOutput> {
    return this.spawn(command, args, opts);
  }

  /** Запуск tgcloud CLI: tgcloud <args...> в каталоге проекта. */
  tgcloud(args: string[], opts: RunOptions): Promise<RunOutput> {
    return this.spawn(this.config.command, [...this.config.commandArgs, ...args], opts);
  }

  /** Тот же запуск, но с ошибкой при ненулевом коде возврата. */
  async tgcloudOrThrow(args: string[], opts: RunOptions): Promise<string> {
    const out = await this.tgcloud(args, opts);
    const text = [out.stdout, out.stderr].filter(Boolean).join('\n').trim();
    if (out.code !== 0) {
      throw new TgcloudError(`tgcloud завершился с кодом ${out.code}:\n${text}`, out.code, out.stderr);
    }
    return text || '(команда выполнена, вывод пуст)';
  }

  private spawn(command: string, args: string[], opts: RunOptions): Promise<RunOutput> {
    const timeoutMs = opts.timeoutMs ?? this.config.timeoutMs;
    return new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(command, args, {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill('SIGKILL');
          rejectPromise(new Error(`Таймаут команды (${timeoutMs} мс): ${command} ${args.join(' ')}`));
        }
      }, timeoutMs);

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      child.on('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          rejectPromise(new Error(`Не удалось запустить ${command}: ${err.message}`));
        }
      });
      child.on('close', (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolvePromise({
            code: code ?? -1,
            stdout: maskSecrets(stdout),
            stderr: maskSecrets(stderr),
          });
        }
      });

      if (opts.input !== undefined) {
        child.stdin.write(opts.input);
      }
      child.stdin.end();
    });
  }

  /** Форматирует вывод команды в читаемый текст для агента. */
  format(out: RunOutput): string {
    const parts = [`exit code: ${out.code}`];
    if (out.stdout.trim()) parts.push(`--- stdout ---\n${out.stdout.trim()}`);
    if (out.stderr.trim()) parts.push(`--- stderr ---\n${out.stderr.trim()}`);
    return parts.join('\n');
  }
}
