import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json, Tables, TablesUpdate } from '@/integrations/supabase/types';

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

const DEFAULT_META: ReservationMeta = {
  price: 0,
  discount: 0,
  finalPrice: 0,
  reservationType: 'avulsa',
  paymentMethod: 'pix',
  paymentStatus: 'pending',
  status: 'confirmed',
};

type TrainingRowWithStudents = Tables<'trainings'> & {
  training_students?: { student_id: string | null }[] | null;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado';
}

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

function parseMeta(raw: Json | string | null | undefined): ReservationMeta {
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

function toReservation(row: TrainingRowWithStudents): Reservation {
  const meta = parseMeta(row.metadata);
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

export interface AddReservationInput {
  date: string;
  time: string;
  courtId: string;
  reservanteIds: string[];
  durationMinutes: number;
  notes: string;
  meta: ReservationMeta;
}

export function useReservations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reservations = [], isLoading: loadingReservations } = useQuery({
    queryKey: ['reservations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('trainings')
        .select('*, training_students(student_id)')
        .eq('user_id', user.id)
        .eq('business_type', 'arena')
        .order('date')
        .order('time');
      if (error) throw error;
      return (data || []).map(toReservation);
    },
    enabled: !!user,
  });

  const addReservation = useMutation({
    mutationFn: async (input: AddReservationInput) => {
      if (!user) throw new Error('Não autenticado');
      const { data: training, error } = await supabase
        .from('trainings')
        .insert({
          user_id: user.id,
          business_type: 'arena',
          date: input.date,
          time: input.time,
          modality_id: input.courtId,
          duration_minutes: input.durationMinutes,
          notes: input.notes,
          location: '',
          metadata: input.meta as unknown as Json,
        })
        .select()
        .single();
      if (error) throw error;
      if (input.reservanteIds.length > 0) {
        const { error: insertError } = await supabase.from('training_students').insert(
          input.reservanteIds.map(sid => ({
            training_id: training.id,
            student_id: sid,
            user_id: user.id,
          }))
        );
        if (insertError) throw insertError;
      }
      return training;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Reserva criada com sucesso!');
    },
    onError: (error: unknown) => toast.error('Erro ao criar reserva: ' + getErrorMessage(error)),
  });

  const updateReservation = useMutation({
    mutationFn: async (params: { id: string; input: Partial<AddReservationInput> }) => {
      if (!user) throw new Error('Não autenticado');
      const { id, input } = params;
      const updates: TablesUpdate<'trainings'> = {};
      if (input.date !== undefined) updates.date = input.date;
      if (input.time !== undefined) updates.time = input.time;
      if (input.courtId !== undefined) updates.modality_id = input.courtId;
      if (input.durationMinutes !== undefined) updates.duration_minutes = input.durationMinutes;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.meta !== undefined) updates.metadata = input.meta as unknown as Json;
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('trainings')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id)
          .eq('business_type', 'arena');
        if (error) throw error;
      }
      if (input.reservanteIds !== undefined) {
        const { error: deleteError } = await supabase
          .from('training_students')
          .delete()
          .eq('training_id', id)
          .eq('user_id', user.id);
        if (deleteError) throw deleteError;

        if (input.reservanteIds.length > 0) {
          const { error: insertError } = await supabase.from('training_students').insert(
            input.reservanteIds.map(sid => ({ training_id: id, student_id: sid, user_id: user.id }))
          );
          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Reserva atualizada!');
    },
    onError: (error: unknown) => toast.error('Erro ao atualizar reserva: ' + getErrorMessage(error)),
  });

  const deleteReservation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Nao autenticado');
      const { error } = await supabase
        .from('trainings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('business_type', 'arena');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast.success('Reserva removida!');
    },
    onError: (error: unknown) => toast.error('Erro ao remover reserva: ' + getErrorMessage(error)),
  });

  const setReservationPaymentStatus = useMutation({
    mutationFn: async (params: {
      id: string;
      paymentStatus: ReservationPaymentStatus;
      paymentMethod?: PaymentMethod | null;
    }) => {
      if (!user) throw new Error('Nao autenticado');
      const { error } = await supabase.rpc('set_arena_reservation_payment_status_atomic', {
        p_reservation_id: params.id,
        p_payment_status: params.paymentStatus,
        p_payment_method: params.paymentMethod ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
    },
    onError: (error: unknown) => toast.error('Erro ao atualizar pagamento da reserva: ' + getErrorMessage(error)),
  });

  return {
    reservations,
    loadingReservations,
    addReservation: addReservation.mutateAsync,
    updateReservation: updateReservation.mutateAsync,
    deleteReservation: deleteReservation.mutateAsync,
    setReservationPaymentStatus: setReservationPaymentStatus.mutateAsync,
  };
}
