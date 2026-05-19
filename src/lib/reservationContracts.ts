import type { Json, Tables } from '@/integrations/supabase/types';

export type ReservationType = 'avulsa' | 'mensalista' | 'blocked';
export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'a_receber';
export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled';
export type ReservationPaymentStatus = 'paid' | 'pending';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  a_receber: 'A Receber',
};

export const RESERVATION_TYPE_LABELS: Record<ReservationType, string> = {
  avulsa: 'Avulsa',
  mensalista: 'Mensalista',
  blocked: '🔒 Bloquear Horário / Fechar Quadra',
};

export interface ReservationMeta {
  price: number;
  discount: number;
  finalPrice: number;
  reservationType: ReservationType;
  paymentMethod: PaymentMethod;
  paymentStatus: ReservationPaymentStatus;
  status: ReservationStatus;
  online?: boolean;
  paymentUpdatedAt?: string;
  paymentPaidAt?: string;
}

export interface Reservation {
  id: string;
  date: string;
  time: string;
  courtId: string;
  reservanteIds: string[];
  durationMinutes: number;
  notes: string;
  completed: boolean;
  price: number;
  discount: number;
  finalPrice: number;
  reservationType: ReservationType;
  paymentMethod: PaymentMethod;
  paymentStatus: ReservationPaymentStatus;
  status: ReservationStatus;
  online?: boolean;
  paymentUpdatedAt?: string;
  paymentPaidAt?: string;
}

export interface AddReservationInput {
  date: string;
  time: string;
  courtId: string;
  reservanteIds: string[];
  durationMinutes: number;
  notes: string;
  meta: ReservationMeta;
}

export type TrainingRowWithStudents = Tables<'trainings'> & {
  training_students?: { student_id: string | null }[] | null;
};

const DEFAULT_META: ReservationMeta = {
  price: 0,
  discount: 0,
  finalPrice: 0,
  reservationType: 'avulsa',
  paymentMethod: 'pix',
  paymentStatus: 'pending',
  status: 'confirmed',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asReservationType(value: unknown): ReservationType {
  return value === 'mensalista' || value === 'blocked' ? value : 'avulsa';
}

function asPaymentMethod(value: unknown): PaymentMethod {
  return value === 'cartao' || value === 'dinheiro' || value === 'a_receber' ? value : 'pix';
}

function asPaymentStatus(value: unknown): ReservationPaymentStatus {
  return value === 'paid' ? 'paid' : 'pending';
}

function asReservationStatus(value: unknown): ReservationStatus {
  return value === 'pending' || value === 'cancelled' ? value : 'confirmed';
}

export function parseReservationMeta(raw: Json | string | null | undefined): ReservationMeta {
  if (!raw) return { ...DEFAULT_META };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!isRecord(parsed)) return { ...DEFAULT_META };

    const reservationType = asReservationType(parsed.reservationType);
    const finalPrice = reservationType === 'blocked'
      ? 0
      : Math.max(0, asNumber(parsed.finalPrice, DEFAULT_META.finalPrice));

    return {
      price: reservationType === 'blocked' ? 0 : Math.max(0, asNumber(parsed.price, DEFAULT_META.price)),
      discount: reservationType === 'blocked' ? 0 : Math.max(0, asNumber(parsed.discount, DEFAULT_META.discount)),
      finalPrice,
      reservationType,
      paymentMethod: asPaymentMethod(parsed.paymentMethod),
      paymentStatus: finalPrice === 0 ? 'paid' : asPaymentStatus(parsed.paymentStatus),
      status: asReservationStatus(parsed.status),
      online: parsed.online === true,
      paymentUpdatedAt: typeof parsed.paymentUpdatedAt === 'string' ? parsed.paymentUpdatedAt : undefined,
      paymentPaidAt: typeof parsed.paymentPaidAt === 'string' ? parsed.paymentPaidAt : undefined,
    };
  } catch {
    return { ...DEFAULT_META };
  }
}

export function toReservation(row: TrainingRowWithStudents): Reservation {
  const meta = parseReservationMeta(row.metadata);
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    courtId: row.modality_id || '',
    reservanteIds: (row.training_students || [])
      .map((ts) => ts.student_id)
      .filter((studentId): studentId is string => Boolean(studentId)),
    durationMinutes: row.duration_minutes || 60,
    notes: row.notes || '',
    completed: row.completed || false,
    ...meta,
  };
}
