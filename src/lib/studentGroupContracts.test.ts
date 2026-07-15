import { describe, expect, it } from 'vitest';
import {
  buildGroupStudentLinks,
  buildStudentGroupLinks,
  getActiveStudentIdsFromGroupLinks,
  getGroupIdsFromStudentLinks,
  normalizeGroupDuration,
  normalizeLinkedIds,
  parseGroupSchedule,
} from './studentGroupContracts';

describe('studentGroupContracts', () => {
  it('normalizes linked ids by removing blanks, trimming values, and keeping stable uniqueness', () => {
    expect(normalizeLinkedIds([' aluno-1 ', '', null, undefined, 'aluno-2', 'aluno-1'])).toEqual([
      'aluno-1',
      'aluno-2',
    ]);
  });

  it('reads student group ids without leaking duplicate or empty links', () => {
    expect(
      getGroupIdsFromStudentLinks([
        { group_id: 'turma-1' },
        { group_id: '' },
        { group_id: null },
        { group_id: 'turma-1' },
        { group_id: 'turma-2' },
      ])
    ).toEqual(['turma-1', 'turma-2']);
  });

  it('reads only active students from group links', () => {
    expect(
      getActiveStudentIdsFromGroupLinks([
        { student_id: 'aluno-1', students: { active: true } },
        { student_id: 'aluno-2', students: { active: false } },
        { student_id: 'aluno-3', students: null },
        { student_id: 'aluno-1', students: { active: true } },
        { student_id: null, students: { active: true } },
      ])
    ).toEqual(['aluno-1', 'aluno-3']);
  });

  it('builds safe group_students inserts from the student form side', () => {
    expect(
      buildStudentGroupLinks({
        groupIds: ['turma-1', ' turma-2 ', 'turma-1', ''],
        studentId: 'aluno-1',
        userId: 'user-1',
      })
    ).toEqual([
      { student_id: 'aluno-1', group_id: 'turma-1', user_id: 'user-1' },
      { student_id: 'aluno-1', group_id: 'turma-2', user_id: 'user-1' },
    ]);
  });

  it('builds safe group_students inserts from the group form side', () => {
    expect(
      buildGroupStudentLinks({
        groupId: 'turma-1',
        studentIds: ['aluno-1', ' aluno-2 ', 'aluno-1', null],
        userId: 'user-1',
      })
    ).toEqual([
      { group_id: 'turma-1', student_id: 'aluno-1', user_id: 'user-1' },
      { group_id: 'turma-1', student_id: 'aluno-2', user_id: 'user-1' },
    ]);
  });

  it('keeps only valid weekly schedule slots', () => {
    expect(
      parseGroupSchedule([
        { dayOfWeek: 1, time: '08:00' },
        { dayOfWeek: 6, time: '23:30' },
        { dayOfWeek: 7, time: '08:00' },
        { dayOfWeek: 2, time: '25:00' },
        { dayOfWeek: '3', time: '09:00' },
        null,
      ])
    ).toEqual([
      { dayOfWeek: 1, time: '08:00' },
      { dayOfWeek: 6, time: '23:30' },
    ]);
  });

  it('normalizes group duration with a professional fallback', () => {
    expect(normalizeGroupDuration(90)).toBe(90);
    expect(normalizeGroupDuration(0)).toBe(60);
    expect(normalizeGroupDuration(null)).toBe(60);
    expect(normalizeGroupDuration(undefined)).toBe(60);
  });
});
