import { getErrorMessage } from './errorUtils';

type FunctionErrorContext = {
  clone?: () => FunctionErrorContext;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

function getResponseMessage(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload.trim();
  }

  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const record = payload as Record<string, unknown>;
  for (const key of ['error', 'message', 'msg']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

export async function getFunctionErrorMessage(
  error: unknown,
  fallback = 'Nao foi possivel concluir a operacao.',
): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const originalContext = (error as { context?: FunctionErrorContext }).context;

    if (originalContext) {
      const context = typeof originalContext.clone === 'function'
        ? originalContext.clone()
        : originalContext;

      if (typeof context.json === 'function') {
        try {
          const message = getResponseMessage(await context.json());
          if (message) return message;
        } catch {
          // Some function responses are plain text instead of JSON.
        }
      }

      if (typeof context.text === 'function') {
        try {
          const message = getResponseMessage(await context.text());
          if (message) return message;
        } catch {
          // Fall through to the regular error message.
        }
      }
    }
  }

  return getErrorMessage(error, fallback);
}
