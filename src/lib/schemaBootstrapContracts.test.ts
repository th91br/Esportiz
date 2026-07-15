import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = resolve(process.cwd(), 'supabase/migrations');
const modalitiesBaseline = '20260428150000_create_modalities_baseline.sql';
const firstModalitiesReference = '20260428160000_phase2_groups_trial.sql';
const birthDateBaseline = '20260612000000_add_student_birth_date_baseline.sql';
const firstBirthDateIndex = '20260613090000_student_portal_legacy_compatibility.sql';

describe('fresh database bootstrap contracts', () => {
  it('creates modalities before the first foreign key references it', () => {
    const baselinePath = resolve(migrationsDir, modalitiesBaseline);

    expect(existsSync(baselinePath)).toBe(true);
    expect(modalitiesBaseline.localeCompare(firstModalitiesReference)).toBeLessThan(0);

    const sql = readFileSync(baselinePath, 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.modalities');
    expect(sql).toContain('ALTER TABLE public.students');
    expect(sql).toContain('ALTER TABLE public.trainings');
    expect(sql.match(/ADD COLUMN IF NOT EXISTS modality_id UUID/g)).toHaveLength(2);
    expect(sql.match(/REFERENCES public\.modalities\(id\) ON DELETE SET NULL/g)).toHaveLength(2);
    expect(sql).toContain('ALTER TABLE public.modalities ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('WITH CHECK (auth.uid() = user_id)');
    expect(sql).toContain('REVOKE ALL ON TABLE public.modalities FROM PUBLIC, anon');
    expect(sql).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modalities TO authenticated',
    );
  });

  it('creates student birth dates before portal lookup indexes depend on them', () => {
    const baselinePath = resolve(migrationsDir, birthDateBaseline);

    expect(existsSync(baselinePath)).toBe(true);
    expect(birthDateBaseline.localeCompare(firstBirthDateIndex)).toBeLessThan(0);

    const sql = readFileSync(baselinePath, 'utf8');
    expect(sql).toContain('ALTER TABLE public.students');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS birth_date DATE');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_students_birth_date');
  });
});
