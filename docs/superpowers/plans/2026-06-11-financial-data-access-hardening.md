# Financial Data Access Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the approved financial dataset read matrix in Supabase RLS and prevent unauthorized frontend queries.

**Architecture:** Add a pure role-to-dataset access contract built on the existing centralized permissions, then use it to activate sensitive React Query hooks only where authorized. Add one defensive Supabase migration that removes broad organization-member financial read policies and replaces them with table-specific role policies while preserving all write policies and RPCs.

**Tech Stack:** React 18, TypeScript, TanStack Query, Vitest, Supabase/PostgreSQL RLS

---

## File Structure

- Create `src/lib/sensitiveDataAccess.ts`: pure dataset read contract derived from centralized role permissions.
- Create `src/lib/sensitiveDataAccess.test.ts`: role matrix regression tests.
- Create `src/financialDataSecurityContracts.test.ts`: static repository tests for migration and query gating.
- Create `supabase/migrations/20260611150000_harden_financial_dataset_reads.sql`: role-aware financial and commercial `SELECT` policies.
- Modify `src/hooks/queries/useExpenses.ts`: add the existing hook option pattern used by payments, sales, and products.
- Modify `src/lib/dashboardAccess.ts`: expose authorized payment and expense loading and use the shared dataset contract.
- Modify `src/lib/dashboardAccess.test.ts`: verify sensitive dashboard loading for every role.
- Modify `src/pages/Index.tsx`: gate payment, expense, sales, and product queries.
- Modify `src/pages/ReportsPage.tsx`: gate payment, expense, and sales queries.
- Modify `src/components/NotificationBell.tsx`: avoid payment queries and payment tabs for unauthorized roles.
- Modify `src/pages/CommunicationPage.tsx`: load payments only for roles that can use payment-based audiences.
- Modify `src/lib/businessRouteAccess.test.ts`: align shared commerce routes with the approved school expansion.
- Modify `src/lib/rolePermissions.test.ts`: align role and business route expectations with the approved access contract.

### Task 1: Sensitive Dataset Access Contract

**Files:**
- Create: `src/lib/sensitiveDataAccess.ts`
- Create: `src/lib/sensitiveDataAccess.test.ts`

- [ ] **Step 1: Write the failing role matrix test**

```ts
import { describe, expect, it } from 'vitest';
import { getSensitiveDataAccess } from './sensitiveDataAccess';

describe('getSensitiveDataAccess', () => {
  it.each(['sport_school', 'arena'] as const)(
    'enforces sensitive dataset reads for %s',
    (businessType) => {
      expect(getSensitiveDataAccess('owner', businessType)).toEqual({
        payments: true,
        sales: true,
        expenses: true,
        products: true,
      });
      expect(getSensitiveDataAccess('manager', businessType)).toEqual({
        payments: true,
        sales: true,
        expenses: true,
        products: true,
      });
      expect(getSensitiveDataAccess('receptionist', businessType)).toEqual({
        payments: true,
        sales: true,
        expenses: false,
        products: true,
      });
      expect(getSensitiveDataAccess('finance', businessType)).toEqual({
        payments: true,
        sales: true,
        expenses: true,
        products: false,
      });
      expect(getSensitiveDataAccess('instructor', businessType)).toEqual({
        payments: false,
        sales: false,
        expenses: false,
        products: false,
      });
    },
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/lib/sensitiveDataAccess.test.ts`

Expected: FAIL because `./sensitiveDataAccess` does not exist.

- [ ] **Step 3: Implement the minimal pure contract**

```ts
import {
  canPerformAction,
  type PermissionBusinessType,
} from '@/lib/rolePermissions';

export interface SensitiveDataAccess {
  payments: boolean;
  sales: boolean;
  expenses: boolean;
  products: boolean;
}

export function getSensitiveDataAccess(
  role?: string | null,
  businessType: PermissionBusinessType = 'sport_school',
): SensitiveDataAccess {
  return {
    payments: canPerformAction({ role, businessType, module: 'payments', action: 'view' }),
    sales: canPerformAction({ role, businessType, module: 'sales', action: 'view' }),
    expenses: canPerformAction({ role, businessType, module: 'expenses', action: 'view' }),
    products: canPerformAction({ role, businessType, module: 'products', action: 'view' }),
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/lib/sensitiveDataAccess.test.ts`

Expected: 2 tests pass, one for each business type.

### Task 2: Role-Aware Supabase Read Policies

**Files:**
- Create: `src/financialDataSecurityContracts.test.ts`
- Create: `supabase/migrations/20260611150000_harden_financial_dataset_reads.sql`

- [ ] **Step 1: Write the failing migration contract test**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260611150000_harden_financial_dataset_reads.sql',
);

describe('financial dataset security contracts', () => {
  it('replaces broad member reads with role-aware policies', () => {
    const migration = readFileSync(migrationPath, 'utf-8');

    for (const table of ['payments', 'sales', 'expenses', 'products']) {
      expect(migration).toContain(`DROP POLICY IF EXISTS "Organization members can view ${table}"`);
    }

    expect(migration).toContain(
      "public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'finance'])",
    );
    expect(migration).toContain(
      "public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'finance'])",
    );
    expect(migration).toContain(
      "public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist'])",
    );
    expect(migration).not.toContain('FOR INSERT');
    expect(migration).not.toContain('FOR UPDATE');
    expect(migration).not.toContain('FOR DELETE');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/financialDataSecurityContracts.test.ts`

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Create the defensive migration**

Create a migration that:

```sql
-- Restrict sensitive organization reads to the approved role matrix.
DO $harden_financial_dataset_reads$
BEGIN
    IF to_regclass('public.payments') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'payments'
             AND column_name = 'organization_id'
       )
    THEN
        ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Organization members can view payments" ON public.payments;
        DROP POLICY IF EXISTS "Organization roles can view payments" ON public.payments;
        CREATE POLICY "Organization roles can view payments"
        ON public.payments FOR SELECT TO authenticated
        USING (
            public.has_organization_role(
                organization_id,
                ARRAY['owner', 'manager', 'receptionist', 'finance']
            )
        );
    END IF;

    IF to_regclass('public.sales') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'sales'
             AND column_name = 'organization_id'
       )
    THEN
        ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Organization members can view sales" ON public.sales;
        DROP POLICY IF EXISTS "Organization roles can view sales" ON public.sales;
        CREATE POLICY "Organization roles can view sales"
        ON public.sales FOR SELECT TO authenticated
        USING (
            public.has_organization_role(
                organization_id,
                ARRAY['owner', 'manager', 'receptionist', 'finance']
            )
        );
    END IF;

    IF to_regclass('public.expenses') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'expenses'
             AND column_name = 'organization_id'
       )
    THEN
        ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Organization members can view expenses" ON public.expenses;
        DROP POLICY IF EXISTS "Organization roles can view expenses" ON public.expenses;
        CREATE POLICY "Organization roles can view expenses"
        ON public.expenses FOR SELECT TO authenticated
        USING (
            public.has_organization_role(
                organization_id,
                ARRAY['owner', 'manager', 'finance']
            )
        );
    END IF;

    IF to_regclass('public.products') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'products'
             AND column_name = 'organization_id'
       )
    THEN
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Organization members can view products" ON public.products;
        DROP POLICY IF EXISTS "Organization roles can view products" ON public.products;
        CREATE POLICY "Organization roles can view products"
        ON public.products FOR SELECT TO authenticated
        USING (
            public.has_organization_role(
                organization_id,
                ARRAY['owner', 'manager', 'receptionist']
            )
        );
    END IF;
END;
$harden_financial_dataset_reads$;
```

The completed file must contain all four explicit guarded blocks. It must not create or replace write policies or RPCs.

- [ ] **Step 4: Run the migration contract test and verify GREEN**

Run: `npm test -- src/financialDataSecurityContracts.test.ts`

Expected: the migration contract test passes.

### Task 3: Query Hook And Dashboard Gating

**Files:**
- Modify: `src/hooks/queries/useExpenses.ts`
- Modify: `src/lib/dashboardAccess.ts`
- Modify: `src/lib/dashboardAccess.test.ts`
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Add failing dashboard access assertions**

Extend `src/lib/dashboardAccess.test.ts` to require:

```ts
expect(getDashboardAccess('instructor', 'sport_school')).toMatchObject({
  loadPayments: false,
  loadExpenses: false,
  loadProducts: false,
  loadSales: false,
});

expect(getDashboardAccess('receptionist', 'sport_school')).toMatchObject({
  loadPayments: true,
  loadExpenses: false,
  loadProducts: true,
  loadSales: true,
});

expect(getDashboardAccess('finance', 'sport_school')).toMatchObject({
  loadPayments: true,
  loadExpenses: true,
  loadProducts: false,
  loadSales: true,
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/lib/dashboardAccess.test.ts`

Expected: FAIL because `loadPayments` and `loadExpenses` are absent and school finance sales are disabled.

- [ ] **Step 3: Extend the expense hook option**

Change the hook signature and query activation:

```ts
export function useExpenses(options: { enabled?: boolean } = {}) {
  const expensesEnabled = options.enabled ?? true;
  // ...
  enabled: expensesEnabled && !!tenantId,
}
```

- [ ] **Step 4: Derive sensitive dashboard loading from the pure contract**

Add `loadPayments` and `loadExpenses` to `DashboardAccess`. Call `getSensitiveDataAccess(role, businessType)` and use its values for all four sensitive datasets while preserving the existing operational layout behavior.

- [ ] **Step 5: Gate Dashboard queries**

Use:

```ts
usePayments({ enabled: dashboardAccess.loadPayments });
useExpenses({ enabled: dashboardAccess.loadExpenses });
useSales({ enabled: dashboardAccess.loadSales });
useProducts({ enabled: dashboardAccess.loadProducts });
```

Do not alter financial calculations in this task.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- src/lib/sensitiveDataAccess.test.ts src/lib/dashboardAccess.test.ts`

Expected: all focused tests pass.

### Task 4: Reports, Notifications, And Communication Gating

**Files:**
- Modify: `src/pages/ReportsPage.tsx`
- Modify: `src/components/NotificationBell.tsx`
- Modify: `src/pages/CommunicationPage.tsx`
- Modify: `src/financialDataSecurityContracts.test.ts`

- [ ] **Step 1: Add failing static query-gating contracts**

Read the three consumer files and assert they contain:

```ts
expect(reportsPage).toContain('usePayments({ enabled: sensitiveDataAccess.payments })');
expect(reportsPage).toContain('useSales({ enabled: sensitiveDataAccess.sales })');
expect(reportsPage).toContain('useExpenses({ enabled: sensitiveDataAccess.expenses })');
expect(notificationBell).toContain('usePayments({ enabled: canViewPayments })');
expect(communicationPage).toContain('usePayments({ enabled: canUsePaymentAudiences })');
```

- [ ] **Step 2: Run the contract test and verify RED**

Run: `npm test -- src/financialDataSecurityContracts.test.ts`

Expected: FAIL because the consumers still call sensitive hooks without authorization options.

- [ ] **Step 3: Gate reports**

Resolve `organizationRole` and `businessType`, compute `getSensitiveDataAccess`, then pass its booleans to payments, sales, and expenses hooks.

- [ ] **Step 4: Gate notification payments**

Compute:

```ts
const rolePermissions = useRolePermissions();
const canViewPayments = rolePermissions.can('payments', 'view');
const { payments } = usePayments({ enabled: canViewPayments });
```

Exclude the payment tab and payment sections when `canViewPayments` is false.

- [ ] **Step 5: Gate communication payment audiences**

Compute:

```ts
const canViewPayments = rolePermissions.can('payments', 'view');
const canUsePaymentAudiences = canViewPayments && canSendCommunicationMessages;
const { payments, loadingPayments } = usePayments({ enabled: canUsePaymentAudiences });
```

Exclude school payment audiences when `canUsePaymentAudiences` is false. Keep non-financial communication audiences unchanged.

- [ ] **Step 6: Run the contract test and verify GREEN**

Run: `npm test -- src/financialDataSecurityContracts.test.ts`

Expected: migration and consumer query-gating contracts pass.

### Task 5: Align Existing Permission Contracts

**Files:**
- Modify: `src/lib/businessRouteAccess.test.ts`
- Modify: `src/lib/rolePermissions.test.ts`

- [ ] **Step 1: Update shared route expectations**

Treat `/produtos`, `/vendas`, and `/despesas` as shared business routes. Keep role denial assertions where the role does not have module permission.

- [ ] **Step 2: Update role matrix expectations**

Assert:

- School owner and manager can access products, sales, and expenses.
- School receptionist can access products and sales but not expenses.
- School finance can access sales and expenses but not products.
- Instructor cannot access any of the four sensitive datasets.

- [ ] **Step 3: Run permission tests**

Run:

`npm test -- src/lib/businessRouteAccess.test.ts src/lib/rolePermissions.test.ts src/lib/sensitiveDataAccess.test.ts src/lib/dashboardAccess.test.ts`

Expected: all permission and access tests pass.

### Task 6: Verification

**Files:**
- Verify all modified and created files.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all test files and tests pass.

- [ ] **Step 2: Run TypeScript**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Run ESLint**

Run: `npm run lint`

Expected: exit code 0.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: exit code 0 and PWA assets generated.

- [ ] **Step 5: Check patch hygiene**

Run: `git diff --check`

Expected: no whitespace errors in Phase 1 files. Pre-existing whitespace errors in unrelated dirty lines must be reported separately if still present.

- [ ] **Step 6: Review the final diff**

Confirm:

- No existing user or Antigravity changes were reverted.
- The migration changes only `SELECT` policies.
- No secrets, credentials, generated bundles, or local environment files were added.
- Phase 2 calculations and Phase 3 through 6 UI work were not implemented.
