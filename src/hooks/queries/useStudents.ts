import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Student } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

export function useStudents() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: students = [], isLoading: loadingStudents } = useQuery({
        queryKey: ['students', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase.from('students').select('*').order('name', { ascending: true });
            if (error) throw error;
            return data.map((s: any) => ({
                id: s.id,
                name: s.name,
                phone: s.phone,
                email: s.email,
                level: s.level,
                joinDate: s.join_date,
                photo: s.photo,
                active: s.active,
                planId: s.plan_id,
                paymentDueDay: s.payment_due_day,
                paymentStartDate: s.payment_start_date,
                birthDate: s.birth_date,
            })) as Student[];
        },
        enabled: !!user,
    });

    const addStudentMutation = useMutation({
        mutationFn: async (data: Omit<Student, 'id' | 'joinDate' | 'active'>) => {
            if (!user) throw new Error('Usuário não autenticado');

            // Check duplicate phone locally first if query data exists
            const normalized = normalizePhone(data.phone);
            const duplicate = students.find(s => normalizePhone(s.phone) === normalized);
            if (duplicate) {
                throw new Error(`O telefone ${data.phone} já pertence a ${duplicate.name}.`);
            }

            const { error } = await supabase.from('students').insert({
                user_id: user.id,
                name: data.name,
                phone: data.phone,
                email: data.email,
                level: data.level,
                plan_id: data.planId || null,
                payment_due_day: data.paymentDueDay || null,
                payment_start_date: data.paymentStartDate || null,
                birth_date: data.birthDate || null,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao cadastrar aluno', description: error.message, variant: 'destructive' });
        }
    });

    const updateStudentMutation = useMutation({
        mutationFn: async (params: { id: string; data: Partial<Student> }) => {
            const { id, data } = params;

            if (data.phone !== undefined) {
                const normalized = normalizePhone(data.phone);
                const duplicate = students.find(s => s.id !== id && normalizePhone(s.phone) === normalized);
                if (duplicate) {
                    throw new Error(`O telefone ${data.phone} já pertence a ${duplicate.name}.`);
                }
            }

            const updates: any = {};
            if (data.name !== undefined) updates.name = data.name;
            if (data.phone !== undefined) updates.phone = data.phone;
            if (data.email !== undefined) updates.email = data.email;
            if (data.level !== undefined) updates.level = data.level;
            if (data.active !== undefined) updates.active = data.active;
            if ('planId' in data) updates.plan_id = data.planId || null;
            if ('paymentDueDay' in data) updates.payment_due_day = data.paymentDueDay || null;
            if ('paymentStartDate' in data) updates.payment_start_date = data.paymentStartDate || null;
            if ('birthDate' in data) updates.birth_date = data.birthDate || null;

            const { error } = await supabase.from('students').update(updates).eq('id', id);
            if (error) throw error;

            // When deactivating: clean up future trainings atomically
            if (data.active === false) {
                const { error: cleanupError } = await supabase.rpc('cleanup_student_future_trainings', {
                    p_student_id: id,
                } as any);
                if (cleanupError) throw cleanupError;
            }

            // Sync unpaid payments when due day or plan changes using our new RPC
            if ('paymentDueDay' in data || 'planId' in data) {
                const student = students.find(s => s.id === id);
                const oldPlanId = student?.planId;
                const newPlanId = 'planId' in data ? data.planId : oldPlanId;
                const newDueDay = 'paymentDueDay' in data ? data.paymentDueDay : student?.paymentDueDay;
                
                const planChanged = 'planId' in data && newPlanId !== oldPlanId;

                const { error: syncError } = await supabase.rpc('sync_student_unpaid_payments', {
                    p_student_id: id,
                    p_plan_changed: planChanged,
                    p_new_plan_id: newPlanId || null,
                    p_new_due_day: newDueDay || null
                });

                if (syncError) throw syncError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao atualizar aluno', description: error.message, variant: 'destructive' });
        }
    });

    const deleteStudentMutation = useMutation({
        mutationFn: async (id: string) => {
            // Clean up orphan trainings BEFORE cascade delete removes junction rows
            await supabase.rpc('cleanup_student_future_trainings', {
                p_student_id: id,
            } as any);

            const { error } = await supabase.from('students').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['trainings'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao remover aluno', description: error.message, variant: 'destructive' });
        }
    });

    return {
        students,
        loadingStudents,
        addStudent: async (student: Omit<Student, 'id' | 'joinDate' | 'active'>) => addStudentMutation.mutateAsync(student),
        updateStudent: async (id: string, data: Partial<Student>) => updateStudentMutation.mutateAsync({ id, data }),
        deleteStudent: async (id: string) => deleteStudentMutation.mutateAsync(id),
    };
}
