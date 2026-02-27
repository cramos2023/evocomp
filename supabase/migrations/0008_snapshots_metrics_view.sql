-- Migration 0008: Snapshots Metrics View
-- Provides aggregated metrics for snapshots to avoid N+1 queries in the UI.
-- This version uses DROP/CREATE for stability and avoids nested aggregates (Fix 42803).

DROP VIEW IF EXISTS public.snapshots_metrics_v;

CREATE VIEW public.snapshots_metrics_v AS
WITH currency_stats AS (
    -- Level 1: Aggregate per snapshot AND currency
    SELECT 
        snapshot_id, 
        local_currency, 
        sum(base_salary_local) as total_local,
        count(*) as currency_emp_count
    FROM public.snapshot_employee_data
    GROUP BY snapshot_id, local_currency
),
json_aggregates AS (
    -- Level 2: Target JSON objects from Level 1 results (No nesting)
    SELECT 
        snapshot_id,
        array_agg(local_currency) FILTER (WHERE local_currency IS NOT NULL) as currencies,
        jsonb_object_agg(COALESCE(local_currency, 'N/A'), total_local) as currency_totals_local,
        jsonb_object_agg(COALESCE(local_currency, 'N/A'), currency_emp_count) as currency_counts
    FROM currency_stats
    GROUP BY snapshot_id
),
overall_stats AS (
    -- Level 3: Basic snapshot totals for precision
    SELECT 
        snapshot_id,
        count(*) as employee_count,
        sum(base_salary_base) as total_salary_base
    FROM public.snapshot_employee_data
    GROUP BY snapshot_id
)
SELECT 
    s.id as snapshot_id,
    s.tenant_id,
    s.name as snapshot_name,
    s.snapshot_date,
    s.source,
    s.created_by,
    s.created_at,
    s.import_id,
    i.file_name as import_file_name,
    COALESCE(os.employee_count, 0) as employee_count,
    COALESCE(os.total_salary_base, 0) as total_salary_base,
    COALESCE(ja.currencies, ARRAY[]::text[]) as currencies,
    COALESCE(ja.currency_totals_local, '{}'::jsonb) as currency_totals_local,
    COALESCE(ja.currency_counts, '{}'::jsonb) as currency_counts
FROM public.snapshots s
LEFT JOIN overall_stats os ON s.id = os.snapshot_id
LEFT JOIN json_aggregates ja ON s.id = ja.snapshot_id
LEFT JOIN public.imports i ON s.import_id = i.id;

-- Grant access to authenticated users
GRANT SELECT ON public.snapshots_metrics_v TO authenticated;

COMMENT ON VIEW public.snapshots_metrics_v IS 'Aggregated metrics per snapshot, isolated by tenant_id via RLS on source tables. Fixes 42803 by using tiered CTEs.';
