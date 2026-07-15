import type { TablesInsert } from '@/integrations/supabase/types';

export interface GroupScheduleSlotContract {
  dayOfWeek: number;
  time: string;
}

interface StudentGroupLinkRow {
  group_id: string | null;
}

interface GroupStudentLinkRow {
  student_id: string | null;
  students?: {
    active: boolean | null;
  } | null;
}

export function normalizeLinkedIds(ids: ReadonlyArray<string | null | undefined> | null | undefined): string[] {
  const uniqueIds = new Set<string>();

  for (const id of ids || []) {
    const normalizedId = typeof id === 'string' ? id.trim() : '';
    if (normalizedId) uniqueIds.add(normalizedId);
  }

  return Array.from(uniqueIds);
}

export function getGroupIdsFromStudentLinks(rows: ReadonlyArray<StudentGroupLinkRow> | null | undefined): string[] {
  return normalizeLinkedIds((rows || []).map((row) => row.group_id));
}

export function getActiveStudentIdsFromGroupLinks(rows: ReadonlyArray<GroupStudentLinkRow> | null | undefined): string[] {
  return normalizeLinkedIds(
    (rows || [])
      .filter((row) => row.students?.active !== false)
      .map((row) => row.student_id)
  );
}

export function buildStudentGroupLinks(params: {
  groupIds: ReadonlyArray<string | null | undefined> | null | undefined;
  studentId: string;
  userId: string;
}): TablesInsert<'group_students'>[] {
  return normalizeLinkedIds(params.groupIds).map((groupId) => ({
    student_id: params.studentId,
    group_id: groupId,
    user_id: params.userId,
  }));
}

export function buildGroupStudentLinks(params: {
  groupId: string;
  studentIds: ReadonlyArray<string | null | undefined> | null | undefined;
  userId: string;
}): TablesInsert<'group_students'>[] {
  return normalizeLinkedIds(params.studentIds).map((studentId) => ({
    group_id: params.groupId,
    student_id: studentId,
    user_id: params.userId,
  }));
}

export function parseGroupSchedule(value: unknown): GroupScheduleSlotContract[] {
  if (!Array.isArray(value)) return [];

  return value.filter((slot): slot is GroupScheduleSlotContract => {
    if (typeof slot !== 'object' || slot === null || Array.isArray(slot)) return false;

    const candidate = slot as { dayOfWeek?: unknown; time?: unknown };
    return (
      Number.isInteger(candidate.dayOfWeek) &&
      Number(candidate.dayOfWeek) >= 0 &&
      Number(candidate.dayOfWeek) <= 6 &&
      typeof candidate.time === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate.time)
    );
  });
}

export function normalizeGroupDuration(value: number | null | undefined): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 60;
}
