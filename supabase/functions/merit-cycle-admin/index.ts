// supabase/functions/merit-cycle-admin/index.ts
// Supabase Edge Function (Deno)
//
// Admin operations for merit cycles:
// - close_cycle / reopen_cycle -> writes into comp_merit_admin_closures
// - lock_plan / reopen_plan    -> updates comp_merit_manager_plans + writes into comp_merit_manager_closure_history
// - lock_all_plans             -> bulk lock all plans in a cycle + history rows
//
// Security:
// - Requires Authorization: Bearer <JWT>
// - Admin check via user_roles.role_id in ('admin','superadmin')
// - Uses service role for DB writes (bypasses RLS) but still enforces admin gate.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type JsonObject = Record<string, unknown>;

type Action =
  | "close_cycle"
  | "reopen_cycle"
  | "lock_plan"
  | "reopen_plan"
  | "lock_all_plans"
  | "submit_plan"
  | "approve_plan"
  | "reject_plan"
  | "return_to_manager"
  | "revoke_approval";

interface RequestBody {
  action: Action;
  cycle_id?: string;
  plan_id?: string;
  reason?: string;
  note?: string;
  metadata?: JsonObject;
}

interface UserRoleRow {
  role_id: string | number; // may be text or numeric; convert to string for compare
}

interface CycleRow {
  id: string;
  // other columns ignored intentionally
}

type PlanStatus = "draft" | "submitted" | "in_review" | "approved" | "rejected";

interface ManagerPlanRow {
  id: string;
  cycle_id: string;
  status: PlanStatus;
  manager_user_id?: string;
  approver_user_id?: string;
  is_locked: boolean;
  locked_at?: string | null;
}

interface AdminClosureInsert {
  cycle_id: string;
  action: "close" | "reopen";
  actor_user_id: string;
  action_at?: string;
  reason?: string | null;
  metadata?: JsonObject;
}

interface ApprovalHistoryInsert {
  tenant_id: string;
  plan_id: string;
  action: "submit" | "approve" | "reject" | "return_to_manager" | "revoke_approval";
  actor_user_id: string;
  action_at?: string;
  reason?: string | null;
  metadata?: JsonObject;
}

interface ClosureHistoryInsert {
  plan_id: string;
  action: "submit" | "approve" | "lock" | "reopen" | "unlock" | "reject";
  actor_user_id: string;
  action_at?: string;
  note?: string | null;
  metadata?: JsonObject;
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

import {
  getBearerToken,
  getAuthedUserId,
  requireAnyAdminRole,
  getTenantIdForUser,
} from "../_shared/auth.ts";

function mustString(v: unknown, fieldName: string): string {
  const s = String(v ?? "").trim();
  if (!s) throw new Error(`Missing or empty field: ${fieldName}`);
  return s;
}

async function ensureCycleExists(
  supabaseAdmin: SupabaseClient,
  cycleId: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("cycles")
    .select("id")
    .eq("id", cycleId)
    .limit(1);

  if (error) throw new Error("Failed to read cycles");
  const rows = (data ?? []) as CycleRow[];
  if (rows.length === 0) throw new Error("Cycle not found");
}

async function getPlan(
  supabaseAdmin: SupabaseClient,
  planId: string,
): Promise<ManagerPlanRow> {
  const { data, error } = await supabaseAdmin
    .from("comp_merit_manager_plans")
    .select("id,cycle_id,status,manager_user_id,approver_user_id,is_locked,locked_at")
    .eq("id", planId)
    .limit(1);

  if (error) throw new Error("Failed to read manager plan");
  const plan = ((data ?? []) as ManagerPlanRow[])[0];
  if (!plan) throw new Error("Plan not found");
  return plan;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed. Use POST." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return jsonResponse(500, {
      error:
        "Missing env vars. Require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.",
    });
  }

  const jwt = getBearerToken(req);
  if (!jwt) return jsonResponse(401, { error: "Missing Authorization Bearer token." });

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const action = body.action;
  if (!action) return jsonResponse(400, { error: "action is required." });

  let actorUserId: string;
  try {
    actorUserId = await getAuthedUserId(jwt);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("Unauthorized")) return jsonResponse(401, { error: "Unauthorized" });
    if (msg.includes("Forbidden")) return jsonResponse(403, { error: "Forbidden" });
    return jsonResponse(500, { error: "Auth gate failed", details: msg });
  }

  const metadata: JsonObject = body.metadata ?? {};

  try {
    if (action === "close_cycle" || action === "reopen_cycle") {
      await requireAnyAdminRole(supabaseAdmin, actorUserId);
      const cycleId = mustString(body.cycle_id, "cycle_id");
      await ensureCycleExists(supabaseAdmin, cycleId);

      const closureAction: "close" | "reopen" = action === "close_cycle" ? "close" : "reopen";

      const insertRow: AdminClosureInsert = {
        cycle_id: cycleId,
        action: closureAction,
        actor_user_id: actorUserId,
        reason: body.reason ?? null,
        metadata,
      };

      const { error } = await supabaseAdmin
        .from("comp_merit_admin_closures")
        .insert(insertRow);

      if (error) return jsonResponse(500, { error: "Failed to write admin closure", details: error as unknown as JsonObject });

      return jsonResponse(200, { ok: true, action, cycle_id: cycleId });
    }

    if (action === "lock_plan" || action === "reopen_plan") {
      await requireAnyAdminRole(supabaseAdmin, actorUserId);
      const planId = mustString(body.plan_id, "plan_id");
      const _plan = await getPlan(supabaseAdmin, planId);

      const isLocked = action === "lock_plan";
      const patch: Partial<ManagerPlanRow> & { is_locked?: boolean; locked_at?: string | null } = {
        is_locked: isLocked,
        locked_at: isLocked ? new Date().toISOString() : null,
      };

      const { error: updErr } = await supabaseAdmin
        .from("comp_merit_manager_plans")
        .update(patch)
        .eq("id", planId);

      if (updErr) return jsonResponse(500, { error: "Failed to update plan", details: updErr as unknown as JsonObject });

      const historyAction: ClosureHistoryInsert["action"] = action === "lock_plan" ? "lock" : "reopen";
      const histRow: ClosureHistoryInsert = {
        plan_id: planId,
        action: historyAction,
        actor_user_id: actorUserId,
        note: body.note ?? null,
        metadata,
      };

      const { error: histErr } = await supabaseAdmin
        .from("comp_merit_manager_closure_history")
        .insert(histRow);

      if (histErr) return jsonResponse(500, { error: "Failed to write closure history", details: histErr as unknown as JsonObject });

      return jsonResponse(200, {
        ok: true,
        action,
        plan_id: planId,
        is_locked: isLocked,
      });
    }

    if (["submit_plan", "approve_plan", "reject_plan", "return_to_manager", "revoke_approval"].includes(action)) {
      const planId = mustString(body.plan_id, "plan_id");
      const plan = await getPlan(supabaseAdmin, planId);
      const tenantId = await getTenantIdForUser(supabaseAdmin, actorUserId);
      
      let targetStatus: PlanStatus;
      let historyAction: ApprovalHistoryInsert["action"];
      
      if (action === "submit_plan") {
        if (plan.manager_user_id !== actorUserId) return jsonResponse(403, { error: "Only the matching manager can submit their plan." });
        if (plan.status !== "draft" && plan.status !== "rejected") return jsonResponse(400, { error: "Plan must be draft or rejected to submit" });
        targetStatus = "submitted";
        historyAction = "submit";
      } else if (action === "approve_plan" || action === "reject_plan" || action === "return_to_manager") {
        if (plan.approver_user_id !== actorUserId) return jsonResponse(403, { error: "Only the precisely assigned approver can process this plan." });
        
        if (action === "approve_plan") {
          if (plan.status !== "submitted" && plan.status !== "in_review") return jsonResponse(400, { error: "Plan must be submitted/in_review to approve" });
          targetStatus = "approved";
          historyAction = "approve";
        } else if (action === "reject_plan") {
          if (!body.reason) return jsonResponse(400, { error: "Reason is required to reject a plan" });
          targetStatus = "rejected";
          historyAction = "reject";
        } else {
          targetStatus = "draft";
          historyAction = "return_to_manager";
        }
      } else { // revoke_approval
        await requireAnyAdminRole(supabaseAdmin, actorUserId);
        targetStatus = "in_review";
        historyAction = "revoke_approval";
      }

      const { error: updErr } = await supabaseAdmin
        .from("comp_merit_manager_plans")
        // Handle TS missing DB column mappings natively by dynamically casting JSON payload updates securely
        .update({ status: targetStatus, ...(targetStatus === "approved" ? { approved_at: new Date().toISOString() } : {}) })
        .eq("id", planId);

      if (updErr) return jsonResponse(500, { error: "Failed to update plan status", details: updErr as unknown as JsonObject });

      const histRow: ApprovalHistoryInsert = {
        tenant_id: tenantId,
        plan_id: planId,
        action: historyAction,
        actor_user_id: actorUserId,
        reason: body.reason ?? null,
        metadata,
      };

      const { error: histErr } = await supabaseAdmin
        .from("comp_merit_approval_history")
        .insert(histRow);

      if (histErr) return jsonResponse(500, { error: "Failed to write approval history", details: histErr as unknown as JsonObject });

      return jsonResponse(200, {
        ok: true,
        action,
        plan_id: planId,
        previous_status: plan.status,
        new_status: targetStatus,
      });
    }

    if (action === "lock_all_plans") {
      await requireAnyAdminRole(supabaseAdmin, actorUserId);
      const cycleId = mustString(body.cycle_id, "cycle_id");
      await ensureCycleExists(supabaseAdmin, cycleId);

      const { data: plansData, error: plansErr } = await supabaseAdmin
        .from("comp_merit_manager_plans")
        .select("id,is_locked")
        .eq("cycle_id", cycleId);

      if (plansErr) return jsonResponse(500, { error: "Failed to read plans", details: plansErr as unknown as JsonObject });

      const plans = (plansData ?? []) as Pick<ManagerPlanRow, "id" | "is_locked">[];
      const toLock = plans.filter((p) => !p.is_locked).map((p) => p.id);

      if (toLock.length === 0) {
        return jsonResponse(200, { ok: true, action, cycle_id: cycleId, locked_count: 0 });
      }

      const nowIso = new Date().toISOString();

      const { error: bulkErr } = await supabaseAdmin
        .from("comp_merit_manager_plans")
        .update({ is_locked: true, locked_at: nowIso })
        .in("id", toLock);

      if (bulkErr) return jsonResponse(500, { error: "Failed to bulk lock plans", details: bulkErr as unknown as JsonObject });

      const historyRows: ClosureHistoryInsert[] = toLock.map((id) => ({
        plan_id: id,
        action: "lock",
        actor_user_id: actorUserId,
        note: body.note ?? "Bulk lock all plans",
        metadata: { ...metadata, bulk: true },
      }));

      const { error: histErr } = await supabaseAdmin
        .from("comp_merit_manager_closure_history")
        .insert(historyRows);

      if (histErr) return jsonResponse(500, { error: "Failed to write bulk closure history", details: histErr as unknown as JsonObject });

      return jsonResponse(200, {
        ok: true,
        action,
        cycle_id: cycleId,
        locked_count: toLock.length,
      });
    }

    return jsonResponse(400, { error: "Unsupported action", action });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Cycle not found") return jsonResponse(404, { error: msg });
    if (msg === "Plan not found") return jsonResponse(404, { error: msg });
    if (msg === "Failed to read cycles") return jsonResponse(500, { error: msg });
    if (msg === "Failed to read manager plan") return jsonResponse(500, { error: msg });
    if (msg.startsWith("Missing or empty field:")) return jsonResponse(400, { error: msg });
    return jsonResponse(500, { error: "Unhandled error", details: msg });
  }
});

