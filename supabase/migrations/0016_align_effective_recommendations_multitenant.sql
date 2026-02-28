-- supabase/migrations/0016_align_effective_recommendations_multitenant.sql
-- Phase 3.1 Stabilization: Align effective recommendations schema for Edge Function Publisher
-- The publisher needs to write tenant context and audit logs which the table currently lacks.

begin;

-- Add tenant_id (Required for RLS and multi-tenant isolation)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='comp_merit_effective_recommendations' and column_name='tenant_id'
  ) then
    execute 'alter table public.comp_merit_effective_recommendations add column tenant_id uuid references public.tenants(id)';
  end if;

  -- Add actor_user_id (Required for Audit trailing)
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='comp_merit_effective_recommendations' and column_name='actor_user_id'
  ) then
    execute 'alter table public.comp_merit_effective_recommendations add column actor_user_id uuid references public.user_profiles(id)';
  end if;

  -- Add published_at (Required for Export filterting / traceability)
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='comp_merit_effective_recommendations' and column_name='published_at'
  ) then
    execute 'alter table public.comp_merit_effective_recommendations add column published_at timestamptz default now()';
  end if;
end $$;

-- Add indexes for typical query patterns (Exporting CSV by cycle and tenant)
create index if not exists idx_merit_eff_recs_tenant_cycle 
  on public.comp_merit_effective_recommendations(tenant_id, cycle_id);

commit;
