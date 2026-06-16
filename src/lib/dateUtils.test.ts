import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatDateOnlyBr,
  getLocalTodayDate,
  getMonthNamePtBr,
  parseBrazilianDateToIso,
  toLocalDateString,
} from './dateUtils';

describe('dateUtils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats a Date as YYYY-MM-DD using local date parts', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalDateString(new Date(2026, 10, 9, 0, 1))).toBe('2026-11-09');
  });

  it('returns today in local YYYY-MM-DD format', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 18, 22, 30));

    expect(getLocalTodayDate()).toBe('2026-05-18');
  });

  it('formats database date-only values without shifting the calendar day', () => {
    expect(formatDateOnlyBr('2010-05-21')).toBe('21/05/2010');
  });

  it('converts a valid Brazilian date to the database ISO format', () => {
    expect(parseBrazilianDateToIso('21/05/2010')).toBe('2010-05-21');
    expect(parseBrazilianDateToIso('31/02/2010')).toBeNull();
  });

  it('returns Portuguese month names for valid month indexes', () => {
    expect(getMonthNamePtBr(0)).toBe('Janeiro');
    expect(getMonthNamePtBr(2)).toBe('Março');
    expect(getMonthNamePtBr(11)).toBe('Dezembro');
  });

  it('returns an empty month name for indexes outside the calendar range', () => {
    expect(getMonthNamePtBr(-1)).toBe('');
    expect(getMonthNamePtBr(12)).toBe('');
  });
});
