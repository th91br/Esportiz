import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Training, TimeSlot } from '@/data/mockData';
import { useAuth } from '@/contexts/auth';
import { useProfile } from '@/hooks/queries/useProfile';
import { syncAfterScheduleMutation } from '@/lib/querySync';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type TrainingRowWithStudents = Tables<'trainings'> & {
    training_students?: Pick<Tables<'training_students'>, 'student_id'>[] | null;
};

type CancellationReason = NonNullable<Training['cancellationReason']>;

function asCancellationReason(value: string | null): CancellationReason | undefined {
    return value === 'holiday' || value === 'weather' || value === 'coach_absence' || value === 'other'
        ? value
        : undefined;
}

export function useTrainings(options: { enabled?: boolean } = {}) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { profile } = useProfile();
    const trainingsEnabled = options.enabled ?? true;

    const tenantId = profile?.owner_user_id || user?.id;

    const { data: trainings = [], isLoading: loadingTrainings } = useQuery({
        queryKey: ['trainings', tenantId, profile?.business_type],
        queryFn: async () => {
            if (!tenantId) return [];
            const businessType = profile?.business_type || 'sport_school';
            const { data, error } = await supabase
                .from('trainings')
                .select('*, training_students(student_id)')
                .eq('user_id', tenantId)
                .eq('business_type', businessType)
                .order('date')
                .order('time');

            if (error) throw error;
            return ((data || []) as TrainingRowWithStudents[]).map((t) => ({
                id: t.id,
                date: t.date,
                time: t.time as TimeSlot,
                studentIds: (t.training_students || []).map((ts) => ts.student_id),
                location: t.location,
                notes: t.notes,
                completed: t.completed ?? false,
                completedAt: t.completed_at ?? undefined,
                googleEventId: t.google_event_id,
                modalityId: t.modality_id,
                durationMinutes: t.duration_minutes ?? 60,
                cancelled: t.cancelled ?? false,
                cancellationReason: asCancellationReason(t.cancellation_reason),
                cancellationNotes: t.cancellation_notes ?? undefined,
            })) as Training[];
        },
        enabled: trainingsEnabled && !!tenantId,
    });

    const addTrainingMutation = useMutation({
        mutationFn: async (data: Omit<Training, 'id' | 'completed' | 'completedAt'>) => {
            if (!user) throw new Error('Usuário não autenticado');

            const businessType = profile?.business_type || 'sport_school';
            const { data: training, error } = await supabase.from('trainings').insert({
                user_id: user.id,
                business_type: businessType,
                date: data.date,
                time: data.time,
                location: data.location,
                notes: data.notes,
                modality_id: data.modalityId,
                duration_minutes: data.durationMinutes ?? 60,
                cancelled: data.cancelled ?? false,
                cancellation_reason: data.cancellationReason ?? null,
                cancellation_notes: data.cancellationNotes ?? null,
                organization_id: profile?.organization_id || null,
            }).select().single();

            if (error || !training) throw error || new Error('Treino não criado');

            if (data.studentIds && data.studentIds.length > 0) {
                const trainingStudents: TablesInsert<'training_students'>[] = data.studentIds.map((sid) => ({
                    training_id: training.id,
                    student_id: sid,
                    user_id: user.id,
                    organization_id: profile?.organization_id || null,
                }));
                const { error: tsError } = await supabase.from('training_students').insert(
                    trainingStudents
                );
                if (tsError) throw tsError;
            }
        },
        onSuccess: () => {
            syncAfterScheduleMutation(queryClient);
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao criar treino', description: error.message, variant: 'destructive' });
        }
    });

    const updateTrainingMutation = useMutation({
        mutationFn: async (params: { id: string; data: Partial<Training> }) => {
            if (!user) throw new Error('Usuário não autenticado');
            const { id, data } = params;
            const updates: TablesUpdate<'trainings'> = {
                organization_id: profile?.organization_id || null,
            };

            if (data.date !== undefined) updates.date = data.date;
            if (data.time !== undefined) updates.time = data.time;
            if (data.location !== undefined) updates.location = data.location;
            if (data.notes !== undefined) updates.notes = data.notes;
            if (data.modalityId !== undefined) updates.modality_id = data.modalityId;
            if (data.durationMinutes !== undefined) updates.duration_minutes = data.durationMinutes;
            if (data.cancelled !== undefined) updates.cancelled = data.cancelled;
            if (data.cancellationReason !== undefined) updates.cancellation_reason = data.cancellationReason;
            if (data.cancellationNotes !== undefined) updates.cancellation_notes = data.cancellationNotes;

            if (Object.keys(updates).length > 0) {
                const { error } = await supabase.from('trainings').update(updates).eq('id', id).eq('user_id', tenantId);
                if (error) throw error;
            }

            if (data.studentIds) {
                await supabase.from('training_students').delete().eq('training_id', id).eq('user_id', tenantId);
                if (data.studentIds.length > 0) {
                    const trainingStudents: TablesInsert<'training_students'>[] = data.studentIds.map((sid) => ({
                        training_id: id,
                        student_id: sid,
                        user_id: user.id,
                        organization_id: profile?.organization_id || null,
                    }));
                    const { error: tsError } = await supabase.from('training_students').insert(
                        trainingStudents
                    );
                    if (tsError) throw tsError;
                }
            }
        },
        onSuccess: () => {
            syncAfterScheduleMutation(queryClient);
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao atualizar treino', description: error.message, variant: 'destructive' });
        }
    });

    const deleteTrainingMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!user) throw new Error('Usuário não autenticado');
            const { error } = await supabase.from('trainings').delete().eq('id', id).eq('user_id', tenantId);
            if (error) throw error;
        },
        onSuccess: () => {
            syncAfterScheduleMutation(queryClient);
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao remover treino', description: error.message, variant: 'destructive' });
        }
    });

    const markCompleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!user) throw new Error('Usuário não autenticado');
            const completedUpdate: TablesUpdate<'trainings'> = {
                completed: true,
                completed_at: new Date().toISOString(),
                organization_id: profile?.organization_id || null,
            };
            const { error } = await supabase
                .from('trainings')
                .update(completedUpdate)
                .eq('id', id)
                .eq('user_id', tenantId);
            if (error) throw error;
        },
        onSuccess: () => {
            syncAfterScheduleMutation(queryClient);
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao marcar treino', description: error.message, variant: 'destructive' });
        }
    });

    const unmarkCompleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!user) throw new Error('Usuário não autenticado');
            const completedUpdate: TablesUpdate<'trainings'> = {
                completed: false,
                completed_at: null,
                organization_id: profile?.organization_id || null,
            };
            const { error } = await supabase
                .from('trainings')
                .update(completedUpdate)
                .eq('id', id)
                .eq('user_id', tenantId);
            if (error) throw error;
        },
        onSuccess: () => {
            syncAfterScheduleMutation(queryClient);
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao desmarcar treino', description: error.message, variant: 'destructive' });
        }
    });

    return {
        trainings,
        loadingTrainings,
        addTraining: async (training: Omit<Training, 'id' | 'completed' | 'completedAt'>) => addTrainingMutation.mutateAsync(training),
        updateTraining: async (id: string, data: Partial<Training>) => updateTrainingMutation.mutateAsync({ id, data }),
        deleteTraining: async (id: string) => deleteTrainingMutation.mutateAsync(id),
        markTrainingComplete: async (id: string) => markCompleteMutation.mutateAsync(id),
        unmarkTrainingComplete: async (id: string) => unmarkCompleteMutation.mutateAsync(id),
    };
}
