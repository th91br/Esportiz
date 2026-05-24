import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/queries/useProfile';
import { toast } from 'sonner';

export interface StudentTrainingRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string | null;
  requestType: 'training' | 'makeup';
  preferredDate: string | null;
  preferredTime: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
}

const REQUEST_SELECT = `
  id,
  student_id,
  student_name_snapshot,
  student_phone_snapshot,
  request_type,
  preferred_date,
  preferred_time,
  message,
  status,
  created_at
`;

function mapRequest(row: Record<string, unknown>): StudentTrainingRequest {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    studentName: String(row.student_name_snapshot || 'Aluno'),
    studentPhone: row.student_phone_snapshot ? String(row.student_phone_snapshot) : null,
    requestType: row.request_type === 'makeup' ? 'makeup' : 'training',
    preferredDate: row.preferred_date ? String(row.preferred_date) : null,
    preferredTime: row.preferred_time ? String(row.preferred_time) : null,
    message: row.message ? String(row.message) : null,
    status: row.status === 'approved' || row.status === 'rejected' || row.status === 'cancelled' ? row.status : 'pending',
    createdAt: String(row.created_at),
  };
}

export function useStudentTrainingRequests() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const isSportSchool = profile?.business_type === 'sport_school';

  const query = useQuery({
    queryKey: ['student-training-requests', user?.id, profile?.business_type],
    enabled: !!user?.id && isSportSchool,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_training_requests')
        .select(REQUEST_SELECT)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        if (error.message?.includes('student_training_requests')) {
          return [];
        }
        throw error;
      }

      return (data || []).map((row) => mapRequest(row as Record<string, unknown>));
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      if (!user?.id) throw new Error('Usuário não autenticado.');

      const { error } = await supabase
        .from('student_training_requests')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-training-requests'] });
      toast.success(variables.status === 'approved' ? 'Solicitação marcada como atendida.' : 'Solicitação recusada.');
    },
    onError: () => {
      toast.error('Erro ao atualizar solicitação.');
    },
  });

  return {
    requests: isSportSchool ? query.data || [] : [],
    loadingRequests: query.isLoading,
    resolveRequest: (id: string, status: 'approved' | 'rejected') => resolveMutation.mutateAsync({ id, status }),
    isResolvingRequest: resolveMutation.isPending,
  };
}
