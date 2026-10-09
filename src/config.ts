export interface TgcloudMcpConfig {
  /** Команда запуска tgcloud CLI (по умолчанию npx). */
  command: string;
  /** Аргументы-префикс перед субкомандой (по умолчанию ["tgcloud"]). */
  commandArgs: string[];
  /** Таймаут одной команды, мс. */
  timeoutMs: number;
}

export function loadConfig(): TgcloudMcpConfig {
  const commandArgs = (process.env.TGCLOUD_CLI_ARGS ?? 'tgcloud')
    .split(' ')
    .map((s) => s.trim())
    .filter(Boolean);
  const timeoutMs = Number(process.env.TGCLOUD_TIMEOUT_MS ?? '120000');
  return {
    command: process.env.TGCLOUD_CLI ?? 'npx',
    commandArgs,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120000,
  };
}
