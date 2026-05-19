import { describe, expect, it } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('formatCurrency', () => {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  it('formats integer values as Brazilian currency', () => {
    expect(formatCurrency(1250)).toBe(formatter.format(1250));
  });

  it('keeps two decimal places for cents and zero values', () => {
    expect(formatCurrency(99.5)).toBe(formatter.format(99.5));
    expect(formatCurrency(0)).toBe(formatter.format(0));
  });
});
