import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/queries/useProfile';
import { getLocalTodayDate } from '@/lib/dateUtils';
import { syncAfterStudentMutation } from '@/lib/querySync';
import { buildStudentGroupLinks, getGroupIdsFromStudentLinks } from '@/lib/studentGroupContracts';
import type { Tables } from '@/integrations/supabase/types';
import type { Student } from '@/data/mockData';

type StudentRowWithGroups = Tables<'students'> & {
  group_students?: Pick<Tables<'group_students'>, 'group_id'>[] | null;
};

function asDiscountType(value: string | null): Student['discountType'] {
  return value === 'percentage' || value === 'fixed' ? value : null;
}

function asStudentLevel(value: string | null): Student['level'] {
  return value === 'intermediário' || value === 'avançado' ? value : 'iniciante';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado';
}

export function useStudents(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const studentsEnabled = options.enabled ?? true;

  const tenantId = profile?.owner_user_id || user?.id;

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students', tenantId, profile?.business_type],
    queryFn: async () => {
      if (!tenantId) return [];
      const businessType = profile?.business_type || 'sport_school';
      const { data, error } = await supabase
        .from('students')
        .select('*, group_students(group_id)')
        .eq('user_id', tenantId)
        .eq('business_type', businessType)
        .order('name');
      
      if (error) throw error;
      
      return ((data || []) as StudentRowWithGroups[]).map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone || '',
        level: asStudentLevel(s.level),
        joinDate: s.join_date,
        active: s.active,
        planId: s.plan_id,
        paymentDueDay: s.payment_due_day,
        paymentStartDate: s.payment_start_date,
        photo: s.photo,
        birthDate: s.birth_date,
        email: s.email || '',
        modalityId: s.modality_id,
        cpf: s.cpf,
        rg: s.rg,
        address: s.address,
        city: s.city,
        state: s.state,
        zipCode: s.zip_code,
        isTrial: s.is_trial ?? false,
        trialStartedAt: s.trial_started_at,
        trialConvertedAt: s.trial_converted_at,
        groupIds: getGroupIdsFromStudentLinks(s.group_students),
        discountType: asDiscountType(s.discount_type),
        discountValue: Number(s.discount_value || 0),
        discountDurationMonths: s.discount_duration_months,
        discountStartMonth: s.discount_start_month,
      })) as Student[];
    },
    enabled: studentsEnabled && !!tenantId
  });

  const addStudent = useMutation({
    mutationFn: async (data: Partial<Student>) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const businessType = profile?.business_type || 'sport_school';
      const { data: newStudent, error } = await supabase
        .from('students')
        .insert({
          user_id: user.id,
          business_type: businessType,
          name: data.name,
          phone: data.phone,
          email: data.email,
          level: data.level,
          active: true,
          plan_id: data.planId,
          payment_due_day: data.paymentDueDay,
          birth_date: data.birthDate,
          modality_id: data.modalityId,
          photo: data.photo,
          cpf: data.cpf,
          rg: data.rg,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          is_trial: data.isTrial ?? false,
          trial_started_at: data.trialStartedAt || null,
          trial_converted_at: data.trialConvertedAt || null,
          join_date: getLocalTodayDate(),
          discount_type: data.discountType || null,
          discount_value: data.discountValue || 0,
          discount_duration_months: data.discountDurationMonths || null,
          discount_start_month: data.discountStartMonth || null,
          organization_id: profile?.organization_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data.groupIds && data.groupIds.length > 0) {
        const gsInsert = buildStudentGroupLinks({
          studentId: newStudent.id,
          groupIds: data.groupIds,
          userId: user.id,
        }).map(link => ({
          ...link,
          organization_id: profile?.organization_id || null,
        }));

        const { error: gsError } = await supabase
          .from('group_students')
          .insert(gsInsert);
        if (gsError) throw gsError;
      }

      return newStudent;
    },
    onSuccess: () => {
      syncAfterStudentMutation(queryClient);
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
          modality_id: data.modalityId,
          photo: data.photo,
          cpf: data.cpf,
          rg: data.rg,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          is_trial: data.isTrial,
          trial_started_at: data.trialStartedAt,
          trial_converted_at: data.trialConvertedAt,
          discount_type: data.discountType === undefined ? undefined : data.discountType,
          discount_value: data.discountValue === undefined ? undefined : data.discountValue,
          discount_duration_months: data.discountDurationMonths === undefined ? undefined : data.discountDurationMonths,
          discount_start_month: data.discountStartMonth === undefined ? undefined : data.discountStartMonth,
          organization_id: profile?.organization_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      if (data.groupIds !== undefined) {
        await supabase.from('group_students').delete().eq('student_id', id);
        if (data.groupIds.length > 0) {
          const gsInsert = buildStudentGroupLinks({
            studentId: id,
            groupIds: data.groupIds,
            userId: user.id,
          }).map(link => ({
            ...link,
            organization_id: profile?.organization_id || null,
          }));

          const { error: gsError } = await supabase
            .from('group_students')
            .insert(gsInsert);
          if (gsError) throw gsError;
        }
      }

      return updatedStudent;
    },
    onSuccess: () => {
      syncAfterStudentMutation(queryClient);
    }
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .eq('user_id', tenantId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      syncAfterStudentMutation(queryClient);
      toast.success('Aluno removido com sucesso');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao remover aluno: ' + getErrorMessage(error));
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
