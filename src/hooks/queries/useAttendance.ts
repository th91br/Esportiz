import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Attendance } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export function useAttendance() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
        queryKey: ['attendance', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
            if (error) throw error;
            return data.map((a: any) => ({
                id: a.id,
                trainingId: a.training_id,
                studentId: a.student_id,
                present: a.present,
                date: a.date,
            })) as Attendance[];
        },
        enabled: !!user,
    });

    const toggleAttendanceMutation = useMutation({
        mutationFn: async ({ trainingId, studentId, date, forcedStatus }: { trainingId: string, studentId: string, date: string, forcedStatus?: boolean }) => {
            if (!user) throw new Error('Usuário não autenticado');

            const existing = attendance.find((a) => a.trainingId === trainingId && a.studentId === studentId);
            const newStatus = forcedStatus !== undefined ? forcedStatus : (existing ? !existing.present : true);

            if (existing) {
                const { error } = await supabase.from('attendance').update({ present: newStatus }).eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('attendance').insert({
                    user_id: user.id,
                    training_id: trainingId,
                    student_id: studentId,
                    present: newStatus,
                    date,
                });
                if (error) throw error;
            }

            // Sync with notifications: Mark training as completed when attendance is recorded
            const { error: trainingError } = await supabase
                .from('trainings')
                .update({ 
                    completed: true, 
                    completed_at: new Date().toISOString() 
                } as any)
                .eq('id', trainingId)
                .eq('completed', false);

            if (trainingError) {
                console.error('Error syncing attendance with training completion:', trainingError);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao atualizar presença', description: error.message, variant: 'destructive' });
        }
    });

    const getAttendanceStatus = useCallback(
        (trainingId: string, studentId: string): boolean | undefined => {
            return attendance.find((a) => a.trainingId === trainingId && a.studentId === studentId)?.present;
        },
        [attendance]
    );

    return {
        attendance,
        loadingAttendance,
        getAttendanceStatus,
        toggleAttendance: async (trainingId: string, studentId: string, date: string, forcedStatus?: boolean) =>
            toggleAttendanceMutation.mutateAsync({ trainingId, studentId, date, forcedStatus }),
    };
}
