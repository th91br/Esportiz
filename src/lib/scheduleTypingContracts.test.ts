import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf-8');

describe('schedule typing contracts', () => {
  const attendanceHook = readSource('src/hooks/queries/useAttendance.ts');
  const trainingsHook = readSource('src/hooks/queries/useTrainings.ts');
  const attendanceList = readSource('src/components/AttendanceList.tsx');
  const calendarPage = readSource('src/pages/CalendarPage.tsx');
  const databaseTypes = readSource('src/integrations/supabase/types.ts');

  it('keeps schedule and attendance flows free from explicit any escapes', () => {
    for (const source of [attendanceHook, trainingsHook, attendanceList, calendarPage]) {
      expect(source).not.toMatch(/\bas any\b|:\s*any\b|any\[\]/);
      expect(source).not.toContain('eslint-disable @typescript-eslint/no-explicit-any');
    }
  });

  it('keeps cancellation fields represented and persisted on training writes', () => {
    expect(databaseTypes).toContain('cancellation_reason: string | null');
    expect(databaseTypes).toContain('cancellation_notes: string | null');
    expect(trainingsHook).toContain('p_cancelled: data.cancelled ?? false');
    expect(trainingsHook).toContain('p_cancellation_reason: data.cancellationReason ?? null');
    expect(trainingsHook).toContain('updates.cancellation_reason = data.cancellationReason ?? null');
  });

  it('keeps justified attendance represented in database and UI contracts', () => {
    expect(databaseTypes).toContain('justification_notes: string | null');
    expect(attendanceHook).toContain("export type AttendanceStatus = 'presente' | 'falta' | 'justificada'");
    expect(attendanceList).toContain('attDetail: Attendance | undefined');
  });
});