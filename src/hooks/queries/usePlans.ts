import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/queries/useProfile';
import { syncAfterPlanMutation } from '@/lib/querySync';

export interface Plan {
  id: string;
  name: string;
  price: number;
  sessionsPerWeek: number;
  billingType: 'monthly' | 'per_session';
}

export function usePlans() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const tenantId = profile?.owner_user_id || user?.id;

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['plans', tenantId, profile?.business_type],
    queryFn: async () => {
      if (!tenantId) return [];
      const businessType = profile?.business_type || 'sport_school';
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', tenantId)
        .eq('business_type', businessType)
        .order('name');
      
      if (error) throw error;
      
      return data.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        sessionsPerWeek: p.sessions_per_week,
        billingType: p.billing_type as 'monthly' | 'per_session',
      })) as Plan[];
    },
    enabled: !!tenantId
  });

  const addPlanMutation = useMutation({
    mutationFn: async (data: Omit<Plan, 'id'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const businessType = profile?.business_type || 'sport_school';
      const { data: newPlan, error } = await supabase
        .from('plans')
        .insert({
          user_id: user.id,
          business_type: businessType,
          name: data.name,
          price: data.price,
          sessions_per_week: data.sessionsPerWeek,
          billing_type: data.billingType,
          organization_id: profile?.organization_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return newPlan;
    },
    onSuccess: () => {
      syncAfterPlanMutation(queryClient);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar plano', description: error.message, variant: 'destructive' });
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (params: { id: string; data: Partial<Plan> }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { id, data } = params;

      const { data: updatedPlan, error } = await supabase
        .from('plans')
        .update({
          name: data.name,
          price: data.price,
          sessions_per_week: data.sessionsPerWeek,
          billing_type: data.billingType,
          organization_id: profile?.organization_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      // Sync open payments if plan pricing or billing model changed.
      if (data.price !== undefined || data.billingType !== undefined) {
        await supabase.rpc('sync_all_unpaid_payments_for_plan', { p_plan_id: id });
      }

      return updatedPlan;
    },
    onSuccess: () => {
      syncAfterPlanMutation(queryClient);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar plano', description: error.message, variant: 'destructive' });
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id)
        .eq('user_id', tenantId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterPlanMutation(queryClient);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover plano', description: error.message, variant: 'destructive' });
    }
  });

  return { 
    plans, 
    loadingPlans, 
    addPlan: async (data: Omit<Plan, 'id'>) => addPlanMutation.mutateAsync(data),
    updatePlan: async (id: string, data: Partial<Plan>) => updatePlanMutation.mutateAsync({ id, data }),
    deletePlan: async (id: string) => deletePlanMutation.mutateAsync(id)
  };
}
