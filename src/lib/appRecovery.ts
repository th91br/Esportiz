import { reportError } from '@/lib/observability';
export const APP_RECOVERY_ATTEMPTED_KEY = 'esportiz_recovery_attempted';
export const APP_RECOVERY_ATTEMPT_TTL_MS = 60_000;

type AppRecoveryWindow = {
  location: {
    href: string;
    reload?: () => void;
    replace?: (url: string) => void;
  };
  sessionStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  caches?: {
    keys: () => Promise<string[]>;
    delete: (key: string) => Promise<boolean>;
  };
  navigator?: {
    serviceWorker?: {
      getRegistrations: () => Promise<Array<{ unregister: () => Promise<boolean> }>>;
    };
  };
};

type RecoverAppRuntimeOptions = {
  force?: boolean;
  now?: () => number;
  windowRef?: AppRecoveryWindow;
};

const dynamicImportErrorMarkers = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'chunkloaderror',
  'loading chunk',
  'err_blocked_by_client',
];

function getBrowserWindow(windowRef?: AppRecoveryWindow) {
  if (windowRef) return windowRef;
  if (typeof window === 'undefined') return null;

  return window as unknown as AppRecoveryWindow;
}

export function isDynamicImportLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return dynamicImportErrorMarkers.some((marker) => normalized.includes(marker));
}

export function hasAttemptedAppRecovery(windowRef?: AppRecoveryWindow, now: () => number = Date.now) {
  const browserWindow = getBrowserWindow(windowRef);
  const attemptedAt = browserWindow?.sessionStorage.getItem(APP_RECOVERY_ATTEMPTED_KEY);

  if (!attemptedAt) return false;

  const attemptedAtTimestamp = Number(attemptedAt);

  if (!Number.isFinite(attemptedAtTimestamp)) {
    return false;
  }

  return now() - attemptedAtTimestamp < APP_RECOVERY_ATTEMPT_TTL_MS;
}

function withRecoveryCacheBust(href: string, now: () => number) {
  const url = new URL(href);
  url.searchParams.set('esportiz_recover', String(now()));
  return url.toString();
}

export async function recoverAppRuntime(options: RecoverAppRuntimeOptions = {}) {
  const browserWindow = getBrowserWindow(options.windowRef);
  const now = options.now ?? Date.now;

  if (!browserWindow) return false;
  if (!options.force && hasAttemptedAppRecovery(browserWindow, now)) return false;

  const recoveryStartedAt = now();
  browserWindow.sessionStorage.setItem(APP_RECOVERY_ATTEMPTED_KEY, String(recoveryStartedAt));

  try {
    if (browserWindow.caches) {
      const keys = await browserWindow.caches.keys();
      await Promise.all(keys.map((key) => browserWindow.caches?.delete(key)));
    }

    const serviceWorker = browserWindow.navigator?.serviceWorker;
    if (serviceWorker) {
      const registrations = await serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    reportError('app.recovery_failed', error);
  }

  const recoveryUrl = withRecoveryCacheBust(browserWindow.location.href, () => recoveryStartedAt);

  if (browserWindow.location.replace) {
    browserWindow.location.replace(recoveryUrl);
  } else {
    browserWindow.location.reload?.();
  }

  return true;
}
