import { describe, expect, it } from 'vitest';
import { generatePixCopiaCola } from './pixPayload';

describe('Pix payload', () => {
  it('generates a deterministic EMV payload with normalized merchant data and CRC', () => {
    expect(generatePixCopiaCola('pix@esportiz.com.br', 123.45, 'Esportiz São Paulo')).toBe(
      '00020126410014br.gov.bcb.pix0119pix@esportiz.com.br5204000053039865406123.455802BR5918ESPORTIZ SAO PAULO6008BRASILIA62070503***6304E65F',
    );
  });

  it('trims the Pix key and limits the normalized receiver name to 25 characters', () => {
    const payload = generatePixCopiaCola(' 11999999999 ', 1, 'Arena Esportiva Muito Longa São Paulo');
    expect(payload).toContain('011111999999999');
    expect(payload).toContain('5925ARENA ESPORTIVA MUITO LON');
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it('rejects missing keys and invalid payment amounts', () => {
    expect(() => generatePixCopiaCola('', 10, 'Esportiz')).toThrow('A chave Pix é obrigatória.');
    expect(() => generatePixCopiaCola('pix@example.com', 0, 'Esportiz')).toThrow('O valor do Pix deve ser positivo.');
    expect(() => generatePixCopiaCola('pix@example.com', Number.NaN, 'Esportiz')).toThrow('O valor do Pix deve ser positivo.');
  });
});