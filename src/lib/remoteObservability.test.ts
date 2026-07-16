import { afterEach, describe, expect, it, vi } from 'vitest';

import { reportError, setObservabilitySink } from './observability';
import { initializeRemoteObservability } from './remoteObservability';

describe('remoteObservability', () => {
  afterEach(() => {
    setObservabilitySink(null);
    vi.restoreAllMocks();
  });

  it('stays disabled and does not load the SDK without a DSN', async () => {
    const loadSdk = vi.fn();

    await expect(initializeRemoteObservability({ dsn: '', loadSdk })).resolves.toEqual({
      enabled: false,
    });
    expect(loadSdk).not.toHaveBeenCalled();
  });

  it('initializes a privacy-first SDK and forwards sanitized events', async () => {
    const init = vi.fn();
    const captureMessage = vi.fn();
    const scope = {
      setExtra: vi.fn(),
      setLevel: vi.fn(),
      setTag: vi.fn(),
    };
    const loadSdk = vi.fn(async () => ({
      init,
      captureMessage,
      withScope: (callback: (nextScope: typeof scope) => void) => callback(scope),
    }));

    await expect(initializeRemoteObservability({
      dsn: 'https://public@example.ingest.sentry.io/1',
      environment: 'test',
      loadSdk,
      release: 'test-release',
      sampleRate: 2,
    })).resolves.toEqual({ enabled: true });

    expect(init).toHaveBeenCalledWith(expect.objectContaining({
      attachStacktrace: false,
      defaultIntegrations: false,
      maxBreadcrumbs: 0,
      sampleRate: 1,
      sendDefaultPii: false,
    }));

    const beforeSend = init.mock.calls[0][0].beforeSend;
    expect(beforeSend({
      request: {
        cookies: { session: 'secret' },
        data: { cpf: '123' },
        headers: { authorization: 'Bearer secret' },
        url: 'https://app.esportiz.com.br/portal-aluno?ct=secret#payment',
      },
      user: { email: 'owner@example.com' },
    })).toEqual({
      request: {
        cookies: undefined,
        data: undefined,
        headers: undefined,
        url: 'https://app.esportiz.com.br/portal-aluno',
      },
      user: undefined,
    });

    reportError('profile.load_failed', new Error('Falha para owner@example.com'), {
      cpf: '12345678900',
      route: '/dashboard',
    });

    expect(scope.setExtra).toHaveBeenCalledWith('sanitized_context', {
      cpf: '[redacted]',
      route: '/dashboard',
    });
    expect(captureMessage).toHaveBeenCalledWith(
      'profile.load_failed: Falha para [redacted-email]',
      'error',
    );
  });
});
