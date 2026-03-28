import type { Student, Plan } from '@/data/mockData';

/**
 * Checks if a student is "ativo com plano mensal" — the real business definition of "active".
 * A student is considered active ONLY when:
 * 1. student.active === true
 * 2. Has a planId that matches an existing plan
 * 3. That plan is monthly (not per_session/avulsa)
 *
 * Students in "Aula Experimental", "Sem Plano", or "Desativado" are NOT counted as active.
 */
export function isActiveMonthlyStudent(student: Student, plans: Plan[]): boolean {
  if (!student.active || !student.planId) return false;
  const plan = plans.find(p => p.id === student.planId);
  if (!plan) return false; // experimental — planId exists but no matching plan
  return plan.billingType === 'monthly';
}

/**
 * Returns only students who are active with a monthly plan.
 */
export function getActiveMonthlyStudents(students: Student[], plans: Plan[]): Student[] {
  return students.filter(s => isActiveMonthlyStudent(s, plans));
}
