import { supabase } from '../lib/supabaseClient';
import { MeritAdminAction } from '../types/meritAdmin';

export interface ManagerPlan {
  id: string;
  tenant_id: string;
  cycle_id: string;
  manager_user_id: string;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'locked';
  is_locked: boolean;
  approval_chain_json: any;
  approver_user_id: string | null;
  approved_at: string | null;
  total_applied_amount: number;
  employee_count: number;
}

export interface ApprovalHistory {
  id: string;
  plan_id: string;
  action: MeritAdminAction;
  actor_user_id: string;
  action_at: string;
  reason: string | null;
  metadata: any;
}

export const approvalsApi = {
  /**
   * Fetches the current user's manager plan for the most recent active cycle.
   */
  async getMyPlan() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('comp_merit_manager_plans')
      .select('*')
      .eq('manager_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as ManagerPlan | null;
  },

  /**
   * Fetches the latest rejection reason for a specific plan from history.
   */
  async getLatestRejectionReason(planId: string) {
    const { data, error } = await supabase
      .from('comp_merit_approval_history')
      .select('reason')
      .eq('plan_id', planId)
      .eq('action', 'reject_plan' as MeritAdminAction)
      .order('action_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.reason as string | null;
  },

  /**
   * Lists all plans assigned to the current user for approval.
   * Admins see everything.
   */
  async listInboxPlans(isAdmin: boolean = false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('comp_merit_manager_plans')
      .select('*, manager:manager_user_id(*)'); // Assuming manager_user_id links to a profiles view or similar if available

    if (!isAdmin) {
      query = query.eq('approver_user_id', user.id);
    } else {
      // Admins might want to see all non-draft plans or just everything
      // For MVP, we'll show all pending/processed plans to admins
      query = query.neq('status', 'draft');
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    return data as (ManagerPlan & { manager: any })[];
  },

  /**
   * Checks for visibility of sidebar links based on data residency.
   */
  async checkVisibility() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { hasMyPlan: false, hasInbox: false };

    // Check for My Plan
    const { count: planCount } = await supabase
      .from('comp_merit_manager_plans')
      .select('*', { count: 'exact', head: true })
      .eq('manager_user_id', user.id);

    // Check for Inbox (assigned as approver)
    const { count: approverCount } = await supabase
      .from('comp_merit_manager_plans')
      .select('*', { count: 'exact', head: true })
      .eq('approver_user_id', user.id);

    return {
      hasMyPlan: (planCount ?? 0) > 0,
      hasInbox: (approverCount ?? 0) > 0
    };
  }
};
