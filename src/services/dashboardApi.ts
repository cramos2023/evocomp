import { supabase } from '../lib/supabaseClient';

export interface DashboardStats {
  activeCycles: number;
  scenariosCount: number;
  approvalProgress: {
    approved: number;
    total: number;
    percentage: number;
  };
  latestSnapshotHeadcount: number;
  budgetUtilization: number;
  activeCycleName: string | null;
}

export const dashboardApi = {
  async getDashboardStats(tenantId: string): Promise<DashboardStats> {
    const stats: DashboardStats = {
      activeCycles: 0,
      scenariosCount: 0,
      approvalProgress: { approved: 0, total: 0, percentage: 0 },
      latestSnapshotHeadcount: 0,
      budgetUtilization: 0,
      activeCycleName: null
    };

    try {
      // 1. Active cycles count
      const { count: activeCount } = await supabase
        .from('cycles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
      stats.activeCycles = activeCount || 0;

      // 2. Scenarios count
      const { count: scenariosCount } = await supabase
        .from('scenarios')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      stats.scenariosCount = scenariosCount || 0;

      // 3. Deterministic Active Cycle for progress
      const { data: activeCycle } = await supabase
        .from('cycles')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (activeCycle) {
        stats.activeCycleName = activeCycle.name;
        // Approval Progress
        const { data: plans } = await supabase
          .from('comp_merit_manager_plans')
          .select('status')
          .eq('cycle_id', activeCycle.id);

        if (plans && plans.length > 0) {
          const approved = plans.filter(p => p.status === 'approved').length;
          stats.approvalProgress = {
            approved,
            total: plans.length,
            percentage: Math.round((approved / plans.length) * 100)
          };
        }
      }

      // 4. Latest Snapshot Headcount
      const { data: latestSnapshot } = await supabase
        .from('snapshots_metrics_v')
        .select('employee_count')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      stats.latestSnapshotHeadcount = latestSnapshot?.employee_count || 0;

      // 5. Budget Utilization
      // sum(total_applied_amount) / sum(approved_budget_amount) from scenario_runs
      // Aggregating latest run per scenario to avoid duplicates if multiple runs exist
      const { data: runs } = await supabase
        .from('scenario_runs')
        .select('scenario_id, approved_budget_amount, total_applied_amount, finished_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'COMPLETED')
        .order('finished_at', { ascending: false });

      if (runs && runs.length > 0) {
        // Filter for latest run per scenario_id
        const latestRunsMap = new Map();
        runs.forEach(run => {
          if (!latestRunsMap.has(run.scenario_id)) {
            latestRunsMap.set(run.scenario_id, run);
          }
        });

        const latestRuns = Array.from(latestRunsMap.values());
        const totalBudget = latestRuns.reduce((sum, r) => sum + (Number(r.approved_budget_amount) || 0), 0);
        const totalApplied = latestRuns.reduce((sum, r) => sum + (Number(r.total_applied_amount) || 0), 0);

        stats.budgetUtilization = totalBudget > 0 ? (totalApplied / totalBudget) * 100 : 0;
      }

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }

    return stats;
  }
};
