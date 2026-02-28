// src/services/meritAdminApi.ts
import type {
  AdminClosureRow,
  CycleRowLite,
  ManagerClosureHistoryRow,
  ManagerPlanRowLite,
  MeritCycleAdminRequest,
  MeritCycleAdminResponse,
  MeritPayrollValidationReport,
  MeritCyclePublicationRow,
  MeritPayrollExportResponse,
  PublishResponse,
  PublishStatusResponse,
} from "../types/meritAdmin";

// IMPORTANT: adjust this import to your project’s supabase client path.
// Common patterns:
// - import { supabase } from "@/lib/supabaseClient";
// - import { supabase } from "@/supabaseClient";
import { supabase } from "../lib/supabaseClient";

export async function listCyclesLite(): Promise<CycleRowLite[]> {
  // Keep selection tolerant: not all schemas have "name/title/status"
  const { data, error } = await supabase
    .from("cycles")
    .select("id,name,status,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CycleRowLite[];
}

export async function runMeritPayrollValidator(
  cycleId: string,
): Promise<MeritPayrollValidationReport> {
  const { data, error } = await supabase.functions.invoke("merit-payroll-validator", {
    body: { cycle_id: cycleId },
  });

  if (error) throw error;
  return data as MeritPayrollValidationReport;
}

export async function runMeritCycleAdmin(
  req: MeritCycleAdminRequest,
): Promise<MeritCycleAdminResponse> {
  const { data, error } = await supabase.functions.invoke("merit-cycle-admin", {
    body: req,
  });

  if (error) {
    // surface function error payload if present
    return {
      ok: false,
      action: req.action,
      cycle_id: req.cycle_id,
      plan_id: req.plan_id,
      error: error.message,
      details: error,
    };
  }

  return data as MeritCycleAdminResponse;
}

export async function listAdminClosuresByCycle(
  cycleId: string,
  limit = 20,
): Promise<AdminClosureRow[]> {
  const { data, error } = await supabase
    .from("comp_merit_admin_closures")
    .select("id,cycle_id,action,actor_user_id,action_at,reason,created_at")
    .eq("cycle_id", cycleId)
    .order("action_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AdminClosureRow[];
}

export async function listManagerPlansByCycle(
  cycleId: string,
): Promise<ManagerPlanRowLite[]> {
  const { data, error } = await supabase
    .from("comp_merit_manager_plans")
    .select("id,cycle_id,manager_user_id,status,locked_at,updated_at")
    .eq("cycle_id", cycleId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ManagerPlanRowLite[];
}

export async function listManagerClosureHistoryForPlans(
  planIds: string[],
  limit = 50,
): Promise<ManagerClosureHistoryRow[]> {
  if (planIds.length === 0) return [];

  const { data, error } = await supabase
    .from("comp_merit_manager_closure_history")
    .select("id,plan_id,action,actor_user_id,action_at,note,created_at")
    .in("plan_id", planIds)
    .order("action_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ManagerClosureHistoryRow[];
}
export async function getPublishStatus(
  cycleId: string,
): Promise<PublishStatusResponse> {
  const { data, error } = await supabase.functions.invoke("merit-cycle-publisher", {
    body: { action: "get_publish_status", cycle_id: cycleId }
  });

  if (error) {
    // Invoke error usually returns a PostgrestError or similar, 
    // but here we check for specific 409 metadata if present
    return { ok: false, error: error.message };
  }
  return data as PublishStatusResponse;
}

export async function publishEffectiveRecs(req: {
  cycle_id: string;
  scenario_id: string;
  run_id: string;
  reason?: string;
  is_recommended?: boolean;
  overwrite?: boolean;
}): Promise<PublishResponse> {
  const { data, error } = await supabase.functions.invoke("merit-cycle-publisher", {
    body: { ...req, action: "publish_effective_recs" }
  });

  if (error) {
    // Invoke error might encapsulate the 409 payload in error.context or similar
    // but standard functions.invoke might just throw. 
    // Let's ensure we return the data if it exists even on error
    return (data as PublishResponse) || { ok: false, error: error.message };
  }
  return data as PublishResponse;
}

export async function exportPayrollCsv(
  cycleId: string,
): Promise<MeritPayrollExportResponse> {
  const { data, error } = await supabase.functions.invoke("merit-payroll-exporter", {
    body: { cycle_id: cycleId },
  });

  if (error) throw error;
  return data as MeritPayrollExportResponse;
}
