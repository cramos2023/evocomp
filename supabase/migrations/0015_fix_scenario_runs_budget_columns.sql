-- supabase/migrations/0015_fix_scenario_runs_budget_columns.sql
-- Phase 3.1 Stabilization: Canonical budget columns on scenario_runs
-- Adds standard columns if missing and backfills from existing legacy columns if present.

begin;

-- 1) Add canonical columns if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='scenario_runs' and column_name='baseline_total'
  ) then
    execute 'alter table public.scenario_runs add column baseline_total numeric';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='scenario_runs' and column_name='approved_budget_amount'
  ) then
    execute 'alter table public.scenario_runs add column approved_budget_amount numeric';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='scenario_runs' and column_name='total_applied_amount'
  ) then
    execute 'alter table public.scenario_runs add column total_applied_amount numeric';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='scenario_runs' and column_name='remaining_budget_amount'
  ) then
    execute 'alter table public.scenario_runs add column remaining_budget_amount numeric';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='scenario_runs' and column_name='budget_status'
  ) then
    execute 'alter table public.scenario_runs add column budget_status text';
  end if;
end $$;

-- 2) Backfill logic (best-effort, conditional on legacy columns existing)
-- Legacy columns observed by Antigravity: total_increase_base, total_budget_local
-- We also try common names just in case.
do $$
declare
  has_total_increase_base boolean;
  has_total_budget_local boolean;
  has_total_applied_amount boolean;
  has_approved_budget_amount boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='scenario_runs' and column_name='total_increase_base'
  ) into has_total_increase_base;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='scenario_runs' and column_name='total_budget_local'
  ) into has_total_budget_local;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='scenario_runs' and column_name='total_applied_amount'
  ) into has_total_applied_amount;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='scenario_runs' and column_name='approved_budget_amount'
  ) into has_approved_budget_amount;

  -- Backfill total_applied_amount from total_increase_base if total_applied_amount is NULL
  if has_total_increase_base then
    execute $sql$
      update public.scenario_runs
      set total_applied_amount = coalesce(total_applied_amount, total_increase_base)
      where total_applied_amount is null
    $sql$;
  end if;

  -- Backfill approved_budget_amount from total_budget_local if approved_budget_amount is NULL
  if has_total_budget_local then
    execute $sql$
      update public.scenario_runs
      set approved_budget_amount = coalesce(approved_budget_amount, total_budget_local)
      where approved_budget_amount is null
    $sql$;
  end if;

  -- Backfill remaining_budget_amount when both inputs exist
  execute $sql$
    update public.scenario_runs
    set remaining_budget_amount =
      coalesce(remaining_budget_amount, (approved_budget_amount - total_applied_amount))
    where remaining_budget_amount is null
      and approved_budget_amount is not null
      and total_applied_amount is not null
  $sql$;

  -- Backfill budget_status when remaining_budget_amount exists
  execute $sql$
    update public.scenario_runs
    set budget_status =
      coalesce(
        budget_status,
        case
          when remaining_budget_amount is null then null
          when remaining_budget_amount >= 0 then 'WITHIN'
          else 'OVER'
        end
      )
    where budget_status is null
  $sql$;

end $$;

-- 3) Helpful indexes for “closest-to-target” selection
create index if not exists idx_scenario_runs_scenario_created_at
  on public.scenario_runs (scenario_id, created_at desc);

commit;
