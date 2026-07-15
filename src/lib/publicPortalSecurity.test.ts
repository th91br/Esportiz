import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatBrazilPhone,
  formatCpf,
  isTodayOrFutureDate,
  isTodayOrPastDate,
  isValidBrazilPhone,
  isValidCpf,
  isValidIsoDate,
  isValidPublicEmail,
  isValidUuid,
  normalizeDigits,
  normalizePublicEmail,
  normalizePublicName,
} from './publicPortalSecurity';

describe('publicPortalSecurity', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes and validates cpf values used by public portals', () => {
    expect(normalizeDigits('529.982.247-25')).toBe('52998224725');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('529.982.247-24')).toBe(false);
  });

  it('normalizes phone, name and email inputs without expanding payloads', () => {
    expect(formatBrazilPhone('54981167720')).toBe('(54) 98116-7720');
    expect(isValidBrazilPhone('(54) 98116-7720')).toBe(true);
    expect(isValidBrazilPhone('123')).toBe(false);
    expect(normalizePublicName('  Thiago   Cassol  ')).toBe('Thiago Cassol');
    expect(normalizePublicEmail('  TESTE@ESPORTIZ.COM.BR  ')).toBe('teste@esportiz.com.br');
    expect(isValidPublicEmail('teste@esportiz.com.br')).toBe(true);
    expect(isValidPublicEmail('sem-email')).toBe(false);
  });

  it('validates public date limits with local today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 10, 0));

    expect(isValidIsoDate('2026-05-19')).toBe(true);
    expect(isValidIsoDate('2026-02-31')).toBe(false);
    expect(isTodayOrPastDate('2026-05-18')).toBe(true);
    expect(isTodayOrPastDate('2026-05-20')).toBe(false);
    expect(isTodayOrFutureDate('2026-05-20')).toBe(true);
    expect(isTodayOrFutureDate('2026-05-18')).toBe(false);
  });

  it('accepts only uuid values as tenant scope identifiers', () => {
    expect(isValidUuid('03c363bd-188b-4263-82a0-375c7fc1cb6a')).toBe(true);
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid(null)).toBe(false);
  });
});
