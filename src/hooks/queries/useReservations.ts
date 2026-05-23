import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json, TablesUpdate } from '@/integrations/supabase/types';
import { syncAfterReservationMutation } from '@/lib/querySync';
import { toReservation } from '@/lib/reservationContracts';
import type { AddReservationInput, PaymentMethod, ReservationPaymentStatus } from '@/lib/reservationContracts';

export {
  PAYMENT_METHOD_LABELS,
  RECEIVED_RESERVATION_PAYMENT_METHODS,
  RESERVATION_PAYMENT_METHOD_OPTIONS,
  RESERVATION_TYPE_LABELS,
} from '@/lib/reservationContracts';
export type {
  AddReservationInput,
  PaymentMethod,
  Reservation,
  ReservationMeta,
  ReservationPaymentStatus,
  ReservationStatus,
  ReservationType,
} from '@/lib/reservationContracts';

import { getErrorMessage } from '@/lib/errorUtils';

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
      syncAfterReservationMutation(queryClient);
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
      syncAfterReservationMutation(queryClient);
      toast.success('Reserva atualizada!');
    },
    onError: (error: unknown) => toast.error('Erro ao atualizar reserva: ' + getErrorMessage(error)),
  });

  const deleteReservation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('trainings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('business_type', 'arena');
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterReservationMutation(queryClient);
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
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.rpc('set_arena_reservation_payment_status_atomic', {
        p_reservation_id: params.id,
        p_payment_status: params.paymentStatus,
        p_payment_method: params.paymentMethod ?? null,
      });
      if (error) throw new Error(getErrorMessage(error));
    },
    onSuccess: () => {
      syncAfterReservationMutation(queryClient);
    },
    onError: (error: unknown) => toast.error('Erro ao atualizar pagamento da reserva: ' + getErrorMessage(error)),
  });

  const addPartialPayment = useMutation({
    mutationFn: async (params: {
      id: string;
      amount: number;
      method: PaymentMethod;
    }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.rpc('add_arena_partial_payment_atomic', {
        p_reservation_id: params.id,
        p_amount: params.amount,
        p_method: params.method,
      });
      if (error) throw new Error(getErrorMessage(error));
    },
    onSuccess: () => {
      syncAfterReservationMutation(queryClient);
      toast.success('Pagamento parcial registrado com sucesso!');
    },
    onError: (error: unknown) => toast.error('Erro ao registrar pagamento: ' + getErrorMessage(error)),
  });

  return {
    reservations,
    loadingReservations,
    addReservation: addReservation.mutateAsync,
    updateReservation: updateReservation.mutateAsync,
    deleteReservation: deleteReservation.mutateAsync,
    setReservationPaymentStatus: setReservationPaymentStatus.mutateAsync,
    addPartialPayment: addPartialPayment.mutateAsync,
  };
}
