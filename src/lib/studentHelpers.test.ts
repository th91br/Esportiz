import { describe, expect, it } from 'vitest';
import type { Plan, Student } from '@/data/mockData';
import {
  getActiveMonthlyStudents,
  getInactiveStudents,
  getStudentsWithoutPlan,
  getTotalStudents,
  isActiveMonthlyStudent,
} from './studentHelpers';

const monthlyPlan: Plan = {
  id: 'monthly',
  name: 'Mensal',
  sessionsPerWeek: 2,
  price: 250,
  billingType: 'monthly',
};

const perSessionPlan: Plan = {
  id: 'per-session',
  name: 'Avulso',
  sessionsPerWeek: 1,
  price: 80,
  billingType: 'per_session',
};

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: overrides.id || 'student-1',
    name: overrides.name || 'Aluno Teste',
    phone: overrides.phone || '54999999999',
    level: overrides.level || 'iniciante',
    joinDate: overrides.joinDate || '2026-05-18',
    active: overrides.active ?? true,
    planId: overrides.planId ?? monthlyPlan.id,
    ...overrides,
  };
}

describe('studentHelpers', () => {
  const plans = [monthlyPlan, perSessionPlan];

  it('counts only active students with a monthly plan as active monthly students', () => {
    expect(isActiveMonthlyStudent(makeStudent({ planId: monthlyPlan.id }), plans)).toBe(true);
    expect(isActiveMonthlyStudent(makeStudent({ planId: perSessionPlan.id }), plans)).toBe(false);
    expect(isActiveMonthlyStudent(makeStudent({ active: false, planId: monthlyPlan.id }), plans)).toBe(false);
    expect(isActiveMonthlyStudent(makeStudent({ planId: null }), plans)).toBe(false);
    expect(isActiveMonthlyStudent(makeStudent({ planId: 'missing-plan' }), plans)).toBe(false);
  });

  it('filters active monthly students from a mixed list', () => {
    const students = [
      makeStudent({ id: 'active-monthly', planId: monthlyPlan.id }),
      makeStudent({ id: 'active-per-session', planId: perSessionPlan.id }),
      makeStudent({ id: 'inactive-monthly', active: false, planId: monthlyPlan.id }),
      makeStudent({ id: 'without-plan', planId: null }),
    ];

    expect(getActiveMonthlyStudents(students, plans).map((student) => student.id)).toEqual(['active-monthly']);
  });

  it('returns total, inactive, and active students without plan', () => {
    const students = [
      makeStudent({ id: 'active-monthly', planId: monthlyPlan.id }),
      makeStudent({ id: 'active-without-plan', planId: null }),
      makeStudent({ id: 'inactive-without-plan', active: false, planId: null }),
    ];

    expect(getTotalStudents(students)).toBe(3);
    expect(getInactiveStudents(students).map((student) => student.id)).toEqual(['inactive-without-plan']);
    expect(getStudentsWithoutPlan(students).map((student) => student.id)).toEqual(['active-without-plan']);
  });
});
