import { getCourtAvailableHoursInMonth, type CourtAvailabilityInput } from './dateUtils';

export interface ArenaOccupancyCourt extends CourtAvailabilityInput {
  id: string;
  isActive?: boolean | null;
}

export interface ArenaOccupancyReservation {
  courtId: string;
  date: string;
  time: string;
  durationMinutes?: number | null;
  status?: string | null;
}

export interface ArenaOccupancySummary {
  totalHoursAvailable: number;
  totalHoursOccupied: number;
  rate: number;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time || !TIME_PATTERN.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getPositiveDurationMinutes(duration: number | null | undefined): number {
  const parsed = Number(duration);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

function getIsoDayOfWeek(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day).getDay();
}

function getReservationOccupiedInterval(
  reservation: ArenaOccupancyReservation,
  court: ArenaOccupancyCourt,
): [number, number] | null {
  const dayOfWeek = getIsoDayOfWeek(reservation.date);
  if (dayOfWeek === null) return null;

  const activeDays = new Set(court.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 0]);
  if (!activeDays.has(dayOfWeek)) return null;

  const reservationStart = parseTimeToMinutes(reservation.time);
  if (reservationStart === null) return null;

  const reservationEnd = reservationStart + getPositiveDurationMinutes(reservation.durationMinutes);
  const opening = parseTimeToMinutes(court.openingTime);
  const closing = parseTimeToMinutes(court.closingTime);
  if (opening === null || closing === null) return [reservationStart, reservationEnd];

  const operatingStart = opening;
  let operatingEnd = closing;
  let start = reservationStart;
  let end = reservationEnd;

  if (operatingEnd <= operatingStart) {
    operatingEnd += 24 * 60;
    if (start < operatingStart) {
      start += 24 * 60;
      end += 24 * 60;
    }
  }

  const clippedStart = Math.max(start, operatingStart);
  const clippedEnd = Math.min(end, operatingEnd);

  return clippedEnd > clippedStart ? [clippedStart, clippedEnd] : null;
}

function sumMergedIntervals(intervals: Array<[number, number]>): number {
  if (intervals.length === 0) return 0;

  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let totalMinutes = 0;
  let [currentStart, currentEnd] = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    if (start <= currentEnd) {
      currentEnd = Math.max(currentEnd, end);
      continue;
    }

    totalMinutes += currentEnd - currentStart;
    currentStart = start;
    currentEnd = end;
  }

  totalMinutes += currentEnd - currentStart;
  return totalMinutes / 60;
}

export function calculateArenaOccupancy(params: {
  courts: ArenaOccupancyCourt[];
  reservations: ArenaOccupancyReservation[];
  year: number;
  month: number;
}): ArenaOccupancySummary {
  const { courts, reservations, year, month } = params;
  const monthRef = `${year}-${String(month + 1).padStart(2, '0')}`;
  const activeCourts = courts.filter((court) => court.isActive === true);
  const activeCourtById = new Map(activeCourts.map((court) => [court.id, court]));
  const totalHoursAvailable = activeCourts.reduce(
    (sum, court) => sum + getCourtAvailableHoursInMonth(court, year, month),
    0,
  );

  const intervalsByCourtDate = new Map<string, Array<[number, number]>>();

  reservations.forEach((reservation) => {
    if (!reservation.date.startsWith(monthRef)) return;
    if (reservation.status === 'cancelled') return;

    const court = activeCourtById.get(reservation.courtId);
    if (!court) return;

    const interval = getReservationOccupiedInterval(reservation, court);
    if (!interval) return;

    const key = `${reservation.courtId}:${reservation.date}`;
    const intervals = intervalsByCourtDate.get(key) ?? [];
    intervals.push(interval);
    intervalsByCourtDate.set(key, intervals);
  });

  const totalHoursOccupied = Array.from(intervalsByCourtDate.values()).reduce(
    (sum, intervals) => sum + sumMergedIntervals(intervals),
    0,
  );

  return {
    totalHoursAvailable,
    totalHoursOccupied,
    rate: totalHoursAvailable > 0
      ? Math.round((totalHoursOccupied / totalHoursAvailable) * 100)
      : 0,
  };
}
