import { type ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Plan } from '@/data/mockData';

import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { usePayments } from '@/hooks/queries/usePayments';

export function AppProvider({ children }: { children: ReactNode }) {
  // AppProvider is now just a pass-through since state is managed by React Query
  return <>{children}</>;
}

export function useApp() {
  const queryClient = useQueryClient();
  const { students, loadingStudents, addStudent, updateStudent, deleteStudent } = useStudents();
  const { plans, loadingPlans, addPlan, updatePlan, deletePlan } = usePlans();
  const { trainings, loadingTrainings, addTraining, updateTraining, deleteTraining } = useTrainings();
  const { attendance, loadingAttendance, toggleAttendance, getAttendanceStatus } = useAttendance();
  const { payments, loadingPayments, generateMonthlyPayments, markAsPaid, markAsUnpaid, deletePayment } = usePayments();

  const loading = loadingStudents || loadingPlans || loadingTrainings || loadingAttendance || loadingPayments;

  const getStudentPlan = useCallback(
    (studentId: string): Plan | undefined => {
      const student = students.find((s) => s.id === studentId);
      return student?.planId ? plans.find((p) => p.id === student.planId) : undefined;
    },
    [students, plans]
  );

  const refreshData = async () => {
    await queryClient.invalidateQueries();
  };

  return {
    students,
    trainings,
    attendance,
    plans,
    payments,
    loading,
    addStudent,
    updateStudent,
    deleteStudent,
    addTraining,
    updateTraining,
    deleteTraining,
    toggleAttendance,
    getAttendanceStatus,
    addPlan,
    updatePlan,
    deletePlan,
    getStudentPlan,
    generateMonthlyPayments,
    markAsPaid,
    markAsUnpaid,
    deletePayment,
    refreshData,
  };
}
