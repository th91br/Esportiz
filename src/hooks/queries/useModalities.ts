import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/queries/useProfile';
import { syncAfterModalityMutation } from '@/lib/querySync';

export interface Modality {
  id: string;
  user_id: string;
  name: string;
  color: string;
  metadata?: unknown;
  created_at: string;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado';
}

export function useModalities(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const modalitiesEnabled = options.enabled ?? true;

  const tenantId = profile?.owner_user_id || user?.id;

  const { data: modalities = [], isLoading: loadingModalities } = useQuery({
    queryKey: ['modalities', tenantId, profile?.business_type],
    queryFn: async () => {
      if (!tenantId) return [];
      const businessType = profile?.business_type || 'sport_school';
      const { data, error } = await supabase
        .from('modalities')
        .select('*')
        .eq('user_id', tenantId)
        .eq('business_type', businessType)
        .order('name');
      
      if (error) throw error;
      return data as Modality[];
    },
    enabled: modalitiesEnabled && !!tenantId
  });

  const addModality = useMutation({
    mutationFn: async (data: Omit<Modality, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const businessType = profile?.business_type || 'sport_school';
      const { data: newModality, error } = await supabase
        .from('modalities')
        .insert({
          user_id: user.id,
          business_type: businessType,
          name: data.name,
          color: data.color || '#4285F4',
          organization_id: profile?.organization_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return newModality;
    },
    onSuccess: () => {
      syncAfterModalityMutation(queryClient);
      toast.success('Modalidade criada com sucesso');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao criar modalidade: ' + getErrorMessage(error));
    }
  });

  const updateModality = useMutation({
    mutationFn: async (params: { id: string; data: Partial<Modality> }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { id, data } = params;

      const { data: updated, error } = await supabase
        .from('modalities')
        .update({
          name: data.name,
          color: data.color,
          organization_id: profile?.organization_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      syncAfterModalityMutation(queryClient);
      toast.success('Modalidade atualizada');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao atualizar modalidade: ' + getErrorMessage(error));
    }
  });

  const deleteModality = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      // Check if any student or training uses this modality
      const { count: studentCount } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('modality_id', id);

      const { count: trainingCount } = await supabase
        .from('trainings')
        .select('id', { count: 'exact', head: true })
        .eq('modality_id', id);

      if ((studentCount || 0) > 0 || (trainingCount || 0) > 0) {
        throw new Error('Esta modalidade não pode ser excluída pois possui alunos ou treinos vinculados.');
      }

      const { error } = await supabase
        .from('modalities')
        .delete()
        .eq('id', id)
        .eq('user_id', tenantId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterModalityMutation(queryClient);
      toast.success('Modalidade removida');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    }
  });

  return { 
    modalities, 
    loadingModalities, 
    addModality: addModality.mutateAsync,
    updateModality: (id: string, data: Partial<Modality>) => updateModality.mutateAsync({ id, data }),
    deleteModality: deleteModality.mutateAsync
  };
}
