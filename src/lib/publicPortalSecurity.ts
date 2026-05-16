import { getLocalTodayDate } from '@/lib/dateUtils';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function formatCpf(value: string): string {
  const digits = normalizeDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (base: string, startWeight: number) => {
    const sum = base
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (startWeight - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const firstDigit = calculateDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateDigit(cpf.slice(0, 10), 11);

  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
}

export function formatBrazilPhone(value: string): string {
  const digits = normalizeDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidBrazilPhone(value: string): boolean {
  const digits = normalizeDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function normalizePublicName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 120);
}

export function normalizePublicEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 254);
}

export function isValidPublicEmail(value: string): boolean {
  const email = normalizePublicEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function isTodayOrPastDate(value: string): boolean {
  return isValidIsoDate(value) && value <= getLocalTodayDate();
}

export function isTodayOrFutureDate(value: string): boolean {
  return isValidIsoDate(value) && value >= getLocalTodayDate();
}
