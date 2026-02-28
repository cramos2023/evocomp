import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface ApprovalActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  type: 'approve' | 'reject';
  planName: string;
  isSubmitting?: boolean;
}

export const ApprovalActionsModal: React.FC<ApprovalActionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  planName,
  isSubmitting = false
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const isReject = type === 'reject';
  const isValid = !isReject || reason.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className={`p-6 border-b border-slate-800 flex items-center gap-3 ${isReject ? 'bg-rose-500/5' : 'bg-emerald-500/5'}`}>
          {isReject ? (
            <XCircle className="w-6 h-6 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          )}
          <h3 className="text-xl font-semibold text-slate-100">
            {isReject ? t('approvals.reject') : t('approvals.approve')}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-400 text-sm">
            {isReject 
              ? t('approvals.provide_reason_title') 
              : t('approvals.plan_details')}
            : <span className="text-slate-200 font-medium ml-1">{planName}</span>
          </p>

          {isReject && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                {t('approvals.rejection_reason')}
              </label>
              <textarea
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all resize-none min-h-[120px]"
                placeholder={t('approvals.reject_placeholder')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {!isValid && (
                <div className="flex items-center gap-1.5 text-rose-400 text-[10px] uppercase font-bold mt-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('approvals.reject_placeholder')}
                </div>
              )}
            </div>
          )}

          {!isReject && (
            <p className="text-slate-400 text-sm italic">
              {/* Optional: Add confirmation text for approval */}
              {t('merit_admin.confirm_publish_desc')}
            </p>
          )}
        </div>

        <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!isValid || isSubmitting}
            className={`px-6 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-lg ${
              isReject 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' 
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? t('common.saving') : t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
