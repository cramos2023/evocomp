import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, ShieldCheck, Clock, FileEdit, Send, XCircle, CheckCircle2 } from 'lucide-react';

interface PlanStatusBadgeProps {
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'locked';
  isLocked: boolean;
  className?: string;
}

export const PlanStatusBadge: React.FC<PlanStatusBadgeProps> = ({ status, isLocked, className = '' }) => {
  const { t } = useTranslation();

  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          icon: <FileEdit className="w-3.5 h-3.5" />,
          color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          label: t('plan_status.draft')
        };
      case 'submitted':
        return {
          icon: <Send className="w-3.5 h-3.5" />,
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          label: t('plan_status.submitted')
        };
      case 'in_review':
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          label: t('plan_status.in_review')
        };
      case 'approved':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          label: t('plan_status.approved')
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-3.5 h-3.5" />,
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          label: t('plan_status.rejected')
        };
      case 'locked':
        return {
          icon: <Lock className="w-3.5 h-3.5" />,
          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          label: t('plan_status.locked')
        };
      default:
        return {
          icon: <FileEdit className="w-3.5 h-3.5" />,
          color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          label: status
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
      {isLocked && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
          <ShieldCheck className="w-3 h-3" />
          {t('plan_status.is_locked')}
        </span>
      )}
    </div>
  );
};
