import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Payment } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';

export function usePayments() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: payments = [], isLoading: loadingPayments } = useQuery({
        queryKey: ['payments', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .order('due_date', { ascending: true });
            if (error) throw error;
            return data.map((p: any) => ({
                id: p.id,
                userId: p.user_id,
                studentId: p.student_id,
                planId: p.plan_id,
                amount: Number(p.amount),
                dueDate: p.due_date,
                paid: p.paid,
                paidAt: p.paid_at,
                monthRef: p.month_ref,
                createdAt: p.created_at,
                isProrata: p.is_prorata || false,
                fullPrice: p.full_price ? Number(p.full_price) : undefined,
            })) as Payment[];
        },
        enabled: !!user,
    });

    const markAsPaidMutation = useMutation({
        mutationFn: async (paymentId: string) => {
            const { error } = await supabase
                .from('payments')
                .update({ paid: true, paid_at: new Date().toISOString() })
                .eq('id', paymentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao marcar pagamento', description: error.message, variant: 'destructive' });
        },
    });

    const markAsUnpaidMutation = useMutation({
        mutationFn: async (paymentId: string) => {
            const { error } = await supabase
                .from('payments')
                .update({ paid: false, paid_at: null })
                .eq('id', paymentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao desmarcar pagamento', description: error.message, variant: 'destructive' });
        },
    });

    const deletePaymentMutation = useMutation({
        mutationFn: async (paymentId: string) => {
            const { error } = await supabase.from('payments').delete().eq('id', paymentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao excluir pagamento', description: error.message, variant: 'destructive' });
        },
    });

    /**
     * Gera os pagamentos mensais para todos os alunos ativos com plano mensal
     * e dia de vencimento configurado, evitando duplicatas.
     * Roda 100% no cliente via Supabase — sem Edge Function.
     */
    const generateMonthlyPaymentsMutation = useMutation({
        mutationFn: async (monthRef: string) => {
            if (!user) throw new Error('Usuário não autenticado');

            const userId = user.id;
            const [year, month] = monthRef.split('-').map(Number);

            // 1. Alunos ativos com plano e dia de vencimento definidos
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id, plan_id, payment_due_day, payment_start_date')
                .eq('user_id', userId)
                .eq('active', true)
                .not('plan_id', 'is', null)
                .not('payment_due_day', 'is', null);

            if (studentsError) throw studentsError;
            if (!students || students.length === 0) return { count: 0 };

            // 2. Busca os planos dos alunos e filtra apenas mensais
            const planIds = [...new Set(students.map((s: any) => s.plan_id).filter(Boolean))] as string[];
            const { data: plans, error: plansError } = await supabase
                .from('plans')
                .select('id, price, billing_type')
                .in('id', planIds);

            if (plansError) throw plansError;
            const plansMap = new Map((plans || []).map((p: any) => [p.id, p]));

            // 3. Verifica quais alunos já têm pagamento neste mês
            const { data: existing, error: existingError } = await supabase
                .from('payments')
                .select('student_id')
                .eq('month_ref', monthRef);

            if (existingError) throw existingError;
            const alreadyHasPayment = new Set((existing || []).map((p: any) => p.student_id));

            // 4. Monta os registros a inserir
            const toInsert: any[] = [];
            for (const student of (students as any[])) {
                if (alreadyHasPayment.has(student.id)) continue;

                const plan = plansMap.get(student.plan_id);
                if (!plan || plan.billing_type !== 'monthly') continue;

                // Não gera pagamento para os meses ANTERIORES ao data do primeiro pagamento
                if (student.payment_start_date) {
                    const startMonthRef = student.payment_start_date.substring(0, 7); // Ex: "2024-04"
                    if (monthRef < startMonthRef) {
                        continue; // Mês anterior, ignora
                    }
                }

                // Ajusta o dia de vencimento para não exceder o último dia do mês
                const maxDay = new Date(year, month, 0).getDate();
                const day = Math.min(Number(student.payment_due_day), maxDay);
                const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                toInsert.push({
                    user_id: userId,
                    student_id: student.id,
                    plan_id: plan.id,
                    amount: Number(plan.price),
                    due_date: dueDate,
                    paid: false,
                    month_ref: monthRef,
                });
            }

            if (toInsert.length === 0) return { count: 0 };

            const { error: insertError } = await supabase.from('payments').insert(toInsert);
            if (insertError) throw insertError;

            return { count: toInsert.length };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            if (data?.count && data.count > 0) {
                toast({
                    title: 'Pagamentos gerados',
                    description: `${data.count} pagamento(s) gerado(s) com sucesso.`,
                });
            }
        },
        onError: (error: Error) => {
            toast({ title: 'Erro ao gerar pagamentos', description: error.message, variant: 'destructive' });
        },
    });

    return {
        payments,
        loadingPayments,
        markAsPaid: async (id: string) => markAsPaidMutation.mutateAsync(id),
        markAsUnpaid: async (id: string) => markAsUnpaidMutation.mutateAsync(id),
        deletePayment: async (id: string) => deletePaymentMutation.mutateAsync(id),
        generateMonthlyPayments: async (monthRef: string) =>
            generateMonthlyPaymentsMutation.mutateAsync(monthRef),
    };
}
