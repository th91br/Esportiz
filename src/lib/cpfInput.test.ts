import { describe, expect, it } from 'vitest';
import { formatCpfInputValue } from './cpfInput';

describe('cpfInput', () => {
  it('formats typed cpf digits progressively', () => {
    expect(formatCpfInputValue('1')).toBe('1');
    expect(formatCpfInputValue('1234')).toBe('123.4');
    expect(formatCpfInputValue('1234567')).toBe('123.456.7');
    expect(formatCpfInputValue('12345678901')).toBe('123.456.789-01');
  });

  it('ignores punctuation and limits input to 11 cpf digits', () => {
    expect(formatCpfInputValue('123.456abc789-01999')).toBe('123.456.789-01');
  });
});
