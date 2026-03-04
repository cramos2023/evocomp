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
      <div className="max-w-4xl mx-auto mt-16 p-16 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] text-center space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="w-24 h-24 bg-[rgb(var(--bg-surface-2))] rounded-3xl flex items-center justify-center mx-auto border border-[rgb(var(--border))] transition-all">
          <Info className="w-12 h-12 text-[rgb(var(--text-muted))]" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{t('approvals.manager_workspace')}</h2>
          <p className="text-[rgb(var(--text-secondary))] text-lg font-bold tracking-tight">{t('approvals.no_active_plan', 'No active merit plan found for your account.')}</p>
        </div>
      </div>
    );
  }

  const canSubmit = plan.status === 'draft' || plan.status === 'rejected';

  return (
    <div className="max-w-6xl mx-auto space-y-10 p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] p-10 shadow-[var(--shadow-sm)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[rgb(var(--primary))] opacity-[0.02] blur-[100px] rounded-full -mr-48 -mt-48 transition-all duration-1000 group-hover:opacity-[0.05]" />
        
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-5">
            <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none">
              {t('approvals.manager_workspace')}
            </h1>
            <PlanStatusBadge status={plan.status} isLocked={plan.is_locked} />
          </div>
          <p className="text-[rgb(var(--text-secondary))] text-lg font-bold max-w-2xl leading-relaxed">
            {t('approvals.review_team_recs', "Review your team's merit recommendations and submit for approval. Once submitted, your plan will be reviewed by your assigned approver.")}
          </p>
        </div>

        {canSubmit && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-premium px-10 py-4 text-xs font-black tracking-widest uppercase relative z-10"
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
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-[var(--radius-card)] space-y-5 animate-in zoom-in duration-300">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-xl font-black uppercase tracking-widest">{error.title}</h3>
          </div>
          <div className="pl-9 space-y-5">
            <p className="text-rose-900 font-bold leading-relaxed">{error.message}</p>
            <div className="bg-white rounded-2xl p-6 border border-rose-200 shadow-sm">
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-2">{t('common.next_steps')}</span>
              <p className="text-rose-800 text-sm font-bold whitespace-pre-wrap">{error.remediation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Alert */}
      {plan.status === 'rejected' && (
        <div className="bg-amber-50 border border-amber-100 p-8 rounded-[var(--radius-card)] space-y-3 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest text-xs">{t('approvals.rejection_reason')}</h3>
          </div>
          <p className="text-amber-900 pl-8 italic font-bold leading-relaxed">
            "{rejectionReason || t('approvals.no_rejection_reason')}"
          </p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[rgb(var(--text-muted))] text-[10px] font-black uppercase tracking-[0.2em]">{t('approvals.total_applied')}</span>
            <div className="w-12 h-12 bg-[rgb(var(--bg-surface-2))] rounded-xl flex items-center justify-center text-indigo-600 border border-[rgb(var(--border))] group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Info className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-black text-[rgb(var(--text-primary))] font-mono tracking-tighter">
            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(plan.total_applied_amount)}
          </div>
        </div>

        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[rgb(var(--text-muted))] text-[10px] font-black uppercase tracking-[0.2em]">{t('approvals.team_members')}</span>
            <div className="w-12 h-12 bg-[rgb(var(--bg-surface-2))] rounded-xl flex items-center justify-center text-violet-600 border border-[rgb(var(--border))] group-hover:bg-violet-600 group-hover:text-white transition-all">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="text-3xl font-black text-[rgb(var(--text-primary))] font-mono tracking-tighter">
            {plan.employee_count}
          </div>
        </div>

        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[rgb(var(--text-muted))] text-[10px] font-black uppercase tracking-[0.2em]">{t('approvals.cycle_progress', 'Cycle Progress')}</span>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
              <ArrowRight className="w-6 h-6" />
            </div>
          </div>
          <div className="h-4 w-full bg-[rgb(var(--bg-surface-2))] rounded-full mt-6 overflow-hidden border border-[rgb(var(--border))]">
            <div 
              className="h-full bg-gradient-to-r from-[rgb(var(--primary))] to-blue-400 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(46,79,210,0.3)]"
              style={{ width: plan.status === 'approved' ? '100%' : '33%' }}
            />
          </div>
        </div>
      </div>

      {/* Guidance Link */}
      <div className="flex justify-center pt-12">
        <a 
          href="/app/intelligence/reports" 
          className="bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] px-8 py-3 rounded-full text-[rgb(var(--primary))] hover:bg-[rgb(var(--bg-surface))] transition-all text-xs font-black uppercase tracking-widest flex items-center gap-3 group shadow-sm"
        >
          {t('approvals.view_reports', 'View detailed team impact reports')}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  );
};
