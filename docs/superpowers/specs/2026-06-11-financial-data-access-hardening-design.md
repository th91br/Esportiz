# Financial Data Access Hardening Design

## Objective

Protect organization financial and commercial data at the database boundary and prevent the frontend from requesting datasets that the current role is not allowed to use.

This phase addresses read access only. Existing write permissions, financial RPC behavior, and business workflows remain unchanged unless a read policy is required for an already-authorized workflow.

## Access Contract

| Dataset | Owner | Manager | Receptionist | Finance | Instructor |
| --- | --- | --- | --- | --- | --- |
| Payments | Read | Read | Read | Read | Denied |
| Sales | Read | Read | Read | Read | Denied |
| Expenses | Read | Read | Denied | Read | Denied |
| Products | Read | Read | Read | Denied | Denied |

The contract applies to both `sport_school` and `arena`. Business-type route restrictions and action permissions continue to be enforced separately.

The `finance` role receives read-only sales access because sales contribute to financial dashboards and reports. It does not receive permission to create or delete sales.

## Database Design

A new additive Supabase migration will replace the broad organization-member `SELECT` policies for:

- `payments`
- `sales`
- `expenses`
- `products`

The migration will:

1. Keep row-level security enabled.
2. Drop the broad `Organization members can view <table>` policies for these tables.
3. Create table-specific role-aware `SELECT` policies using `public.has_organization_role`.
4. Preserve legacy owner policies such as `auth.uid() = user_id`.
5. Preserve existing insert, update, delete, trigger, RPC, and audit behavior.
6. Apply policies only when the table and `organization_id` column exist, matching the defensive migration style already used by the project.

Policy role lists:

- Payments: `owner`, `manager`, `receptionist`, `finance`
- Sales: `owner`, `manager`, `receptionist`, `finance`
- Expenses: `owner`, `manager`, `finance`
- Products: `owner`, `manager`, `receptionist`

PostgreSQL RLS policies are permissive by default, so the broad organization-member policies must be removed. Adding restrictive-looking policies without removing the broad policies would not close the exposure.

## Frontend Design

Query hooks will continue to support their current consumers, but every sensitive query will accept an explicit `enabled` option:

- `usePayments` already supports `enabled`.
- `useSales` already supports `enabled`.
- `useProducts` already supports `enabled`.
- `useExpenses` will gain `enabled`.

Consumers will derive query activation from `useRolePermissions()`:

- Dashboard loads only datasets required by visible, authorized sections.
- Reports loads financial datasets only for roles with the corresponding module permission.
- Notification bell loads payments only for roles allowed to view payments.
- Communication loads payments only when the role can use payment-based audiences.
- Direct module pages remain protected by `ProtectedRoute` and load their own authorized data normally.

Disabling a query returns the hook's normal empty collection and a non-loading state. Components must not infer authorization from an empty result; authorization remains controlled by the centralized permission layer.

## Compatibility And Failure Behavior

- Organization owners retain access through both ownership and role-aware policies.
- Team members retain only the datasets listed in the access contract.
- Legacy records with a valid owner `user_id` remain readable by the owner.
- Records without `organization_id` do not become visible to team members.
- Unauthorized direct table requests return no rows under RLS.
- Existing mutation RPCs remain the source of authorization for protected financial writes.

## Testing Strategy

Implementation follows test-driven development:

1. Add failing frontend contract tests for dataset loading by role.
2. Add a static migration contract test that verifies broad financial policies are removed and role-specific policies are present.
3. Implement the migration and frontend query gating.
4. Run focused tests until green.
5. Run the full regression suite, TypeScript, ESLint, build, and `git diff --check`.

The migration test validates repository policy intent without requiring production credentials. Applying the migration to a local or staging Supabase instance remains a deployment verification step.

## Out Of Scope

- Correcting school financial totals and loading synchronization, covered by Phase 2.
- Updating the visual role-permission matrix, covered by Phase 3.
- Completing school report visualizations, covered by Phase 4.
- Navigation, responsive layout, and accessibility refinements, covered by Phases 5 and 6.
- Expanding write permissions for the `finance` role.

## Acceptance Criteria

- An instructor cannot read payments, sales, expenses, or products through organization membership.
- A receptionist cannot read expenses but can read payments, sales, and products.
- A finance member can read payments, sales, and expenses but not products.
- Owner and manager access remains operational.
- Sensitive queries are not issued when the current role lacks permission.
- Existing write and RPC behavior is unchanged.
- Focused security tests and the complete project regression checks pass.
