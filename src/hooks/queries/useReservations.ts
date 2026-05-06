import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ReservationType = 'avulsa' | 'mensalista' | 'experimental';
export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'a_receber';
export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  a_receber: 'A Receber',
};

export const RESERVATION_TYPE_LABELS: Record<ReservationType, string> = {
  avulsa: 'Avulsa',
  mensalista: 'Mensalista',
  experimental: 'Experimental (Grátis)',
};

export interface ReservationMeta {
  price: number;
  discount: number;
  finalPrice: number;
  reservationType: ReservationType;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'pending';
  status: ReservationStatus;
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
  paymentStatus: 'paid' | 'pending';
  status: ReservationStatus;
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

function parseMeta(raw: any): ReservationMeta {
  if (!raw) return { ...DEFAULT_META };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...DEFAULT_META, ...parsed };
  } catch {
    return { ...DEFAULT_META };
  }
}

function toReservation(row: any): Reservation {
  const meta = parseMeta((row as any).metadata);
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    courtId: row.modality_id || '',
    reservanteIds: (row.training_students || []).map((ts: any) => ts.student_id),
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
          ...({ metadata: JSON.stringify(input.meta) } as any),
        } as any)
        .select()
        .single();
      if (error) throw error;
      if (input.reservanteIds.length > 0) {
        await supabase.from('training_students').insert(
          input.reservanteIds.map(sid => ({
            training_id: training.id,
            student_id: sid,
            user_id: user.id,
          }))
        );
      }
      return training;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva criada com sucesso!');
    },
    onError: (e: any) => toast.error('Erro ao criar reserva: ' + e.message),
  });

  const updateReservation = useMutation({
    mutationFn: async (params: { id: string; input: Partial<AddReservationInput> }) => {
      if (!user) throw new Error('Não autenticado');
      const { id, input } = params;
      const updates: any = {};
      if (input.date !== undefined) updates.date = input.date;
      if (input.time !== undefined) updates.time = input.time;
      if (input.courtId !== undefined) updates.modality_id = input.courtId;
      if (input.durationMinutes !== undefined) updates.duration_minutes = input.durationMinutes;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.meta !== undefined) updates.metadata = JSON.stringify(input.meta);
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('trainings').update(updates).eq('id', id);
        if (error) throw error;
      }
      if (input.reservanteIds !== undefined) {
        await supabase.from('training_students').delete().eq('training_id', id);
        if (input.reservanteIds.length > 0) {
          await supabase.from('training_students').insert(
            input.reservanteIds.map(sid => ({ training_id: id, student_id: sid, user_id: user.id }))
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva atualizada!');
    },
    onError: (e: any) => toast.error('Erro ao atualizar reserva: ' + e.message),
  });

  const deleteReservation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trainings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva removida!');
    },
    onError: (e: any) => toast.error('Erro ao remover reserva: ' + e.message),
  });

  return {
    reservations,
    loadingReservations,
    addReservation: addReservation.mutateAsync,
    updateReservation: updateReservation.mutateAsync,
    deleteReservation: deleteReservation.mutateAsync,
  };
}
