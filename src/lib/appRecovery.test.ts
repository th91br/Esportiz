import { describe, expect, it, vi } from 'vitest';
import {
  APP_RECOVERY_ATTEMPTED_KEY,
  APP_RECOVERY_ATTEMPT_TTL_MS,
  isDynamicImportLoadError,
  recoverAppRuntime,
} from './appRecovery';

function createRecoveryWindow() {
  const storage = new Map<string, string>();
  const deletedCaches: string[] = [];
  const unregistered: string[] = [];
  const replace = vi.fn();

  return {
    deletedCaches,
    unregistered,
    windowRef: {
      location: {
        href: 'http://localhost:8080/dashboard',
        replace,
      },
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      caches: {
        keys: vi.fn(async () => ['old-precache', 'runtime-cache']),
        delete: vi.fn(async (key: string) => {
          deletedCaches.push(key);
          return true;
        }),
      },
      navigator: {
        serviceWorker: {
          getRegistrations: vi.fn(async () => [
            {
              unregister: vi.fn(async () => {
                unregistered.push('sw-1');
                return true;
              }),
            },
          ]),
        },
      },
    },
    storage,
    replace,
  };
}

describe('app runtime recovery', () => {
  it('recognizes dynamic import fetch failures as recoverable app load errors', () => {
    expect(isDynamicImportLoadError(
      new Error('Failed to fetch dynamically imported module: http://localhost:8080/src/pages/Index.tsx'),
    )).toBe(true);

    expect(isDynamicImportLoadError(new Error('ChunkLoadError: Loading chunk 42 failed.'))).toBe(true);
    expect(isDynamicImportLoadError(new Error('Falha ao carregar o perfil'))).toBe(false);
  });

  it('cleans browser runtime state and reloads with a cache-busting recovery URL', async () => {
    const { deletedCaches, replace, storage, unregistered, windowRef } = createRecoveryWindow();
    const now = vi.fn(() => 1_780_000_000_000);

    const recovered = await recoverAppRuntime({ windowRef, now });

    expect(recovered).toBe(true);
    expect(storage.get(APP_RECOVERY_ATTEMPTED_KEY)).toBe('1780000000000');
    expect(deletedCaches).toEqual(['old-precache', 'runtime-cache']);
    expect(unregistered).toEqual(['sw-1']);
    expect(replace).toHaveBeenCalledWith('http://localhost:8080/dashboard?esportiz_recover=1780000000000');
  });

  it('does not loop automatic recovery during the retry window, but allows a forced manual retry', async () => {
    const { replace, storage, windowRef } = createRecoveryWindow();
    const now = vi.fn(() => 1_780_000_000_000);
    storage.set(APP_RECOVERY_ATTEMPTED_KEY, String(1_780_000_000_000 - APP_RECOVERY_ATTEMPT_TTL_MS + 1));

    await expect(recoverAppRuntime({ windowRef, now })).resolves.toBe(false);
    expect(replace).not.toHaveBeenCalled();

    await expect(recoverAppRuntime({ windowRef, force: true, now })).resolves.toBe(true);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('does not let legacy recovery markers block a fresh automatic recovery forever', async () => {
    const { replace, storage, windowRef } = createRecoveryWindow();
    const now = vi.fn(() => 1_780_000_000_000);
    storage.set(APP_RECOVERY_ATTEMPTED_KEY, 'true');

    await expect(recoverAppRuntime({ windowRef, now })).resolves.toBe(true);

    expect(storage.get(APP_RECOVERY_ATTEMPTED_KEY)).toBe('1780000000000');
    expect(replace).toHaveBeenCalledWith('http://localhost:8080/dashboard?esportiz_recover=1780000000000');
  });
});
