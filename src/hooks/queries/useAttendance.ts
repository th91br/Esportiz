/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Attendance } from '@/data/mockData';
import { useAuth } from '@/contexts/auth';
import { useProfile } from '@/hooks/queries/useProfile';
import { useCallback } from 'react';
import { syncAfterScheduleMutation } from '@/lib/querySync';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

export function useAttendance(options: { enabled?: boolean } = {}) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { profile } = useProfile();
    const attendanceEnabled = options.enabled ?? true;

    const tenantId = profile?.owner_user_id || user?.id;

    const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
        queryKey: ['attendance', tenantId, profile?.business_type],
        queryFn: async () => {
            if (!tenantId) return [];
            const businessType = profile?.business_type || 'sport_school';
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('user_id', tenantId)
                .eq('business_type', businessType)
                .order('date', { ascending: false });
            if (error) throw error;
            return (data || []).map((a: any) => ({
                id: a.id,
                trainingId: a.training_id,
                studentId: a.student_id,
                present: a.present,
                date: a.date,
                justified: a.justified,
                justificationNotes: a.justification_notes,
            })) as Attendance[];
        },
        enabled: attendanceEnabled && !!tenantId,
    });

    const toggleAttendanceMutation = useMutation({
        mutationFn: async ({ 
            trainingId, 
            studentId, 
            date, 
            status, 
            justificationNotes 
        }: { 
            trainingId: string, 
            studentId: string, 
            date: string, 
            status: 'presente' | 'falta' | 'justificada', 
            justificationNotes?: string 
        }) => {
            if (!user) throw new Error('Usuário não autenticado');

            const existing = attendance.find((a) => a.trainingId === trainingId && a.studentId === studentId);
            const isPresent = status === 'presente';
            const isJustified = status === 'justificada';
            const notes = isJustified ? (justificationNotes || '') : null;

            const payload = {
                present: isPresent,
                justified: isJustified,
                justification_notes: notes,
            };

            if (existing) {
                const { error } = await supabase.from('attendance').update(payload).eq('id', existing.id);
                if (error) throw error;
            } else {
                const businessType = profile?.business_type || 'sport_school';
                const { error } = await supabase.from('attendance').insert({
                    user_id: user.id,
                    business_type: businessType,
                    training_id: trainingId,
                    student_id: studentId,
                    present: isPresent,
                    justified: isJustified,
                    justification_notes: notes,
                    date,
                    organization_id: profile?.organization_id || null,
                });
                if (error) throw error;
            }

            // Sync with notifications: Mark training as completed when attendance is recorded
            const completedUpdate: TablesUpdate<'trainings'> = {
                completed: true,
                completed_at: new Date().toISOString(),
                organization_id: profile?.organization_id || null,
            };
            const { error: trainingError } = await supabase
                .from('trainings')
                .update(completedUpdate)
                .eq('id', trainingId)
                .eq('completed', false);

            if (trainingError) {
                console.error('Error syncing attendance with training completion:', trainingError);
            }
        },
        onSuccess: () => {
            syncAfterScheduleMutation(queryClient);
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

    const getAttendanceDetail = useCallback(
        (trainingId: string, studentId: string): Attendance | undefined => {
            return attendance.find((a) => a.trainingId === trainingId && a.studentId === studentId);
        },
        [attendance]
    );

    return {
        attendance,
        loadingAttendance,
        getAttendanceStatus,
        getAttendanceDetail,
        setAttendanceStatus: async (params: { trainingId: string, studentId: string, date: string, status: 'presente' | 'falta' | 'justificada', justificationNotes?: string }) =>
            toggleAttendanceMutation.mutateAsync(params),
        toggleAttendance: async (trainingId: string, studentId: string, date: string, forcedStatus?: boolean) => {
            const status = forcedStatus === true ? 'presente' : 'falta';
            return toggleAttendanceMutation.mutateAsync({ trainingId, studentId, date, status });
        }
    };
}
