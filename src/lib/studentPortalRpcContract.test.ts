import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260613090000_student_portal_legacy_compatibility.sql',
);

describe('student portal RPC contract', () => {
  it('uses one tenant-scoped identity resolver across every public student portal operation', () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.resolve_student_portal_tenant');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.resolve_student_portal_identity');
    expect(sql).toContain("om.active = TRUE");
    expect(sql).toContain("o.status = 'active'");
    expect(sql).toContain('COUNT(DISTINCT om.organization_id)');
    expect(sql).toContain("lpad(v_digits, 11, '0')");
    expect(sql).toContain('public.resolve_student_portal_identity(');
    expect(sql).not.toContain('public.is_valid_cpf(p_cpf)');
    expect(sql).toContain("s.business_type = 'sport_school'");
    expect(sql).toContain('s.birth_date = p_birth_date');
    expect(sql).toContain('s.active = TRUE');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.get_student_portal_branding');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.get_student_portal_data');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.get_student_portal_requests');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.submit_student_training_request');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.sign_student_contract');
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.resolve_student_portal_identity(UUID, TEXT, DATE) FROM PUBLIC, anon, authenticated;',
    );
  });

  it('adds a tenant-safe compatibility layer for spreadsheet-imported CPFs', () => {
    const resiliencePath = resolve(
      process.cwd(),
      'supabase/migrations/20260614120000_student_portal_identity_resilience.sql',
    );

    expect(existsSync(resiliencePath)).toBe(true);
    const sql = readFileSync(resiliencePath, 'utf8');

    expect(sql).toContain("v_raw ~ '^[0-9]+[.,]0+$'");
    expect(sql).toContain("trunc(replace(v_raw, ',', '.')::NUMERIC)::TEXT");
    expect(sql).toContain("COALESCE(NULLIF(s.business_type, ''), 'sport_school') = 'sport_school'");
    expect(sql).toContain('student_org.owner_user_id = v_tenant.owner_user_id');
    expect(sql).toContain('public.normalize_student_portal_cpf(s.cpf) = v_clean_cpf');
    expect(sql).toContain(
      'DROP FUNCTION IF EXISTS public.get_student_portal_data(UUID, TEXT, DATE);',
    );
    expect(sql).toContain('FOR SELECT TO authenticated');
    expect(sql).not.toContain(
      'GRANT EXECUTE ON FUNCTION public.resolve_student_portal_identity',
    );
  });
});
