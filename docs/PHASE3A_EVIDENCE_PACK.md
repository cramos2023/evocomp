# EvoComp: Phase 3A Technical Evidence Pack

**Date**: 2026-02-25 **Objective**: Technical certification of the data pipeline
and security isolation for Phase 3A.

---

## 1. Multi-tenant Isolation (A/B Test)

### Database Level (RLS)

The `tenant_id` isolation logic has been verified for all core tables using the
`public.get_current_tenant_id()` provider.

**Reproducible Verification Step**:

1. In SQL Editor, simulate a session for Tenant A:
   ```sql
   SET LOCAL "request.jwt.claims" = '{"sub":"<user_id>", "tenant_id":"<tenant_a_uuid>"}';
   SELECT * FROM public.snapshots; -- Should ONLY return Tenant A data.
   ```
2. Repeat for Tenant B with a different `tenant_id`:
   ```sql
   SET LOCAL "request.jwt.claims" = '{"sub":"<user_id>", "tenant_id":"<tenant_b_uuid>"}';
   SELECT * FROM public.snapshots; -- Should ONLY return Tenant B data (isolated).
   ```

- **Coverage**: `snapshots`, `snapshot_employee_data`, `scenarios`,
  `scenario_runs`, `scenario_employee_results`.

**Real JWT A/B Verification**:

1. **Tooling**: Verified via `supabase-js` in a test script.
2. **Step**:
   - Authenticate as `user_a@tenant_a.com`. Retrieve session JWT.
   - Execute `const { data } = await supabase.from('snapshots').select('*')`.
   - **Result**: `data` contains only UUIDs linked to `tenant_a`.
   - Repeat as `user_b@tenant_b.com`.
   - **Result**: `data` contains only UUIDs linked to `tenant_b`.
3. **Cross-Tenant Probe**:
   - Manually call
     `supabase.from('snapshots').select('*').eq('id', '<uuid_from_b>')` while
     authenticated as `User A`.
   - **Result**: 0 rows returned (PostgREST RLS enforcement).

### Storage Level (RLS with WITH CHECK)

Storage isolation is enforced at the folder level: `imports/{tenant_id}/*`.

**Final Policy**:

```sql
CREATE POLICY "Tenant imports bucket access"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'imports'
    AND (storage.foldername(name))[1] = public.get_current_tenant_id()::text
  )
  WITH CHECK (
    bucket_id = 'imports'
    AND (storage.foldername(name))[1] = public.get_current_tenant_id()::text
  );
```

- **Security Check**: Attempting to upload to a path that doesn't match the
  JWT's `tenant_id` results in a `403 Forbidden` response via the `WITH CHECK`
  clause.

---

## 2. Infrastructure Gaps (Migration 0004)

**Finding**: The `compa_ratio` column in `snapshot_employee_data` exists
physically but the corresponding migration file `0004_fix_snapshot_schema.sql`
is missing from the repository.

**Certification**:

- **Current State**: Database is in the correct state (column exists).
- **Remediation**: Finding documented in `forensic_diagnostic.md`. No DB action
  required. Future migrations will assume this schema as baseline.

---

## 3. Edge Function Hardening (Zero-Trust)

### Server-Side Identity Verification

Edge Functions (`import-engine`, `scenario-engine`, `reporting-engine`) have
been hardened to never trust the client-provided `tenantId`.

**Verification Mechanism**:

1. Retrieve Target Resource (Scenario/Import) from DB using its ID.
2. The Database automatically applies RLS (Current User context).
3. If the resource is returned, it inherently belongs to the user's tenant.
4. An explicit cross-check is performed:
   `if (resource.tenant_id !== request.tenantId) throw AuthError`.

**Verification Status**: ✅ Verified in code for all three engines.

### Auth Model Details:

- **Client Side**: Uses the user's JWT (`Authorization: Bearer <jwt>`). RLS is
  naturally applied by the DB for all `select`/`insert` operations.
- **Edge Side (Admin/Batch)**:
  1. `supabase.auth.getUser()` identifies the caller from the request header.
  2. A `service_role` client is used for high-performance batch operations
     (bypassing RLS).
  3. **Zero-Trust Snippet**:
     ```typescript
     // 1. Identify User (Securely from JWT)
     const { data: { user } } = await supabase.auth.getUser();

     // 2. Fetch User's Tenant (Internal SOT)
     const { data: profile } = await supabaseAdmin
       .from("user_profiles")
       .select("tenant_id")
       .eq("id", user.id)
       .single();

     // 3. Filter using DB-derived Tenant ID (NEVER use request.tenantId for filtering)
     const { data: resource } = await supabaseAdmin
       .from("scenarios")
       .select("*")
       .eq("tenant_id", profile.tenant_id) // Filtered by Profile SOT
       .eq("id", request.scenarioId);

     // 4. Request.tenantId is ONLY used for Cross-Check validation
     if (
       request.tenantId &&
       String(request.tenantId) !== String(profile.tenant_id)
     ) {
       throw new Error("Tenant ID Mismatch - Possible injection attempt");
     }
     ```

---

## 4. Performance & Scalability

**Benchmark**:

- **Optimization**: Batch inserts used for employee results to minimize
  round-trips.

---

## 5. Snapshots Metrics Contract

To ensure consistent in UI reporting across the platform, the metrics in the
Snapshots Explorer follow this specification:

- **Local Currency Total**: An aggregated list of sums grouped by
  `local_currency`.
- **Base Currency Total**: A grand total calculated as `sum(base_salary_base)`.
- **Logic**: The `base_salary_base` column is pre-calculated during the
  `Publish` step of the Import Engine using FX rates valid for the snapshot
  date.
- **Verification Query**:
  `SELECT sum(base_salary_base) FROM snapshot_employee_data WHERE snapshot_id = '...'`.

---

## Certification Signature

The EvoComp platform is certified technically stable and secure for Phase 3A.
