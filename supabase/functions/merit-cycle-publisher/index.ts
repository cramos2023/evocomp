// supabase/functions/merit-cycle-publisher/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PublishRequest {
  action: "publish_effective_recs" | "get_publish_status";
  cycle_id: string;
  scenario_id?: string;
  run_id?: string;
  reason?: string;
  is_recommended?: boolean;
  overwrite?: boolean;
  metadata?: Record<string, unknown>;
}

import {
  getBearerToken,
  getAuthedUserId,
  requireAnyAdminRole,
  getTenantIdForUser,
} from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Auth check
    const token = getBearerToken(req);
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    let userId: string;
    try {
      userId = await getAuthedUserId(token);
      await requireAnyAdminRole(supabase, userId);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("Unauthorized")) return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      if (msg.includes("Forbidden")) return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), { status: 403, headers: corsHeaders });
      return new Response(JSON.stringify({ ok: false, error: "Admin gate failed", details: msg }), { status: 500, headers: corsHeaders });
    }
    
    let tenantId: string;
    try {
      tenantId = await getTenantIdForUser(supabase, userId);
    } catch {
      return new Response(JSON.stringify({ error: "Tenant not found for user" }), { status: 500, headers: corsHeaders });
    }

    // 3. Parse Body
    const body: PublishRequest = await req.json();
    const { action, cycle_id } = body;

    if (action === "publish_effective_recs") {
      const { scenario_id, run_id, reason, is_recommended, overwrite } = body;
      if (!scenario_id || !run_id) throw new Error("scenario_id and run_id are required");

      // Multi-tenant Validation
      const { data: validCycle } = await supabase.from("cycles").select("id").eq("id", cycle_id).eq("tenant_id", tenantId).single();
      if (!validCycle) throw new Error("Cycle does not belong to your tenant");

      const { data: scenario } = await supabase.from("scenarios").select("id, status").eq("id", scenario_id).eq("tenant_id", tenantId).single();
      if (!scenario || scenario.status !== "COMPLETE") throw new Error("Scenario is not COMPLETE or does not belong to tenant");

      const { data: run } = await supabase.from("scenario_runs").select("*").eq("id", run_id).eq("scenario_id", scenario_id).single();
      if (!run) throw new Error("Run does not belong to scenario or tenant");

      // --- START GATING POLICY ---
      console.log(`[Publisher] Executing Gating Policy for cycle: ${cycle_id}`);
      
      // Gate 1: Cycle CLOSED (via comp_merit_admin_closures)
      // Rule: Last event must be 'close'
      const { data: closureEvents, error: closureError } = await supabase
        .from("comp_merit_admin_closures")
        .select("action")
        .eq("cycle_id", cycle_id)
        .order("action_at", { ascending: false })
        .limit(1);
      
      if (closureError) throw closureError;
      const isClosed = closureEvents && closureEvents.length > 0 && closureEvents[0].action === "close";

      // Gate 2: Manager Plans LOCKED
      // Rule: total > 0 AND locked == total
      const { data: planCounts, error: planError } = await supabase
        .from("comp_merit_manager_plans")
        .select("status")
        .eq("cycle_id", cycle_id);
      
      if (planError) throw planError;
      const totalPlans = planCounts?.length || 0;
      const approvedPlans = planCounts?.filter(p => p.status === "approved").length || 0;
      
      // --- ZERO PLANS GATE ---
      if (totalPlans === 0) {
        console.warn(`[Publisher] GATING FAILED for cycle ${cycle_id}: NO_MANAGER_PLANS`);
        return new Response(JSON.stringify({
          ok: false,
          code: "NO_MANAGER_PLANS",
          details: {
            message: "Cycle cannot be published with zero manager plans.",
            closed: isClosed,
            plans_approved: false,
            counts: {
              total_plans: 0,
              approved_plans: 0
            }
          }
        }), { status: 409, headers: corsHeaders });
      }

      const arePlansApproved = approvedPlans === totalPlans;

      // --- GENERAL GATING FINAL DECISION ---
      if (!isClosed || !arePlansApproved) {
        console.warn(`[Publisher] GATING FAILED for cycle ${cycle_id}:`, { isClosed, arePlansApproved });
        return new Response(JSON.stringify({
          ok: false,
          code: "GATING_FAILED",
          details: {
            closed: isClosed,
            plans_approved: arePlansApproved,
            counts: {
              total_plans: totalPlans,
              approved_plans: approvedPlans
            }
          }
        }), { status: 409, headers: corsHeaders });
      }
      
      console.log(`[Publisher] GATING PASSED for cycle ${cycle_id}`);
      // --- END GATING POLICY ---

      // --- START PAYLOAD INTEGRITY GATE ---
      console.log(`[Publisher] Executing Payload Integrity Gate for run: ${run_id}`);
      const { data: results, error: resError } = await supabase
        .from("scenario_employee_results")
        .select("*")
        .eq("scenario_run_id", run_id);
      
      if (resError) throw resError;
      if (!results || results.length === 0) throw new Error("No results found in run to publish");

      const totalSalary = results.reduce((sum, r) => sum + (Number(r.salary_basis_amount) || 0), 0);
      const criticalNulls = results.filter(r => 
        !r.employee_external_id || 
        r.salary_basis_amount === null || 
        r.applied_pct === null ||
        !r.base_currency
      );

      if (totalSalary === 0 || criticalNulls.length > 0) {
        console.error(`[Publisher] DEAD_RUN_DATA detected for run ${run_id}`, { totalSalary, null_rows: criticalNulls.length });
        return new Response(JSON.stringify({
          ok: false,
          code: "DEAD_RUN_DATA",
          message: "The selected run contains invalid or zeroed-out merit data and cannot be published.",
          details: {
            run_id: run_id,
            rows: results.length,
            salary_sum: totalSalary,
            null_rows: criticalNulls.length,
            sample_null_ids: criticalNulls.slice(0, 3).map(r => r.id)
          }
        }), { status: 422, headers: corsHeaders });
      }
      console.log(`[Publisher] Payload Integrity PASSED for run ${run_id}`);
      // --- END PAYLOAD INTEGRITY GATE ---

      // Idempotency check
      if (!overwrite) {
        const { count } = await supabase.from("comp_merit_cycle_publications").select("*", { count: "exact", head: true }).eq("cycle_id", cycle_id);
        if (count && count > 0) return new Response(JSON.stringify({ error: "ALREADY_PUBLISHED", message: "Cycle is already published. Use overwrite: true to replace." }), { status: 409, headers: corsHeaders });
      }

      // 2. Prepare Effective Recommendations
      const effectiveRecs = results.map(r => ({
        tenant_id: tenantId,
        cycle_id: cycle_id,
        scenario_id: scenario_id,
        employee_external_id: r.employee_external_id,
        current_base_salary: r.salary_basis_amount,
        recommended_increase_pct: r.applied_pct,
        recommended_increase_amount: r.increase_amount,
        effective_new_base_salary: r.new_amount,
        currency: r.before_json?.currency || "USD",
        comp_basis: r.before_json?.comp_basis || "base_salary",
        published_at: new Date().toISOString(),
        actor_user_id: userId,
        metadata: { run_id: run_id }
      }));

      // 3. Transactions (Atomic-ish)
      if (overwrite) {
        await supabase.from("comp_merit_effective_recommendations").delete().eq("cycle_id", cycle_id).eq("tenant_id", tenantId);
        await supabase.from("comp_merit_cycle_publications").delete().eq("cycle_id", cycle_id).eq("tenant_id", tenantId);
      }

      const { error: insRecError } = await supabase.from("comp_merit_effective_recommendations").insert(effectiveRecs);
      if (insRecError) {
        console.error("[Publisher] insRecError:", JSON.stringify(insRecError));
        throw insRecError;
      }

      const { error: insPubError } = await supabase.from("comp_merit_cycle_publications").insert({
        tenant_id: tenantId,
        cycle_id: cycle_id,
        scenario_id: scenario_id,
        run_id: run_id,
        counts: { total_employees: results.length },
        totals: { total_applied_amount: run.total_applied_amount },
        reason: is_recommended ? null : reason,
        actor_user_id: userId
      });
      if (insPubError) throw insPubError;

      return new Response(JSON.stringify({ ok: true, published_count: results.length }), { status: 200, headers: corsHeaders });
    }

    if (action === "get_publish_status") {
      const { data: pub, error: pubError } = await supabase
        .from("comp_merit_cycle_publications")
        .select("*, actor:user_profiles(full_name)")
        .eq("cycle_id", cycle_id)
        .eq("tenant_id", tenantId)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (pubError) throw pubError;
      return new Response(JSON.stringify({ ok: true, publication: pub }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), { status: 400, headers: corsHeaders });

  } catch (err: unknown) {
    let message = String(err);
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "object" && err !== null) {
      try {
        message = JSON.stringify(err);
      } catch {
        // ignore circular
      }
    }
    console.error(`[Publisher Error]`, message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
