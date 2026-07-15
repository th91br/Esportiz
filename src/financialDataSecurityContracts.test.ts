import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260611150000_harden_financial_dataset_reads.sql',
);
const reportsPage = readFileSync(resolve(process.cwd(), 'src/pages/ReportsPage.tsx'), 'utf-8');
const notificationBell = readFileSync(resolve(process.cwd(), 'src/components/NotificationBell.tsx'), 'utf-8');
const communicationPage = readFileSync(resolve(process.cwd(), 'src/pages/CommunicationPage.tsx'), 'utf-8');
const comandasPage = readFileSync(resolve(process.cwd(), 'src/pages/ComandasPage.tsx'), 'utf-8');

describe('financial dataset security contracts', () => {
  it('replaces broad member reads with role-aware policies', () => {
    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) return;

    const migration = readFileSync(migrationPath, 'utf-8');

    for (const table of ['payments', 'sales', 'expenses', 'products']) {
      expect(migration).toContain(`DROP POLICY IF EXISTS "Organization members can view ${table}"`);
    }

    expect(migration).toContain(
      "ARRAY['owner', 'manager', 'receptionist', 'finance']",
    );
    expect(migration).toContain(
      "ARRAY['owner', 'manager', 'finance']",
    );
    expect(migration).toContain(
      "ARRAY['owner', 'manager', 'receptionist']",
    );
    expect(migration).not.toContain('FOR INSERT');
    expect(migration).not.toContain('FOR UPDATE');
    expect(migration).not.toContain('FOR DELETE');
  });

  it('gates sensitive queries in shared frontend consumers', () => {
    expect(reportsPage).toContain('usePayments({ enabled: sensitiveDataAccess.payments })');
    expect(reportsPage).toContain('useSales({ enabled: sensitiveDataAccess.sales })');
    expect(reportsPage).toContain('useExpenses({ enabled: sensitiveDataAccess.expenses })');
    expect(notificationBell).toContain('usePayments({ enabled: canViewPayments })');
    expect(communicationPage).toContain('usePayments({ enabled: canUsePaymentAudiences })');
    expect(comandasPage).toContain('useProducts({ enabled: canViewProducts })');
  });
});
