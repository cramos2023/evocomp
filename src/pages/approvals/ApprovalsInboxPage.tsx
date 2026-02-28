import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox, CheckCircle2, XCircle, Undo2, Users, Search, Filter } from 'lucide-react';
import { approvalsApi, ManagerPlan } from '../../services/approvalsApi';
import { runMeritCycleAdmin } from '../../services/meritAdminApi';
import { PlanStatusBadge } from '../../components/approvals/PlanStatusBadge';
import { ApprovalActionsModal } from '../../components/approvals/ApprovalActionsModal';

export const ApprovalsInboxPage: React.FC = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<(ManagerPlan & { manager: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<(ManagerPlan & { manager: any }) | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      // For MVP, we'll assume the user role is handled by RLS, 
      // but admins might see more. We'll pass false for now to see assigned only.
      const data = await approvalsApi.listInboxPlans(false); 
      setPlans(data);
    } catch (err) {
      console.error('Error fetching inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleAction = async (reason: string) => {
    if (!selectedPlan || !modalMode) return;
    try {
      setProcessing(true);
      const action = modalMode === 'approve' ? 'approve_plan' : 'reject_plan';
      
      const res = await runMeritCycleAdmin({
        action,
        cycle_id: selectedPlan.cycle_id,
        plan_id: selectedPlan.id,
        note: reason // Using note field as reason
      });

      if (res.ok) {
        setModalMode(null);
        setSelectedPlan(null);
        await fetchInbox();
      } else {
        alert(res.error || 'Action failed');
      }
    } catch (err) {
      console.error('Action error:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between glass-card p-6 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl">
            <Inbox className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('approvals.approver_inbox')}</h1>
            <p className="text-slate-400 text-sm">Review recommendations and manage hierarchical governance.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-500 mr-2" />
            <input 
              type="text" 
              placeholder="Filter plans..." 
              className="bg-transparent border-none text-slate-200 text-sm focus:outline-none w-48"
            />
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid of Plans */}
      {plans.length === 0 ? (
        <div className="glass-card p-20 text-center space-y-4 rounded-2xl border-dashed border-2 border-slate-800">
          <CheckCircle2 className="w-16 h-16 text-slate-700 mx-auto" />
          <h3 className="text-xl font-semibold text-slate-400">{t('approvals.empty_inbox')}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div 
              key={plan.id} 
              className="glass-card flex flex-col group hover:border-indigo-500/50 transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-800/50 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Manager</span>
                  </div>
                  <h4 className="text-slate-100 font-semibold truncate max-w-[150px]">
                    {plan.manager?.email || 'Unknown Manager'}
                  </h4>
                </div>
                <PlanStatusBadge status={plan.status} isLocked={plan.is_locked} />
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                      {t('approvals.total_applied')}
                    </span>
                    <div className="text-lg font-bold text-white font-mono">
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(plan.total_applied_amount)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                      {t('approvals.team_members')}
                    </span>
                    <div className="text-lg font-bold text-white font-mono">
                      {plan.employee_count}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                    <span className="uppercase tracking-widest font-bold">Guidelines Alignment</span>
                    <span className="font-mono">94%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full w-[94%]" />
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="p-4 bg-slate-900/40 border-t border-slate-800/50 flex items-center justify-between gap-2">
                <button 
                  onClick={() => {
                    setSelectedPlan(plan);
                    setModalMode('reject');
                  }}
                  className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  {t('approvals.reject')}
                </button>
                <div className="w-px h-6 bg-slate-800" />
                <button 
                  onClick={() => {
                    setSelectedPlan(plan);
                    setModalMode('approve');
                  }}
                  className="flex-3 py-2 px-6 flex items-center justify-center gap-1.5 text-xs font-bold bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t('approvals.approve')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedPlan && modalMode && (
        <ApprovalActionsModal
          isOpen={!!selectedPlan && !!modalMode}
          onClose={() => {
            setSelectedPlan(null);
            setModalMode(null);
          }}
          onConfirm={handleAction}
          type={modalMode}
          planName={selectedPlan.manager?.email || 'Selected Plan'}
          isSubmitting={processing}
        />
      )}
    </div>
  );
};
