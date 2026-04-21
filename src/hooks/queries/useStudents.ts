import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Student {
  id: string;
  name: string;
  phone: string;
  level: string;
  joinDate: string;
  active: boolean;
  planId?: string | null;
  paymentDueDay?: number | null;
  photo?: string | null;
  birthDate?: string | null;
}

export function useStudents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id) // Reforço extra de segurança
        .order('name');
      
      if (error) throw error;
      
      return data.map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone || '',
        level: s.level || 'iniciante',
        joinDate: s.join_date,
        active: s.active,
        planId: s.plan_id,
        paymentDueDay: s.payment_due_day,
        photo: s.photo,
        birthDate: s.birth_date
      })) as Student[];
    },
    enabled: !!user
  });

  const addStudent = useMutation({
    mutationFn: async (data: Partial<Student>) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data: newStudent, error } = await supabase
        .from('students')
        .insert({
          user_id: user.id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          level: data.level,
          active: true,
          plan_id: data.planId,
          payment_due_day: data.paymentDueDay,
          birth_date: data.birthDate,
          join_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;
      return newStudent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }
  });

  const updateStudent = useMutation({
    mutationFn: async (params: { id: string; data: Partial<Student> }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { id, data } = params;

      const { data: updatedStudent, error } = await supabase
        .from('students')
        .update({
          name: data.name,
          phone: data.phone,
          email: data.email,
          level: data.level,
          active: data.active,
          plan_id: data.planId,
          payment_due_day: data.paymentDueDay,
          birth_date: data.birthDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return updatedStudent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Garante que só deleta se for o dono
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Aluno removido com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover aluno: ' + error.message);
    }
  });

  return { 
    students, 
    loadingStudents, 
    addStudent: addStudent.mutateAsync,
    updateStudent: async (id: string, data: Partial<Student>) => updateStudent.mutateAsync({ id, data }),
    deleteStudent: deleteStudent.mutateAsync
  };
}
