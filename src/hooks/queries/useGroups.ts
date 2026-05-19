import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/queries/useProfile';
import { syncAfterGroupMutation } from '@/lib/querySync';
import {
  buildGroupStudentLinks,
  getActiveStudentIdsFromGroupLinks,
  normalizeGroupDuration,
  parseGroupSchedule,
  type GroupScheduleSlotContract,
} from '@/lib/studentGroupContracts';
import type { Json, Tables, TablesUpdate } from '@/integrations/supabase/types';

export type GroupScheduleSlot = GroupScheduleSlotContract;

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

type GroupStudentWithStudent = Pick<Tables<'group_students'>, 'student_id'> & {
  students?: Pick<Tables<'students'>, 'active'> | null;
};

type GroupRowWithStudents = Tables<'groups'> & {
  group_students?: GroupStudentWithStudent[] | null;
};

type GroupsQueryResult = PromiseLike<{
  data: GroupRowWithStudents[] | null;
  error: unknown;
}>;

type GroupsFilterBuilder = {
  eq(column: string, value: string): GroupsFilterBuilder;
  order(column: string): GroupsQueryResult;
};

type GroupsSelectBuilder = {
  select(columns: string): GroupsFilterBuilder;
};

type GroupsClient = {
  from(table: 'groups'): GroupsSelectBuilder;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado';
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
      const groupsClient = supabase as unknown as GroupsClient;
      const { data, error } = await groupsClient
        .from('groups')
        .select('id, user_id, name, schedule, location, modality_id, max_students, duration_minutes, color, active, created_at, group_students(student_id, students(active))')
        .eq('user_id', user.id)
        .eq('business_type', businessType)
        .order('name');

      if (error) throw error;
      return ((data || []) as GroupRowWithStudents[]).map((g) => ({
        id: g.id,
        userId: g.user_id,
        name: g.name,
        schedule: parseGroupSchedule(g.schedule),
        location: g.location || '',
        modalityId: g.modality_id,
        maxStudents: g.max_students,
        durationMinutes: normalizeGroupDuration(g.duration_minutes),
        color: g.color || '#6366f1',
        active: g.active ?? true,
        createdAt: g.created_at,
        studentIds: getActiveStudentIdsFromGroupLinks(g.group_students),
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
          schedule: data.schedule as unknown as Json,
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
          .insert(buildGroupStudentLinks({
            groupId: newGroup.id,
            studentIds: data.studentIds,
            userId: user.id,
          }));
        if (gsError) throw gsError;
      }

      return newGroup;
    },
    onSuccess: () => {
      syncAfterGroupMutation(queryClient);
      toast.success('Turma criada com sucesso');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao criar turma: ' + getErrorMessage(error));
    },
  });

  const updateGroup = useMutation({
    mutationFn: async (params: { id: string; data: Partial<Group> & { studentIds?: string[] } }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { id, data } = params;

      const updates: TablesUpdate<'groups'> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.schedule !== undefined) updates.schedule = data.schedule as unknown as Json;
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
            .insert(buildGroupStudentLinks({
              groupId: id,
              studentIds: data.studentIds,
              userId: user.id,
            }));
          if (gsError) throw gsError;
        }
      }
    },
    onSuccess: () => {
      syncAfterGroupMutation(queryClient);
      toast.success('Turma atualizada');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao atualizar turma: ' + getErrorMessage(error));
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
      syncAfterGroupMutation(queryClient);
      toast.success('Turma removida');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao remover turma: ' + getErrorMessage(error));
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
