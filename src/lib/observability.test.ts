import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  installGlobalErrorHandlers,
  reportError,
  reportWarning,
  setObservabilitySink,
  type ObservabilityEvent,
} from './observability';

describe('observability', () => {
  afterEach(() => {
    setObservabilitySink(null);
    vi.restoreAllMocks();
  });

  it('redacts sensitive keys and values before emitting an error', () => {
    const events: ObservabilityEvent[] = [];
    setObservabilitySink((event) => { events.push(event); });

    const event = reportError(
      'profile.load_failed',
      new Error('Falha para owner@example.com com Bearer secret-token'),
      {
        email: 'owner@example.com',
        accessToken: 'secret-token',
        nested: { safe: 'contexto permitido', cpf: '12345678900' },
      },
    );

    expect(events).toEqual([event]);
    expect(event.error?.message).toBe('Falha para [redacted-email] com Bearer [redacted]');
    expect(event.context).toEqual({
      email: '[redacted]',
      accessToken: '[redacted]',
      nested: { safe: 'contexto permitido', cpf: '[redacted]' },
    });
  });

  it('emits structured warnings without attaching raw errors', () => {
    const sink = vi.fn();
    setObservabilitySink(sink);

    const event = reportWarning('storage.write_failed', {
      reason: new Error('Quota exceeded'),
    });

    expect(event).toMatchObject({
      level: 'warning',
      name: 'storage.write_failed',
      context: {
        reason: { name: 'Error', message: 'Quota exceeded' },
      },
    });
    expect(sink).toHaveBeenCalledWith(event);
  });

  it('captures and removes the browser error listener', () => {
    const sink = vi.fn();
    setObservabilitySink(sink);
    const cleanup = installGlobalErrorHandlers(window);

    window.dispatchEvent(new ErrorEvent('error', {
      error: new Error('Falha global'),
      filename: 'https://esportiz.com.br/assets/app.js',
      lineno: 10,
      colno: 2,
    }));

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toMatchObject({
      name: 'browser.unhandled_error',
      error: { message: 'Falha global' },
    });

    const removeListener = vi.spyOn(window, 'removeEventListener');
    cleanup();
    expect(removeListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
  });
});