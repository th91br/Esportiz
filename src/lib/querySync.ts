import type { QueryClient, QueryKey } from '@tanstack/react-query';

const queryKeys = {
  attendance: ['attendance'],
  comandas: ['comandas'],
  courts: ['courts'],
  expenses: ['expenses'],
  financialAuditLogs: ['financialAuditLogs'],
  groups: ['groups'],
  modalities: ['modalities'],
  payments: ['payments'],
  plans: ['plans'],
  products: ['products'],
  reservations: ['reservations'],
  sales: ['sales'],
  students: ['students'],
  trainings: ['trainings'],
} satisfies Record<string, QueryKey>;

function invalidateMany(queryClient: QueryClient, keys: QueryKey[]) {
  keys.forEach((queryKey) => {
    void queryClient.invalidateQueries({ queryKey });
  });
}

export function syncAfterPaymentMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.payments,
    queryKeys.financialAuditLogs,
  ]);
}

export function syncAfterReservationMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.reservations,
    queryKeys.trainings,
    queryKeys.financialAuditLogs,
  ]);
}

export function syncAfterStudentMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.students,
    queryKeys.payments,
    queryKeys.groups,
    queryKeys.trainings,
    queryKeys.attendance,
  ]);
}

export function syncAfterPlanMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.plans,
    queryKeys.payments,
    queryKeys.students,
  ]);
}

export function syncAfterScheduleMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.trainings,
    queryKeys.attendance,
    queryKeys.reservations,
  ]);
}

export function syncAfterGroupMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.groups,
    queryKeys.students,
  ]);
}

export function syncAfterCourtMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.courts,
    queryKeys.modalities,
    queryKeys.reservations,
    queryKeys.trainings,
  ]);
}

export function syncAfterModalityMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.modalities,
    queryKeys.students,
    queryKeys.trainings,
  ]);
}

export function syncAfterSaleMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.sales,
    queryKeys.products,
  ]);
}

export function syncAfterExpenseMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.expenses,
  ]);
}

export function syncAfterProductMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.products,
  ]);
}

export function syncAfterComandaMutation(queryClient: QueryClient) {
  invalidateMany(queryClient, [
    queryKeys.comandas,
    queryKeys.sales,
    queryKeys.products,
  ]);
}
