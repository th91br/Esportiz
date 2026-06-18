/**
 * Helper to get the current date in YYYY-MM-DD format using the local timezone.
 * This avoids the bug where `new Date().toISOString().split('T')[0]` returns tomorrow's date 
 * after 21:00 in UTC-3 (Brazil).
 */
export function getLocalTodayDate(): string {
  return toLocalDateString(new Date());
}

/**
 * Helper to convert any Date object into YYYY-MM-DD using the local timezone.
 */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES_PT_BR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const SHORT_MONTH_NAMES_PT_BR = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

export function getMonthNamePtBr(monthIndex: number): string {
  return MONTH_NAMES_PT_BR[monthIndex] ?? '';
}

export function getShortMonthNamePtBr(monthIndex: number): string {
  return SHORT_MONTH_NAMES_PT_BR[monthIndex] ?? '';
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

/**
 * Formats a PostgreSQL DATE value without converting it through a timezone.
 */
export function formatDateOnlyBr(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return '';

  const [, year, month, day] = match;
  if (!isValidCalendarDate(Number(year), Number(month), Number(day))) return '';

  return `${day}/${month}/${year}`;
}

/**
 * Converts a Brazilian civil date to the ISO format expected by PostgreSQL DATE.
 */
export function parseBrazilianDateToIso(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  if (!isValidCalendarDate(year, month, day)) return null;

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
