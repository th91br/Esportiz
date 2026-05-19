import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Training, TimeSlot } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/queries/useProfile';
import { syncAfterScheduleMutation } from '@/lib/querySync';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type TrainingRowWithStudents = Tables<'trainings'> & {
    training_students?: Pick<Tables<'training_students'>, 'student_id'>[] | null;
};

export function useTrainings() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { profile } = useProfile();

    const { data: trainings = [], isLoading: loadingTrainings } = useQuery({
        queryKey: ['trainings', user?.id, profile?.business_type],
        queryFn: async () => {
            if (!user) return [];
            const businessType = profile?.business_type || 'sport_school';
            const { data, error } = await supabase
                .from('trainings')
                .select('*, training_students(student_id)')
                .eq('user_id', user.id)
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
            })) as Training[];
        },
        enabled: !!user,
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
            }).select().single();

            if (error || !training) throw error || new Error('Treino não criado');

            if (data.studentIds && data.studentIds.length > 0) {
                const trainingStudents: TablesInsert<'training_students'>[] = data.studentIds.map((sid) => ({
                    training_id: training.id,
                    student_id: sid,
                    user_id: user.id,
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
            const updates: TablesUpdate<'trainings'> = {};

            if (data.date !== undefined) updates.date = data.date;
            if (data.time !== undefined) updates.time = data.time;
            if (data.location !== undefined) updates.location = data.location;
            if (data.notes !== undefined) updates.notes = data.notes;
            if (data.modalityId !== undefined) updates.modality_id = data.modalityId;
            if (data.durationMinutes !== undefined) updates.duration_minutes = data.durationMinutes;

            if (Object.keys(updates).length > 0) {
                const { error } = await supabase.from('trainings').update(updates).eq('id', id);
                if (error) throw error;
            }

            if (data.studentIds) {
                await supabase.from('training_students').delete().eq('training_id', id);
                if (data.studentIds.length > 0) {
                    const trainingStudents: TablesInsert<'training_students'>[] = data.studentIds.map((sid) => ({
                        training_id: id,
                        student_id: sid,
                        user_id: user.id,
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
            const { error } = await supabase.from('trainings').delete().eq('id', id);
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
            const completedUpdate: TablesUpdate<'trainings'> = {
                completed: true,
                completed_at: new Date().toISOString(),
            };
            const { error } = await supabase
                .from('trainings')
                .update(completedUpdate)
                .eq('id', id);
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
            const completedUpdate: TablesUpdate<'trainings'> = {
                completed: false,
                completed_at: null,
            };
            const { error } = await supabase
                .from('trainings')
                .update(completedUpdate)
                .eq('id', id);
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
