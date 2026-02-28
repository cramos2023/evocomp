import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Send, Info, CheckCircle, ArrowRight } from 'lucide-react';
import { approvalsApi, ManagerPlan } from '../../services/approvalsApi';
import { runMeritCycleAdmin } from '../../services/meritAdminApi';
import { PlanStatusBadge } from '../../components/approvals/PlanStatusBadge';

export const ManagerWorkspacePage: React.FC = () => {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<ManagerPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; message: string; remediation: string } | null>(null);

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const data = await approvalsApi.getMyPlan();
      setPlan(data);
      if (data?.status === 'rejected') {
        const reason = await approvalsApi.getLatestRejectionReason(data.id);
        setRejectionReason(reason);
      }
    } catch (err) {
      console.error('Error fetching plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanData();
  }, []);

  const handleSubmit = async () => {
    if (!plan) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await runMeritCycleAdmin({
        action: 'submit_plan',
        cycle_id: plan.cycle_id,
        plan_id: plan.id
      });

      if (!res.ok) {
        // Handle targeted 409/422 errors if they were returned as details
        if (res.error?.includes('409')) {
          setError({
            title: t('errors.gating_failed.title'),
            message: t('errors.gating_failed.message'),
            remediation: t('errors.gating_failed.remediation')
          });
        } else if (res.error?.includes('422')) {
          setError({
            title: t('errors.dead_run_data.title'),
            message: t('errors.dead_run_data.message'),
            remediation: t('errors.dead_run_data.remediation')
          });
        }
        return;
      }

      await fetchPlanData();
    } catch (err) {
      console.error('Error submitting plan:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-8 glass-card text-center space-y-4">
        <Info className="w-12 h-12 text-slate-500 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-100">{t('approvals.manager_workspace')}</h2>
        <p className="text-slate-400">No active merit plan found for your account.</p>
      </div>
    );
  }

  const canSubmit = plan.status === 'draft' || plan.status === 'rejected';

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-8 rounded-2xl relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {t('approvals.manager_workspace')}
            </h1>
            <PlanStatusBadge status={plan.status} isLocked={plan.is_locked} />
          </div>
          <p className="text-slate-400 max-w-2xl">
            Review your team's merit recommendations and submit for approval. Once submitted, your plan will be reviewed by your assigned approver.
          </p>
        </div>

        {canSubmit && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 z-10"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {t('approvals.submit_for_approval')}
          </button>
        )}
      </div>

      {/* Error Displays (409/422) */}
      {error && (
        <div className="glass-card border-rose-500/30 bg-rose-500/5 p-6 rounded-xl space-y-4 animate-in zoom-in duration-300">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-bold uppercase tracking-wide">{error.title}</h3>
          </div>
          <div className="pl-9 space-y-4">
            <p className="text-slate-300 leading-relaxed">{error.message}</p>
            <div className="bg-slate-950/50 rounded-lg p-4 border border-rose-500/20">
              <span className="text-xs font-bold text-rose-500 uppercase block mb-2">{t('common.next_steps')}</span>
              <p className="text-slate-400 text-sm whitespace-pre-wrap">{error.remediation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Alert */}
      {plan.status === 'rejected' && (
        <div className="glass-card border-amber-500/30 bg-amber-500/5 p-6 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold uppercase tracking-wider text-sm">{t('approvals.rejection_reason')}</h3>
          </div>
          <p className="text-slate-300 pl-7 italic">
            "{rejectionReason || t('approvals.no_rejection_reason')}"
          </p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-xl border-slate-800/50 hover:border-indigo-500/30 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tighter">{t('approvals.total_applied')}</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
              <Info className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(plan.total_applied_amount)}
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl border-slate-800/50 hover:border-violet-500/30 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tighter">{t('approvals.team_members')}</span>
            <div className="p-2 bg-violet-500/10 rounded-lg group-hover:bg-violet-500/20 transition-colors">
              <CheckCircle className="w-4 h-4 text-violet-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {plan.employee_count}
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl border-slate-800/50 hover:border-emerald-500/30 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-tighter">Cycle Progress</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-1000"
              style={{ width: plan.status === 'approved' ? '100%' : '33%' }}
            />
          </div>
        </div>
      </div>

      {/* Guidance Link */}
      <div className="flex justify-center pt-8">
        <a 
          href="/app/intelligence/reports" 
          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 transition-colors underline decoration-indigo-500/30 underline-offset-4"
        >
          View detailed team impact reports
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
