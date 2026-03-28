import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Plan } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';

export function usePlans() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['plans', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('plans').select('*').order('price', { ascending: true });
      if (error) throw error;
      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        sessionsPerWeek: p.sessions_per_week,
        price: Number(p.price),
        billingType: p.billing_type || 'monthly',
      })) as Plan[];
    },
    enabled: !!user,
  });

  const addPlanMutation = useMutation({
    mutationFn: async (data: Omit<Plan, 'id'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('plans').insert({
        user_id: user.id,
        name: data.name,
        sessions_per_week: data.sessionsPerWeek,
        price: data.price,
        billing_type: data.billingType || 'monthly',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar plano', description: error.message, variant: 'destructive' });
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (params: { id: string; data: Partial<Plan> }) => {
      const { id, data } = params;
      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.sessionsPerWeek !== undefined) updates.sessions_per_week = data.sessionsPerWeek;
      if (data.price !== undefined) updates.price = data.price;
      if (data.billingType !== undefined) updates.billing_type = data.billingType;

      const { error } = await supabase.from('plans').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar plano', description: error.message, variant: 'destructive' });
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover plano', description: error.message, variant: 'destructive' });
    }
  });

  return {
    plans,
    loadingPlans,
    addPlan: async (plan: Omit<Plan, 'id'>) => addPlanMutation.mutateAsync(plan),
    updatePlan: async (id: string, data: Partial<Plan>) => updatePlanMutation.mutateAsync({ id, data }),
    deletePlan: async (id: string) => deletePlanMutation.mutateAsync(id),
  };
}
