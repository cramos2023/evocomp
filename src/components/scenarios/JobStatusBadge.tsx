import React, { useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Clock, X } from 'lucide-react';

export interface FormulaJob {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  total_rows: number | null;
  processed_rows: number;
  attempt_count: number;
  error_message?: string | null;
  error_details?: {
    warning_count?: number;
    row_error_count?: number;
    sample_errors?: { row_id: string; col_key: string; message: string }[];
  } | null;
  started_at?: string | null;
  finished_at?: string | null;
}

interface JobStatusBadgeProps {
  job: FormulaJob | null;
  onDismiss: () => void;
}

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ job, onDismiss }) => {
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const warningCount = job?.error_details?.warning_count ?? 0;
  const hasWarnings = warningCount > 0;

  // Auto-hide ONLY on clean success (no warnings)
  useEffect(() => {
    if (job?.status === 'succeeded' && !hasWarnings) {
      autoHideTimer.current = setTimeout(onDismiss, 5000);
    }
    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  }, [job?.status, hasWarnings, onDismiss]);

  if (!job) return null;

  const isPending = job.status === 'queued' || job.status === 'running';
  const isSucceeded = job.status === 'succeeded';
  const isFailed = job.status === 'failed';
  const isSucceededWithWarnings = isSucceeded && hasWarnings;

  const progressPct = job.total_rows && job.total_rows > 0
    ? Math.round((job.processed_rows / job.total_rows) * 100)
    : null;

  const containerClass = `
    rounded-xl border px-4 py-3 flex items-start gap-3 text-sm transition-all
    ${isFailed ? 'bg-red-50 border-red-200 text-red-800'
      : isSucceededWithWarnings ? 'bg-amber-50 border-amber-200 text-amber-900'
      : isSucceeded ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-blue-50 border-blue-200 text-blue-800'}
  `.trim();

  const Icon = isFailed ? AlertTriangle
    : isSucceededWithWarnings ? AlertTriangle
    : isSucceeded ? CheckCircle
    : job.status === 'queued' ? Clock
    : Loader2;

  const iconClass = `w-5 h-5 shrink-0 ${
    isFailed ? 'text-red-500'
      : isSucceededWithWarnings ? 'text-amber-500'
      : isSucceeded ? 'text-green-500'
      : 'text-blue-500'
  } ${isPending && job.status === 'running' ? 'animate-spin' : ''}`;

  const label = isFailed ? 'Calculation Failed'
    : isSucceededWithWarnings ? `Succeeded with ${warningCount} warning${warningCount !== 1 ? 's' : ''}`
    : isSucceeded ? 'Calculation Complete'
    : job.status === 'queued' ? 'Queued...'
    : `Running... ${progressPct !== null ? `${progressPct}%` : ''}`;

  return (
    <div className={containerClass} role="status">
      <Icon className={iconClass} />
      <div className="flex-1 min-w-0">
        <p className="font-bold">{label}</p>
        {isPending && job.total_rows && (
          <div className="mt-1.5">
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct ?? 0}%` }}
              />
            </div>
            <p className="text-[10px] mt-0.5 text-blue-600 font-mono">{job.processed_rows}/{job.total_rows} rows</p>
          </div>
        )}
        {isFailed && job.error_message && (
          <p className="text-[11px] mt-0.5 text-red-600 font-mono truncate">{job.error_message}</p>
        )}
        {isSucceededWithWarnings && job.error_details?.sample_errors && job.error_details.sample_errors.length > 0 && (
          <ul className="mt-1 text-[11px] space-y-0.5 text-amber-800">
            {job.error_details.sample_errors.slice(0, 3).map((e, i) => (
              <li key={i} className="font-mono truncate">
                [{e.col_key}] {e.message}
              </li>
            ))}
            {job.error_details.sample_errors.length > 3 && (
              <li>…and {job.error_details.sample_errors.length - 3} more</li>
            )}
          </ul>
        )}
      </div>
      {/* Always show dismiss on failures & warnings; succeed shows auto-hide */}
      {(isFailed || isSucceededWithWarnings) && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 hover:bg-black/10 rounded transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
