import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Training, TimeSlot } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';

export function useTrainings() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: trainings = [], isLoading: loadingTrainings } = useQuery({
        queryKey: ['trainings', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('trainings')
                .select('*, training_students(student_id)')
                .order('date')
                .order('time');

            if (error) throw error;
            return data.map((t: any) => ({
                id: t.id,
                date: t.date,
                time: t.time as TimeSlot,
                studentIds: (t.training_students || []).map((ts: any) => ts.student_id),
                location: t.location,
                notes: t.notes,
                completed: t.completed ?? false,
                completedAt: t.completed_at ?? undefined,
                googleEventId: t.google_event_id,
            })) as Training[];
        },
        enabled: !!user,
    });

    const addTrainingMutation = useMutation({
        mutationFn: async (data: Omit<Training, 'id' | 'completed' | 'completedAt'>) => {
            if (!user) throw new Error('Usuário não autenticado');

            const { data: training, error } = await supabase.from('trainings').insert({
                user_id: user.id,
                date: data.date,
                time: data.time,
                location: data.location,
                notes: data.notes,
            }).select().single();

            if (error || !training) throw error || new Error('Treino não criado');

            if (data.studentIds && data.studentIds.length > 0) {
                const { error: tsError } = await supabase.from('training_students').insert(
                    data.studentIds.map((sid) => ({ training_id: training.id, student_id: sid }))
                );
                if (tsError) throw tsError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao criar treino', description: error.message, variant: 'destructive' });
        }
    });

    const updateTrainingMutation = useMutation({
        mutationFn: async (params: { id: string; data: Partial<Training> }) => {
            const { id, data } = params;
            const updates: any = {};

            if (data.date !== undefined) updates.date = data.date;
            if (data.time !== undefined) updates.time = data.time;
            if (data.location !== undefined) updates.location = data.location;
            if (data.notes !== undefined) updates.notes = data.notes;

            if (Object.keys(updates).length > 0) {
                const { error } = await supabase.from('trainings').update(updates).eq('id', id);
                if (error) throw error;
            }

            if (data.studentIds) {
                await supabase.from('training_students').delete().eq('training_id', id);
                if (data.studentIds.length > 0) {
                    const { error: tsError } = await supabase.from('training_students').insert(
                        data.studentIds.map((sid) => ({ training_id: id, student_id: sid }))
                    );
                    if (tsError) throw tsError;
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
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
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao remover treino', description: error.message, variant: 'destructive' });
        }
    });

    const markCompleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('trainings')
                .update({ completed: true, completed_at: new Date().toISOString() } as any)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao marcar treino', description: error.message, variant: 'destructive' });
        }
    });

    const unmarkCompleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('trainings')
                .update({ completed: false, completed_at: null } as any)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
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
