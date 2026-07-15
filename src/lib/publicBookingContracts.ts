import { isValidIsoDate } from './publicPortalSecurity';

const DEFAULT_COURT_COLOR = '#1DB874';
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface PublicCourtMetadata {
  sportType: string;
  coverage: string;
  pricePerHour: number;
  openingTime: string;
  closingTime: string;
  daysOfWeek: number[];
  usePeakPricing: boolean;
  peakPrice: number;
  peakStart: string;
  peakEnd: string;
}

export interface PublicCourtRecord {
  id: string;
  name: string;
  color: string | null;
  metadata: unknown;
}

export interface PublicCourt extends PublicCourtMetadata {
  id: string;
  name: string;
  color: string;
}

export interface PublicReservation {
  id?: string;
  date: string;
  time: string;
  courtId: string;
  durationMinutes?: number | null;
  status?: string | null;
}

export const DEFAULT_PUBLIC_COURT_METADATA: PublicCourtMetadata = {
  sportType: 'futevolei',
  coverage: 'open',
  pricePerHour: 80,
  openingTime: '07:00',
  closingTime: '23:00',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  usePeakPricing: false,
  peakPrice: 0,
  peakStart: '18:00',
  peakEnd: '22:00',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata) return null;

  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return isRecord(metadata) ? metadata : null;
}

function getStringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function getNonNegativeNumberValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getBooleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getDayArrayValue(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;

  const days = value.filter((item): item is number => Number.isInteger(item) && item >= 0 && item <= 6);
  return days.length ? days : fallback;
}

function getTimeValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && TIME_PATTERN.test(value) ? value : fallback;
}

function getPositiveDuration(value: unknown, fallback = 60): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizePublicCourtMetadata(metadata: unknown): PublicCourtMetadata {
  const parsed = parseMetadata(metadata);
  const fallback = DEFAULT_PUBLIC_COURT_METADATA;

  if (!parsed) {
    return { ...fallback, daysOfWeek: [...fallback.daysOfWeek] };
  }

  return {
    sportType: getStringValue(parsed.sportType, fallback.sportType),
    coverage: getStringValue(parsed.coverage, fallback.coverage),
    pricePerHour: getNonNegativeNumberValue(parsed.pricePerHour, fallback.pricePerHour),
    openingTime: getTimeValue(parsed.openingTime, fallback.openingTime),
    closingTime: getTimeValue(parsed.closingTime, fallback.closingTime),
    daysOfWeek: getDayArrayValue(parsed.daysOfWeek, fallback.daysOfWeek),
    usePeakPricing: getBooleanValue(parsed.usePeakPricing, fallback.usePeakPricing),
    peakPrice: getNonNegativeNumberValue(parsed.peakPrice, fallback.peakPrice),
    peakStart: getTimeValue(parsed.peakStart, fallback.peakStart),
    peakEnd: getTimeValue(parsed.peakEnd, fallback.peakEnd),
  };
}

export function mapPublicCourtRecord(record: PublicCourtRecord): PublicCourt {
  const metadata = normalizePublicCourtMetadata(record.metadata);

  return {
    id: record.id,
    name: record.name,
    color: record.color || DEFAULT_COURT_COLOR,
    sportType: metadata.sportType,
    coverage: metadata.coverage,
    pricePerHour: metadata.pricePerHour > 0 ? metadata.pricePerHour : DEFAULT_PUBLIC_COURT_METADATA.pricePerHour,
    openingTime: metadata.openingTime,
    closingTime: metadata.closingTime,
    daysOfWeek: metadata.daysOfWeek,
    usePeakPricing: metadata.usePeakPricing,
    peakPrice: metadata.peakPrice,
    peakStart: metadata.peakStart,
    peakEnd: metadata.peakEnd,
  };
}

export function parseTimeToMinutes(time: string): number {
  if (!TIME_PATTERN.test(time)) return 0;

  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function doTimeRangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

export function isPublicReservationSlotBusy(
  reservations: PublicReservation[],
  courtId: string,
  date: string,
  slotTime: string,
  durationMinutes: number,
): boolean {
  if (!courtId || !isValidIsoDate(date) || !TIME_PATTERN.test(slotTime)) return true;

  const slotStart = parseTimeToMinutes(slotTime);
  const slotEnd = slotStart + getPositiveDuration(durationMinutes);

  return reservations.some((reservation) => {
    if (reservation.courtId !== courtId) return false;
    if (reservation.date !== date) return false;
    if (reservation.status === 'cancelled') return false;
    if (!TIME_PATTERN.test(reservation.time)) return false;

    const reservationStart = parseTimeToMinutes(reservation.time);
    const reservationEnd = reservationStart + getPositiveDuration(reservation.durationMinutes);

    return doTimeRangesOverlap(reservationStart, reservationEnd, slotStart, slotEnd);
  });
}

export function isTimeWithinPublicRange(time: string, start: string, end: string): boolean {
  if (!TIME_PATTERN.test(time) || !TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) return false;

  if (start <= end) {
    return time >= start && time < end;
  }

  return time >= start || time < end;
}

export function getPublicCourtPriceForTime(court: PublicCourt | undefined, timeSlot: string): number {
  if (!court) return DEFAULT_PUBLIC_COURT_METADATA.pricePerHour;

  if (
    court.usePeakPricing &&
    court.peakPrice > 0 &&
    isTimeWithinPublicRange(timeSlot, court.peakStart, court.peakEnd)
  ) {
    return court.peakPrice;
  }

  return court.pricePerHour;
}
