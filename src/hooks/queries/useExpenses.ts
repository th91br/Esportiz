import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

function mapExpense(row: any): Expense {
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
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ['expenses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapExpense);
    },
    enabled: !!user?.id,
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
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category || 'geral',
        date: expense.date || new Date().toISOString().split('T')[0],
        recurrence: expense.recurrence || 'none',
        notes: expense.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] });
      toast.success('Despesa registrada com sucesso!');
    },
    onError: () => toast.error('Erro ao registrar despesa.'),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const dbUpdates: any = { updated_at: new Date().toISOString() };
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
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] });
    },
    onError: () => toast.error('Erro ao atualizar despesa.'),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] });
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
    expenses: expensesQuery.data || [],
    loadingExpenses: expensesQuery.isLoading,
    addExpense: addExpenseMutation.mutateAsync,
    updateExpense: updateExpenseMutation.mutateAsync,
    deleteExpense: deleteExpenseMutation.mutateAsync,
    markExpensePaid,
    markExpenseUnpaid,
    isAddingExpense: addExpenseMutation.isPending,
  };
}
