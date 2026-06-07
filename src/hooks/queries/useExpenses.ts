import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/queries/useProfile';
import { getLocalTodayDate } from '@/lib/dateUtils';
import { syncAfterExpenseMutation } from '@/lib/querySync';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

export interface Expense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paid: boolean;
  paidAt: string | null;
  recurrence: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapExpense(row: Tables<'expenses'>): Expense {
  return {
    id: row.id,
    userId: row.user_id,
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
    paid: row.paid,
    paidAt: row.paid_at,
    recurrence: row.recurrence || 'none',
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useExpenses() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const tenantId = profile?.owner_user_id || user?.id;
  const isArena = profile?.business_type === 'arena';

  const expensesQuery = useQuery({
    queryKey: ['expenses', tenantId, profile?.business_type],
    queryFn: async () => {
      if (!tenantId || !isArena) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', tenantId)
        .eq('business_type', 'arena')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapExpense);
    },
    enabled: !!tenantId && isArena,
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (expense: {
      description: string;
      amount: number;
      category?: string;
      date?: string;
      recurrence?: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isArena) throw new Error('Despesas estao disponiveis somente para Arena / CT de Quadras.');
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        business_type: 'arena',
        description: expense.description,
        amount: expense.amount,
        category: expense.category || 'geral',
        date: expense.date || getLocalTodayDate(),
        recurrence: expense.recurrence || 'none',
        notes: expense.notes || null,
        organization_id: profile?.organization_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterExpenseMutation(queryClient);
      toast.success('Despesa registrada com sucesso!');
    },
    onError: () => toast.error('Erro ao registrar despesa.'),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isArena) throw new Error('Despesas estao disponiveis somente para Arena / CT de Quadras.');
      const dbUpdates: TablesUpdate<'expenses'> = {
        updated_at: new Date().toISOString(),
        organization_id: profile?.organization_id || null,
      };
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.recurrence !== undefined) dbUpdates.recurrence = updates.recurrence;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.paid !== undefined) {
        dbUpdates.paid = updates.paid;
        dbUpdates.paid_at = updates.paid ? new Date().toISOString() : null;
      }
      const { error } = await supabase
        .from('expenses')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterExpenseMutation(queryClient);
    },
    onError: () => toast.error('Erro ao atualizar despesa.'),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isArena) throw new Error('Despesas estao disponiveis somente para Arena / CT de Quadras.');
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterExpenseMutation(queryClient);
      toast.success('Despesa removida.');
    },
    onError: () => toast.error('Erro ao remover despesa.'),
  });

  const markExpensePaid = async (id: string) => {
    await updateExpenseMutation.mutateAsync({ id, paid: true });
    toast.success('Despesa marcada como paga!');
  };

  const markExpenseUnpaid = async (id: string) => {
    await updateExpenseMutation.mutateAsync({ id, paid: false });
    toast.success('Despesa marcada como pendente.');
  };

  return {
    expenses: isArena ? (expensesQuery.data || []) : [],
    loadingExpenses: isArena && expensesQuery.isLoading,
    addExpense: addExpenseMutation.mutateAsync,
    updateExpense: updateExpenseMutation.mutateAsync,
    deleteExpense: deleteExpenseMutation.mutateAsync,
    markExpensePaid,
    markExpenseUnpaid,
    isAddingExpense: addExpenseMutation.isPending,
  };
}
