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

            // Sync unpaid payments when due day or plan changes
            if ('paymentDueDay' in data || 'planId' in data) {
                // Fetch fresh data for student, old payments and plans to ensure exact calc
                const { data: studentRecords } = await supabase.from('students').select('*').eq('id', id).single();
                const { data: plansRes } = await supabase.from('plans').select('*');
                const { data: paymentsRes } = await supabase.from('payments').select('*').eq('student_id', id).eq('paid', false);

                if (studentRecords && plansRes && paymentsRes) {
                    const student = students.find(s => s.id === id) || {
                        planId: studentRecords.plan_id,
                        paymentDueDay: studentRecords.payment_due_day
                    };
                    const oldPlanId = student.planId;
                    const newPlanId = 'planId' in data ? data.planId : oldPlanId;
                    const newDueDay = 'paymentDueDay' in data ? data.paymentDueDay : student.paymentDueDay;
                    const newPlan = newPlanId ? plansRes.find((p: any) => p.id === newPlanId) : undefined;

                    if ('planId' in data && newPlanId !== oldPlanId) {
                        // Plan changed, delete all unpaid payments
                        for (const payment of paymentsRes) {
                            await supabase.from('payments').delete().eq('id', payment.id);
                        }
                    } else {
                        // Same plan, just update due day or amount
                        for (const payment of paymentsRes) {
                            const [year, month] = payment.month_ref.split('-').map(Number);
                            const paymentUpdates: any = {};

                            if (newPlan) {
                                paymentUpdates.amount = Number(newPlan.price);
                                paymentUpdates.plan_id = newPlan.id;
                            }

                            if (newDueDay) {
                                const maxDay = new Date(year, month, 0).getDate();
                                const day = Math.min(newDueDay, maxDay);
                                paymentUpdates.due_date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            }

                            if (Object.keys(paymentUpdates).length > 0) {
                                await supabase.from('payments').update(paymentUpdates).eq('id', payment.id);
                            }
                        }
                    }
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao atualizar aluno', description: error.message, variant: 'destructive' });
        }
    });

    const deleteStudentMutation = useMutation({
        mutationFn: async (id: string) => {
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
