export type ObservabilityLevel = 'error' | 'warning';

export type ObservabilityEvent = {
  id: string;
  level: ObservabilityLevel;
  name: string;
  timestamp: string;
  error?: {
    name: string;
    message: string;
  };
  context?: Record<string, unknown>;
};

export type ObservabilitySink = (event: ObservabilityEvent) => void | Promise<void>;

const SENSITIVE_KEY_PATTERN = /password|passcode|secret|token|authorization|cookie|api[_-]?key|email|phone|whatsapp|cpf|cnpj|pix|card|document/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const MAX_TEXT_LENGTH = 500;
const MAX_DEPTH = 4;
const MAX_COLLECTION_SIZE = 20;

let sink: ObservabilitySink | null = null;

function createEventId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const random = new Uint32Array(2);
  globalThis.crypto?.getRandomValues?.(random);
  return Date.now().toString(36) + '-' + Array.from(random).join('');
}

function sanitizeText(value: string) {
  const redacted = value
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .replace(JWT_PATTERN, '[redacted-token]');

  return redacted.length > MAX_TEXT_LENGTH
    ? redacted.slice(0, MAX_TEXT_LENGTH) + '...'
    : redacted;
}

function sanitizeValue(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeText(value);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return '[' + typeof value + ']';
  }

  if (value instanceof Error) {
    return {
      name: sanitizeText(value.name || 'Error'),
      message: sanitizeText(value.message || 'Unknown error'),
    };
  }

  if (depth >= MAX_DEPTH) {
    return '[truncated]';
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  if (seen.has(value)) {
    return '[circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_COLLECTION_SIZE)
      .map((item) => sanitizeValue(item, depth + 1, seen));
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .slice(0, MAX_COLLECTION_SIZE)
    .map(([key, entryValue]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key)
        ? '[redacted]'
        : sanitizeValue(entryValue, depth + 1, seen),
    ]);

  return Object.fromEntries(entries);
}

function normalizeError(error: unknown): ObservabilityEvent['error'] {
  if (error instanceof Error) {
    return {
      name: sanitizeText(error.name || 'Error'),
      message: sanitizeText(error.message || 'Unknown error'),
    };
  }

  return {
    name: 'UnknownError',
    message: sanitizeText(typeof error === 'string' ? error : 'Unknown error'),
  };
}

function fallbackSink(event: ObservabilityEvent) {
  const method = event.level === 'error' ? console.error : console.warn;
  method('[Esportiz] ' + event.name, event);
}

function emit(event: ObservabilityEvent) {
  if (!sink) {
    fallbackSink(event);
    return;
  }

  try {
    const result = sink(event);
    if (result && typeof result.then === 'function') {
      void result.catch(() => fallbackSink({
        id: createEventId(),
        level: 'error',
        name: 'observability.sink_failed',
        timestamp: new Date().toISOString(),
      }));
    }
  } catch {
    fallbackSink({
      id: createEventId(),
      level: 'error',
      name: 'observability.sink_failed',
      timestamp: new Date().toISOString(),
    });
  }
}

export function setObservabilitySink(nextSink: ObservabilitySink | null) {
  sink = nextSink;
}

export function reportError(
  name: string,
  error: unknown,
  context?: Record<string, unknown>,
): ObservabilityEvent {
  const event: ObservabilityEvent = {
    id: createEventId(),
    level: 'error',
    name,
    timestamp: new Date().toISOString(),
    error: normalizeError(error),
    context: context ? sanitizeValue(context) as Record<string, unknown> : undefined,
  };

  emit(event);
  return event;
}

export function reportWarning(
  name: string,
  context?: Record<string, unknown>,
): ObservabilityEvent {
  const event: ObservabilityEvent = {
    id: createEventId(),
    level: 'warning',
    name,
    timestamp: new Date().toISOString(),
    context: context ? sanitizeValue(context) as Record<string, unknown> : undefined,
  };

  emit(event);
  return event;
}

export function installGlobalErrorHandlers(windowRef: Window = window) {
  const handleError = (event: ErrorEvent) => {
    reportError('browser.unhandled_error', event.error ?? event.message, {
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  };
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportError('browser.unhandled_rejection', event.reason);
  };

  windowRef.addEventListener('error', handleError);
  windowRef.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    windowRef.removeEventListener('error', handleError);
    windowRef.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}