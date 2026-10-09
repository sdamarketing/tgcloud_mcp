/** Маскирует секреты (токены ботов и т.п.) в тексте, который уходит агенту. */
export function maskSecrets(text: string): string {
  return text
    // Токен Telegram-бота: 123456789:AA...
    .replace(/\b\d{6,12}:[A-Za-z0-9_-]{30,}\b/g, '***')
    // Пары вида token=... / "token": "..." (длинные значения)
    .replace(/((?:token|secret|password|authorization)["'\s:=]+)[^\s"',]{12,}/gi, '$1***');
}

export function jsonResult(data: unknown) {
  const text = maskSecrets(data === undefined ? 'null' : JSON.stringify(data, null, 2));
  return { content: [{ type: 'text' as const, text }] };
}

export function textResult(text: string) {
  return { content: [{ type: 'text' as const, text: maskSecrets(text) }] };
}

export function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: maskSecrets(message) }], isError: true };
}

export async function runTool(fn: () => Promise<string | unknown>) {
  try {
    const data = await fn();
    return typeof data === 'string' ? textResult(data) : jsonResult(data);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return errorResult(message);
  }
}

/**
 * Guard для деструктивных операций: без confirm: true отказывает.
 * Агент обязан показать пользователю, что будет изменено, получить явное
 * согласие и только потом повторить вызов с confirm=true.
 */
export async function dangerTool(args: { confirm?: boolean }, fn: () => Promise<string | unknown>) {
  return runTool(async () => {
    if (args.confirm !== true) {
      throw new Error(
        'Отказано: деструктивная операция. Покажите пользователю, что именно будет изменено, ' +
          'получите явное подтверждение и повторите вызов с confirm=true.',
      );
    }
    return fn();
  });
}
