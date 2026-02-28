// src/types/meritAdmin.ts

export type MeritAdminAction =
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

export type ValidatorIssueSeverity = "error" | "warning";

export interface ValidatorIssue {
  code: string;
  severity: ValidatorIssueSeverity;
  message: string;
  details?: Record<string, unknown>;
}

export interface MeritPayrollValidationReport {
  ok: boolean;
  cycle_id: string;
  generated_at: string;
  summary: {
    manager_plans_total: number;
    manager_plans_locked: number;
    effective_recommendations_count: number;
    total_recommended_amount?: number;
  };
  issues: ValidatorIssue[];
}

export interface MeritCycleAdminRequest {
  action: MeritAdminAction;
  cycle_id?: string;
  plan_id?: string;
  reason?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface MeritCycleAdminResponse {
  ok?: boolean;
  action?: MeritAdminAction;
  cycle_id?: string;
  plan_id?: string;
  locked_count?: number;
  previous_status?: string;
  new_status?: string;
  error?: string;
  details?: unknown;
}

// DB rows (minimal, flexible)
export interface CycleRowLite {
  id: string;
  name?: string | null;
  title?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface AdminClosureRow {
  id: string;
  cycle_id: string;
  action: "close" | "reopen";
  actor_user_id: string;
  action_at: string;
  reason: string | null;
  created_at: string;
}

export interface ManagerPlanRowLite {
  id: string;
  cycle_id: string;
  manager_user_id: string;
  status: string;
  locked_at: string | null;
  updated_at?: string | null;
}

export interface ManagerClosureHistoryRow {
  id: string;
  plan_id: string;
  action: string;
  actor_user_id: string;
  action_at: string;
  note: string | null;
  created_at: string;
}
export interface MeritCyclePublicationRow {
  id: string;
  tenant_id: string;
  cycle_id: string;
  scenario_id: string;
  run_id: string;
  counts: {
    total_employees: number;
    [key: string]: any;
  };
  totals: {
    total_applied_amount: number;
    [key: string]: any;
  };
  reason: string | null;
  is_recommended: boolean;
  published_at: string;
  actor_user_id: string;
  actor?: {
    full_name: string | null;
  };
}

export interface MeritPayrollExportResponse {
  ok: boolean;
  download_url: string;
  file_name: string;
  count: number;
  error?: string;
}

export interface GatingDetails {
  closed: boolean;
  plans_locked: boolean;
  validator_ok: boolean;
  counts: {
    total_plans: number;
    locked_plans: number;
  };
}

export interface PublishResponse {
  ok: boolean;
  published_count?: number;
  error?: string;
  code?: string;
  details?: GatingDetails;
}

export interface PublishStatusResponse {
  ok: boolean;
  publication?: MeritCyclePublicationRow;
  error?: string;
  code?: string;
  details?: GatingDetails;
}
