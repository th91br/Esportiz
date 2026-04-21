import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Plan {
  id: string;
  name: string;
  price: number;
  sessionsPerWeek: number;
  billingType: string;
  isActive: boolean;
}

export function usePlans() {
  const { user } = useAuth();
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['plans', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        sessionsPerWeek: p.sessions_per_week,
        billingType: p.billing_type,
        isActive: p.is_active
      })) as Plan[];
    },
    enabled: !!user
  });

  return { 
    plans, 
    loadingPlans, 
    addPlan: async()=> {}, 
    updatePlan: async()=> {}, 
    deletePlan: async()=> {} 
  };
}
