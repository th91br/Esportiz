import {
  setObservabilitySink,
  type ObservabilityEvent,
  type ObservabilityLevel,
} from './observability';

type RemoteLevel = 'error' | 'warning';

type RemoteScope = {
  setExtra: (key: string, value: unknown) => void;
  setLevel: (level: RemoteLevel) => void;
  setTag: (key: string, value: string) => void;
};

type RemoteEvent = {
  request?: {
    cookies?: unknown;
    data?: unknown;
    headers?: unknown;
    url?: string;
  };
  user?: unknown;
};

type RemoteSdk = {
  captureMessage: (message: string, level: RemoteLevel) => unknown;
  init: (options: Record<string, unknown>) => void;
  withScope: (callback: (scope: RemoteScope) => void) => void;
};

type InitializeRemoteObservabilityOptions = {
  dsn?: string;
  environment?: string;
  loadSdk?: () => Promise<RemoteSdk>;
  release?: string;
  sampleRate?: number;
};

function normalizeSampleRate(value: number | string | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(1, Math.max(0, parsed));
}

function toRemoteLevel(level: ObservabilityLevel): RemoteLevel {
  return level === 'error' ? 'error' : 'warning';
}

function stripRequestDetails(event: RemoteEvent) {
  event.user = undefined;

  if (!event.request) return event;

  event.request.cookies = undefined;
  event.request.data = undefined;
  event.request.headers = undefined;

  if (event.request.url) {
    try {
      const url = new URL(event.request.url);
      event.request.url = `${url.origin}${url.pathname}`;
    } catch {
      event.request.url = undefined;
    }
  }

  return event;
}

function createRemoteSink(sdk: RemoteSdk) {
  return (event: ObservabilityEvent) => {
    sdk.withScope((scope) => {
      const level = toRemoteLevel(event.level);
      scope.setLevel(level);
      scope.setTag('esportiz.event', event.name);
      scope.setTag('esportiz.event_id', event.id);

      if (event.context) {
        scope.setExtra('sanitized_context', event.context);
      }

      sdk.captureMessage(
        event.error ? `${event.name}: ${event.error.message}` : event.name,
        level,
      );
    });
  };
}

export async function initializeRemoteObservability(
  options: InitializeRemoteObservabilityOptions = {},
) {
  const dsn = options.dsn ?? import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return { enabled: false as const };

  const sdk = options.loadSdk
    ? await options.loadSdk()
    : await import('./sentryAdapter') as unknown as RemoteSdk;

  sdk.init({
    attachStacktrace: false,
    beforeSend: stripRequestDetails,
    defaultIntegrations: false,
    dsn,
    environment: options.environment
      ?? import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim()
      ?? import.meta.env.MODE,
    maxBreadcrumbs: 0,
    release: options.release ?? (import.meta.env.VITE_APP_RELEASE?.trim() || undefined),
    sampleRate: normalizeSampleRate(
      options.sampleRate ?? import.meta.env.VITE_SENTRY_SAMPLE_RATE,
    ),
    sendDefaultPii: false,
  });

  setObservabilitySink(createRemoteSink(sdk));
  return { enabled: true as const };
}
