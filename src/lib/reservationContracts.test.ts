import { describe, expect, it } from 'vitest';
import {
  parseReservationMeta,
  toReservation,
  type TrainingRowWithStudents,
} from './reservationContracts';

function makeTrainingRow(overrides: Partial<TrainingRowWithStudents> = {}): TrainingRowWithStudents {
  return {
    id: 'reservation-1',
    user_id: 'user-1',
    business_type: 'arena',
    date: '2026-05-19',
    time: '16:00',
    modality_id: 'court-1',
    duration_minutes: 90,
    notes: 'TESTE F9.4',
    completed: false,
    completed_at: null,
    created_at: '2026-05-18T10:00:00+00:00',
    google_event_id: null,
    location: '',
    metadata: null,
    updated_at: '2026-05-18T10:00:00+00:00',
    training_students: [],
    ...overrides,
  } as TrainingRowWithStudents;
}

describe('reservationContracts', () => {
  it('returns safe default metadata for empty or invalid metadata', () => {
    expect(parseReservationMeta(null)).toEqual({
      price: 0,
      discount: 0,
      finalPrice: 0,
      reservationType: 'avulsa',
      paymentMethod: 'pix',
      paymentStatus: 'pending',
      status: 'confirmed',
    });

    expect(parseReservationMeta('not-json')).toEqual({
      price: 0,
      discount: 0,
      finalPrice: 0,
      reservationType: 'avulsa',
      paymentMethod: 'pix',
      paymentStatus: 'pending',
      status: 'confirmed',
    });
  });

  it('normalizes reservation metadata from JSON strings', () => {
    expect(parseReservationMeta(JSON.stringify({
      price: '120',
      discount: '20',
      finalPrice: '100',
      reservationType: 'mensalista',
      paymentMethod: 'dinheiro',
      paymentStatus: 'paid',
      status: 'pending',
      online: true,
      paymentUpdatedAt: '2026-05-18T10:00:00+00:00',
      paymentPaidAt: '2026-05-18T10:01:00+00:00',
    }))).toEqual({
      price: 120,
      discount: 20,
      finalPrice: 100,
      reservationType: 'mensalista',
      paymentMethod: 'dinheiro',
      paymentStatus: 'paid',
      status: 'pending',
      online: true,
      paymentUpdatedAt: '2026-05-18T10:00:00+00:00',
      paymentPaidAt: '2026-05-18T10:01:00+00:00',
    });
  });

  it('keeps blocked court slots financially neutral and already unavailable', () => {
    expect(parseReservationMeta({
      price: 999,
      discount: 999,
      finalPrice: 999,
      reservationType: 'blocked',
      paymentMethod: 'a_receber',
      paymentStatus: 'pending',
      status: 'confirmed',
    })).toMatchObject({
      price: 0,
      discount: 0,
      finalPrice: 0,
      reservationType: 'blocked',
      paymentStatus: 'paid',
      status: 'confirmed',
    });
  });

  it('clamps negative money values and falls back from invalid enum values', () => {
    expect(parseReservationMeta({
      price: -100,
      discount: -10,
      finalPrice: -90,
      reservationType: 'course',
      paymentMethod: 'boleto',
      paymentStatus: 'unknown',
      status: 'deleted',
    })).toMatchObject({
      price: 0,
      discount: 0,
      finalPrice: 0,
      reservationType: 'avulsa',
      paymentMethod: 'pix',
      paymentStatus: 'paid',
      status: 'confirmed',
    });
  });

  it('maps training rows into operational arena reservations', () => {
    const reservation = toReservation(makeTrainingRow({
      duration_minutes: null,
      notes: null,
      modality_id: null,
      completed: null,
      metadata: {
        price: 100,
        discount: 0,
        finalPrice: 100,
        reservationType: 'avulsa',
        paymentMethod: 'pix',
        paymentStatus: 'pending',
        status: 'confirmed',
      },
      training_students: [
        { student_id: 'student-1' },
        { student_id: null },
        { student_id: 'student-2' },
      ],
    }));

    expect(reservation).toMatchObject({
      id: 'reservation-1',
      date: '2026-05-19',
      time: '16:00',
      courtId: '',
      reservanteIds: ['student-1', 'student-2'],
      durationMinutes: 60,
      notes: '',
      completed: false,
      finalPrice: 100,
      paymentStatus: 'pending',
    });
  });
});
