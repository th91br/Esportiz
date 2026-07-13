import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('atomic training RPC contract', () => {
  const migration = readSource(
    'supabase/migrations/20260713170000_atomic_training_writes.sql',
  );
  const trainingsHook = readSource('src/hooks/queries/useTrainings.ts');
  const databaseTypes = readSource('src/integrations/supabase/types.ts');

  it('keeps parent and student assignment writes inside authenticated RLS transactions', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.create_training_with_students_atomic',
    );
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.update_training_with_students_atomic',
    );
    expect(migration.match(/SECURITY INVOKER/g)).toHaveLength(2);
    expect(migration).toContain('FOR UPDATE;');
    expect(migration).toContain('INSERT INTO public.trainings');
    expect(migration).toContain('INSERT INTO public.training_students');
    expect(migration).toContain('DELETE FROM public.training_students');
    expect(migration).toContain('public.has_organization_role(');
    expect(migration).toContain('array_position(p_student_ids, NULL)');
    expect(migration).toContain('FROM PUBLIC, anon;');
    expect(migration).toContain('TO authenticated;');
  });

  it('uses only the atomic RPCs for multi-table training writes', () => {
    expect(trainingsHook).toContain("supabase.rpc('create_training_with_students_atomic'");
    expect(trainingsHook).toContain("supabase.rpc('update_training_with_students_atomic'");
    expect(trainingsHook).not.toMatch(
      /from\('training_students'\)\.(?:insert|update|delete)/,
    );
    expect(trainingsHook).toContain(
      "if ('modalityId' in data) updates.modality_id = data.modalityId ?? null",
    );
  });

  it('keeps generated client signatures aligned with both RPCs', () => {
    expect(databaseTypes).toContain('create_training_with_students_atomic: {');
    expect(databaseTypes).toContain('update_training_with_students_atomic: {');
    expect(databaseTypes).toContain('p_student_ids: string[] | null');
    expect(databaseTypes).toContain('p_updates: Json');
  });
});
