// supabase/functions/merit-payroll-validator/index.ts
// Deno (Supabase Edge Functions)
//
// Purpose:
// Validate that a merit cycle is "payroll-ready" by checking:
// - Cycle exists
// - Manager plans are locked (or at least not in draft/submitted)
// - Effective recommendations exist
// - Basic budget sanity (if cycle carries budget fields)
// - Produce a structured report for audit + UI display
//
// Security:
// - Requires Authorization: Bearer <JWT>
// - Role check: user_roles.role_id in ('admin','superadmin')
// - Uses service role for DB reads (bypasses RLS). Still validates caller role.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Json = Record<string, unknown>;

type Issue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  details?: Json;
};

type ValidationReport = {
  ok: boolean;
  cycle_id: string;
  generated_at: string;
  summary: {
    manager_plans_total: number;
    manager_plans_locked: number;
    effective_recommendations_count: number;
    total_recommended_amount?: number;
  };
  issues: Issue[];
};

interface ManagerPlan {
  id: string;
  status: string;
  manager_user_id: string;
  locked_at: string | null;
}

interface EffectiveRecommendation {
  id: string;
  recommended_increase_amount: number | null;
  currency: string;
  employee_external_id: string;
}

interface UserRole {
  role_id: string | number;
}

interface RequestBody {
  cycle_id?: string;
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
} from "../_shared/auth.ts";

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed. Use POST." });
  }

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

  let roleGateOk = false;
  let roleGateError = "";
  let roleGateStatus = 500;
  try {
    const userId = await getAuthedUserId(jwt);
    await requireAnyAdminRole(supabaseAdmin, userId);
    roleGateOk = true;
  } catch (e) {
    const msg = (e as Error).message;
    roleGateError = msg;
    if (msg.includes("Unauthorized")) roleGateStatus = 401;
    else if (msg.includes("Forbidden")) roleGateStatus = 403;
  }

  if (!roleGateOk) {
    return jsonResponse(roleGateStatus, { error: roleGateError });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const cycleId = String(body?.cycle_id ?? "").trim();
  if (!cycleId) {
    return jsonResponse(400, { error: "cycle_id is required." });
  }

  const issues: Issue[] = [];

  // 1) Cycle exists
  const { data: cycleRows, error: cycleErr } = await supabaseAdmin
    .from("cycles")
    .select("*")
    .eq("id", cycleId)
    .limit(1);

  if (cycleErr) {
    return jsonResponse(500, { error: "Failed to read cycles.", details: cycleErr as unknown as Json });
  }
  const cycle = (cycleRows ?? [])[0] as Record<string, unknown> | undefined;
  if (!cycle) {
    return jsonResponse(404, { error: "Cycle not found.", cycle_id: cycleId });
  }

  // Optional: detect common fields without assuming schema
  const cycleBudgetPct = toNumber(cycle.budget_pct ?? cycle.budgetPercent);
  const cycleBudgetAmount = toNumber(cycle.budget_amount ?? cycle.budgetAmount);
  const cycleCurrency = (cycle.currency as string) ?? (cycle.base_currency as string) ?? null;

  // 2) Manager plans and locked count
  const { data: plans, error: plansErr } = await supabaseAdmin
    .from("comp_merit_manager_plans")
    .select("id,status,manager_user_id,locked_at")
    .eq("cycle_id", cycleId);

  if (plansErr) {
    return jsonResponse(500, { error: "Failed to read manager plans.", details: plansErr as unknown as Json });
  }

  const typedPlans = (plans as unknown as ManagerPlan[]) ?? [];
  const managerPlansTotal = typedPlans.length;
  const managerPlansLocked = typedPlans.filter((p) => p.status === "locked").length;

  if (managerPlansTotal === 0) {
    issues.push({
      code: "NO_MANAGER_PLANS",
      severity: "error",
      message: "No manager plans found for this cycle.",
    });
  } else if (managerPlansLocked !== managerPlansTotal) {
    issues.push({
      code: "PLANS_NOT_LOCKED",
      severity: "error",
      message: "Not all manager plans are locked.",
      details: {
        total: managerPlansTotal,
        locked: managerPlansLocked,
        not_locked: typedPlans
          .filter((p) => p.status !== "locked")
          .map((p) => ({ id: p.id, status: p.status, manager_user_id: p.manager_user_id })) as unknown as Json,
      },
    });
  }

  // 3) Effective recommendations
  const { data: recs, error: recsErr } = await supabaseAdmin
    .from("comp_merit_effective_recommendations")
    .select("id,recommended_increase_amount,currency,employee_external_id")
    .eq("cycle_id", cycleId);

  if (recsErr) {
    return jsonResponse(500, { error: "Failed to read effective recommendations.", details: recsErr as unknown as Json });
  }

  const typedRecs = (recs as unknown as EffectiveRecommendation[]) ?? [];
  const effectiveCount = typedRecs.length;
  if (effectiveCount === 0) {
    issues.push({
      code: "NO_EFFECTIVE_RECS",
      severity: "error",
      message: "No effective recommendations exist for this cycle.",
    });
  }

  // Sum recommended amounts (only numeric)
  const totalRecommendedAmount =
    typedRecs
      .map((r) => toNumber(r.recommended_increase_amount))
      .filter((n: number | null): n is number => n !== null)
      .reduce((a: number, b: number) => a + b, 0);

  // 4) Budget sanity (best-effort; only validate if cycle has budget fields)
  if (cycleBudgetAmount !== null) {
    if (totalRecommendedAmount > cycleBudgetAmount) {
      issues.push({
        code: "BUDGET_EXCEEDED_AMOUNT",
        severity: "error",
        message: "Total recommended increase exceeds cycle budget amount.",
        details: {
          budget_amount: cycleBudgetAmount,
          total_recommended_amount: totalRecommendedAmount,
          currency: cycleCurrency ?? "unknown",
        },
      });
    } else if (totalRecommendedAmount > cycleBudgetAmount * 0.98) {
      issues.push({
        code: "BUDGET_CLOSE_TO_LIMIT",
        severity: "warning",
        message: "Total recommended increase is close to the cycle budget amount.",
        details: {
          budget_amount: cycleBudgetAmount,
          total_recommended_amount: totalRecommendedAmount,
          currency: cycleCurrency ?? "unknown",
        },
      });
    }
  } else if (cycleBudgetPct !== null) {
    // Without a reliable "total comp basis" we can only warn that pct is present but not enforced.
    issues.push({
      code: "BUDGET_PCT_PRESENT_NO_BASIS",
      severity: "warning",
      message:
        "Cycle has a budget percentage, but no authoritative comp-basis total was detected to enforce it.",
      details: { budget_pct: cycleBudgetPct },
    });
  }

  // 5) Currency consistency warning (if multiple currencies exist)
  const recCurrencies = new Set(typedRecs.map((r) => String(r.currency ?? "")).filter(Boolean));
  if (recCurrencies.size > 1) {
    issues.push({
      code: "MULTI_CURRENCY_RECS",
      severity: "warning",
      message: "Effective recommendations contain multiple currencies. Ensure FX normalization before payroll.",
      details: { currencies: Array.from(recCurrencies) as unknown as Json },
    });
  }

  // 6) Snapshot coverage (best-effort)
  // If cycle contains snapshot_id and snapshot_employee_data has rows, warn if recs look sparse.
  const snapshotId = (cycle.snapshot_id as string) ?? (cycle.snapshotId as string) ?? null;
  if (snapshotId) {
    const { count: snapCount, error: snapErr } = await supabaseAdmin
      .from("snapshot_employee_data")
      .select("*", { count: "exact", head: true })
      .eq("snapshot_id", snapshotId);

    if (!snapErr && typeof snapCount === "number" && snapCount > 0) {
      if (effectiveCount < Math.floor(snapCount * 0.5)) {
        issues.push({
          code: "LOW_REC_COVERAGE_VS_SNAPSHOT",
          severity: "warning",
          message:
            "Effective recommendations count is low compared to snapshot headcount (best-effort heuristic).",
          details: {
            snapshot_id: snapshotId,
            snapshot_headcount: snapCount,
            effective_recommendations: effectiveCount,
          } as unknown as Json,
        });
      }
    }
  }

  const report: ValidationReport = {
    ok: issues.filter((i) => i.severity === "error").length === 0,
    cycle_id: cycleId,
    generated_at: new Date().toISOString(),
    summary: {
      manager_plans_total: managerPlansTotal,
      manager_plans_locked: managerPlansLocked,
      effective_recommendations_count: effectiveCount,
      total_recommended_amount: Number.isFinite(totalRecommendedAmount)
        ? totalRecommendedAmount
        : undefined,
    },
    issues,
  };

  return jsonResponse(200, report);
});

