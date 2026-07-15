import { describe, expect, it } from 'vitest';
import { calculateArenaOccupancy } from './arenaOccupancy';

const baseCourt = {
  id: 'court-1',
  isActive: true,
  openingTime: '07:00',
  closingTime: '09:00',
  daysOfWeek: [5],
};

describe('calculateArenaOccupancy', () => {
  it('counts only occupied intervals from active courts in the selected month', () => {
    const result = calculateArenaOccupancy({
      courts: [
        baseCourt,
        { ...baseCourt, id: 'inactive-court', isActive: false },
      ],
      reservations: [
        { courtId: 'court-1', date: '2026-05-01', time: '07:00', durationMinutes: 60, status: 'confirmed' },
        { courtId: 'court-1', date: '2026-05-08', time: '08:00', durationMinutes: 60, status: 'pending' },
        { courtId: 'court-1', date: '2026-05-15', time: '07:00', durationMinutes: 60, status: 'cancelled' },
        { courtId: 'inactive-court', date: '2026-05-01', time: '07:00', durationMinutes: 120, status: 'confirmed' },
      ],
      year: 2026,
      month: 4,
    });

    expect(result.totalHoursAvailable).toBe(10);
    expect(result.totalHoursOccupied).toBe(2);
    expect(result.rate).toBe(20);
  });

  it('merges overlapping reservations so occupancy never double-counts the same court time', () => {
    const result = calculateArenaOccupancy({
      courts: [baseCourt],
      reservations: [
        { courtId: 'court-1', date: '2026-05-01', time: '07:00', durationMinutes: 60, status: 'confirmed' },
        { courtId: 'court-1', date: '2026-05-01', time: '07:30', durationMinutes: 60, status: 'confirmed' },
      ],
      year: 2026,
      month: 4,
    });

    expect(result.totalHoursAvailable).toBe(10);
    expect(result.totalHoursOccupied).toBe(1.5);
    expect(result.rate).toBe(15);
  });

  it('clips reservations to the configured operating hours of the court', () => {
    const result = calculateArenaOccupancy({
      courts: [baseCourt],
      reservations: [
        { courtId: 'court-1', date: '2026-05-01', time: '06:30', durationMinutes: 120, status: 'confirmed' },
      ],
      year: 2026,
      month: 4,
    });

    expect(result.totalHoursOccupied).toBe(1.5);
    expect(result.rate).toBe(15);
  });
});
