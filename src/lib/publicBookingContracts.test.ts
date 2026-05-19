import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PUBLIC_COURT_METADATA,
  doTimeRangesOverlap,
  getPublicCourtPriceForTime,
  isPublicReservationSlotBusy,
  isTimeWithinPublicRange,
  mapPublicCourtRecord,
  normalizePublicCourtMetadata,
  parseTimeToMinutes,
  type PublicCourt,
  type PublicReservation,
} from './publicBookingContracts';

const court: PublicCourt = {
  id: 'court-1',
  name: 'Quadra 1',
  color: '#1DB874',
  sportType: 'beach_tennis',
  coverage: 'covered',
  pricePerHour: 120,
  openingTime: '07:00',
  closingTime: '23:00',
  daysOfWeek: [1, 2, 3, 4, 5],
  usePeakPricing: true,
  peakPrice: 160,
  peakStart: '18:00',
  peakEnd: '22:00',
};

describe('publicBookingContracts', () => {
  it('uses safe defaults when court metadata is empty or invalid', () => {
    expect(normalizePublicCourtMetadata(null)).toEqual(DEFAULT_PUBLIC_COURT_METADATA);
    expect(normalizePublicCourtMetadata('not-json')).toEqual(DEFAULT_PUBLIC_COURT_METADATA);
  });

  it('normalizes court metadata from object and JSON values', () => {
    expect(normalizePublicCourtMetadata(JSON.stringify({
      sportType: 'beach_tennis',
      coverage: 'covered',
      pricePerHour: '120',
      openingTime: '06:00',
      closingTime: '23:30',
      daysOfWeek: [0, 1, 2, 7, '3'],
      usePeakPricing: true,
      peakPrice: '180',
      peakStart: '18:00',
      peakEnd: '22:00',
    }))).toEqual({
      sportType: 'beach_tennis',
      coverage: 'covered',
      pricePerHour: 120,
      openingTime: '06:00',
      closingTime: '23:30',
      daysOfWeek: [0, 1, 2],
      usePeakPricing: true,
      peakPrice: 180,
      peakStart: '18:00',
      peakEnd: '22:00',
    });
  });

  it('maps public court records without trusting broken operational metadata', () => {
    expect(mapPublicCourtRecord({
      id: 'court-2',
      name: 'Quadra 2',
      color: null,
      metadata: {
        pricePerHour: -50,
        openingTime: '99:99',
        closingTime: '',
        daysOfWeek: [],
      },
    })).toMatchObject({
      id: 'court-2',
      name: 'Quadra 2',
      color: '#1DB874',
      pricePerHour: 80,
      openingTime: '07:00',
      closingTime: '23:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    });
  });

  it('detects slot conflicts using overlap math and ignores cancelled reservations', () => {
    const reservations: PublicReservation[] = [
      { courtId: 'court-1', date: '2026-05-19', time: '16:30', durationMinutes: 60, status: 'confirmed' },
      { courtId: 'court-1', date: '2026-05-19', time: '18:00', durationMinutes: 60, status: 'cancelled' },
      { courtId: 'court-2', date: '2026-05-19', time: '16:00', durationMinutes: 60, status: 'confirmed' },
    ];

    expect(isPublicReservationSlotBusy(reservations, 'court-1', '2026-05-19', '16:00', 60)).toBe(true);
    expect(isPublicReservationSlotBusy(reservations, 'court-1', '2026-05-19', '17:30', 30)).toBe(false);
    expect(isPublicReservationSlotBusy(reservations, 'court-1', '2026-05-19', '18:00', 60)).toBe(false);
    expect(isPublicReservationSlotBusy(reservations, 'court-2', '2026-05-19', '16:00', 60)).toBe(true);
  });

  it('keeps invalid booking requests unavailable by default', () => {
    expect(isPublicReservationSlotBusy([], '', '2026-05-19', '16:00', 60)).toBe(true);
    expect(isPublicReservationSlotBusy([], 'court-1', '2026-02-31', '16:00', 60)).toBe(true);
    expect(isPublicReservationSlotBusy([], 'court-1', '2026-05-19', '99:99', 60)).toBe(true);
  });

  it('calculates public prices with standard and peak windows', () => {
    expect(getPublicCourtPriceForTime(court, '17:59')).toBe(120);
    expect(getPublicCourtPriceForTime(court, '18:00')).toBe(160);
    expect(getPublicCourtPriceForTime(court, '21:59')).toBe(160);
    expect(getPublicCourtPriceForTime(court, '22:00')).toBe(120);
    expect(getPublicCourtPriceForTime(undefined, '18:00')).toBe(80);
  });

  it('supports overnight public time ranges safely', () => {
    expect(isTimeWithinPublicRange('23:00', '22:00', '02:00')).toBe(true);
    expect(isTimeWithinPublicRange('01:30', '22:00', '02:00')).toBe(true);
    expect(isTimeWithinPublicRange('12:00', '22:00', '02:00')).toBe(false);
  });

  it('parses HH:mm times and exposes overlap contract explicitly', () => {
    expect(parseTimeToMinutes('07:30')).toBe(450);
    expect(parseTimeToMinutes('invalid')).toBe(0);
    expect(doTimeRangesOverlap(960, 1020, 990, 1050)).toBe(true);
    expect(doTimeRangesOverlap(960, 1020, 1020, 1080)).toBe(false);
  });
});
