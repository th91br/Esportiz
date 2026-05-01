import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Modality {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useModalities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: modalities = [], isLoading: loadingModalities } = useQuery({
    queryKey: ['modalities', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('modalities')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      return data as Modality[];
    },
    enabled: !!user
  });

  const addModality = useMutation({
    mutationFn: async (data: Omit<Modality, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data: newModality, error } = await supabase
        .from('modalities')
        .insert({
          user_id: user.id,
          name: data.name,
          color: data.color || '#4285F4'
        })
        .select()
        .single();

      if (error) throw error;
      return newModality;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modalities'] });
      toast.success('Modalidade criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar modalidade: ' + error.message);
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
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modalities'] });
      toast.success('Modalidade atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar modalidade: ' + error.message);
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
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modalities'] });
      toast.success('Modalidade removida');
    },
    onError: (error: any) => {
      toast.error(error.message);
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
