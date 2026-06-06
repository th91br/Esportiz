import { describe, expect, it } from 'vitest';

import { getFunctionErrorMessage } from './functionErrorUtils';

describe('getFunctionErrorMessage', () => {
  it('returns the error message from an Edge Function response body', async () => {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: new Response(JSON.stringify({ error: 'E-mail ja cadastrado no sistema.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    };

    await expect(getFunctionErrorMessage(error)).resolves.toBe('E-mail ja cadastrado no sistema.');
  });

  it('falls back to the regular error message when there is no response body', async () => {
    await expect(getFunctionErrorMessage(new Error('Falha de rede.'))).resolves.toBe('Falha de rede.');
  });
});
