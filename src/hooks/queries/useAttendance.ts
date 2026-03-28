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
        mutationFn: async ({ trainingId, studentId, date }: { trainingId: string, studentId: string, date: string }) => {
            if (!user) throw new Error('Usuário não autenticado');

            const existing = attendance.find((a) => a.trainingId === trainingId && a.studentId === studentId);

            if (existing) {
                const { error } = await supabase.from('attendance').update({ present: !existing.present }).eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('attendance').insert({
                    user_id: user.id,
                    training_id: trainingId,
                    student_id: studentId,
                    present: true,
                    date,
                });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
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
        toggleAttendance: async (trainingId: string, studentId: string, date: string) =>
            toggleAttendanceMutation.mutateAsync({ trainingId, studentId, date }),
    };
}
