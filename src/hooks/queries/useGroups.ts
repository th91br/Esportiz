import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/queries/useProfile';

export interface GroupScheduleSlot {
  dayOfWeek: number; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  time: string;      // "18:00"
}

export interface Group {
  id: string;
  userId: string;
  name: string;
  schedule: GroupScheduleSlot[];
  location: string;
  modalityId?: string | null;
  maxStudents?: number | null;
  durationMinutes: number;
  color: string;
  active: boolean;
  createdAt: string;
  studentIds: string[];
}

export function useGroups() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['groups', user?.id, profile?.business_type],
    queryFn: async () => {
      if (!user) return [];
      const businessType = profile?.business_type || 'sport_school';
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_students(student_id)')
        .eq('user_id', user.id)
        .eq('business_type', businessType)
        .order('name');

      if (error) throw error;
      return (data || []).map((g: any) => ({
        id: g.id,
        userId: g.user_id,
        name: g.name,
        schedule: (g.schedule || []) as GroupScheduleSlot[],
        location: g.location || '',
        modalityId: g.modality_id,
        maxStudents: g.max_students,
        durationMinutes: g.duration_minutes ?? 60,
        color: g.color || '#6366f1',
        active: g.active ?? true,
        createdAt: g.created_at,
        studentIds: (g.group_students || []).map((gs: any) => gs.student_id),
      })) as Group[];
    },
    enabled: !!user,
  });

  const addGroup = useMutation({
    mutationFn: async (data: Omit<Group, 'id' | 'userId' | 'createdAt' | 'studentIds'> & { studentIds?: string[] }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const businessType = profile?.business_type || 'sport_school';
      const { data: newGroup, error } = await supabase
        .from('groups')
        .insert({
          user_id: user.id,
          business_type: businessType,
          name: data.name,
          schedule: data.schedule as any,
          location: data.location,
          modality_id: data.modalityId || null,
          max_students: data.maxStudents || null,
          duration_minutes: data.durationMinutes || 60,
          color: data.color || '#6366f1',
          active: data.active ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      // Add students to the group
      if (data.studentIds && data.studentIds.length > 0) {
        const { error: gsError } = await supabase
          .from('group_students')
          .insert(data.studentIds.map(sid => ({
            group_id: newGroup.id,
            student_id: sid,
            user_id: user.id,
          })));
        if (gsError) throw gsError;
      }

      return newGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Turma criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar turma: ' + error.message);
    },
  });

  const updateGroup = useMutation({
    mutationFn: async (params: { id: string; data: Partial<Group> & { studentIds?: string[] } }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { id, data } = params;

      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.schedule !== undefined) updates.schedule = data.schedule;
      if (data.location !== undefined) updates.location = data.location;
      if (data.modalityId !== undefined) updates.modality_id = data.modalityId || null;
      if (data.maxStudents !== undefined) updates.max_students = data.maxStudents || null;
      if (data.durationMinutes !== undefined) updates.duration_minutes = data.durationMinutes;
      if (data.color !== undefined) updates.color = data.color;
      if (data.active !== undefined) updates.active = data.active;
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Sync students
      if (data.studentIds !== undefined) {
        await supabase.from('group_students').delete().eq('group_id', id);
        if (data.studentIds.length > 0) {
          const { error: gsError } = await supabase
            .from('group_students')
            .insert(data.studentIds.map(sid => ({
              group_id: id,
              student_id: sid,
              user_id: user.id,
            })));
          if (gsError) throw gsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Turma atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar turma: ' + error.message);
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Turma removida');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover turma: ' + error.message);
    },
  });

  return {
    groups,
    loadingGroups,
    addGroup: addGroup.mutateAsync,
    updateGroup: (id: string, data: Partial<Group> & { studentIds?: string[] }) => updateGroup.mutateAsync({ id, data }),
    deleteGroup: deleteGroup.mutateAsync,
  };
}
