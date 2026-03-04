import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, RefreshCw, ChevronDown, ChevronRight, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface SampleError {
  row_id: string;
  col_key: string;
  message: string;
}

interface ErrorDetails {
  warning_count?: number;
  row_error_count?: number;
  sample_errors?: SampleError[];
}

interface JobRow {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  started_at: string | null;
  finished_at: string | null;
  processed_rows: number;
  total_rows: number | null;
  attempt_count: number;
  error_message: string | null;
  error_details: ErrorDetails | null;
  created_at: string;
}

interface JobHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  scenarioRunId: string;
}

const statusConfig: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  queued: { bg: 'bg-slate-100', text: 'text-slate-600', icon: Clock },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Loader2 },
  succeeded: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  failed: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
  cancelled: { bg: 'bg-slate-200', text: 'text-slate-500', icon: X },
};

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const ms = e - s;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const JobHistoryModal: React.FC<JobHistoryModalProps> = ({
  isOpen, onClose, datasetId, scenarioRunId
}) => {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) fetchJobs();
  }, [isOpen]);

  async function fetchJobs() {
    setLoading(true);
    const { data } = await supabase
      .from('formula_jobs')
      .select('id, status, started_at, finished_at, processed_rows, total_rows, attempt_count, error_message, error_details, created_at')
      .eq('dataset_id', datasetId)
      .eq('scenario_run_id', scenarioRunId)
      .order('created_at', { ascending: false })
      .limit(20);
    setJobs((data || []) as JobRow[]);
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Job History</h2>
          <div className="flex items-center gap-2">
            <button onClick={fetchJobs} className="p-2 hover:bg-slate-200 rounded-lg transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-500">No jobs yet</p>
              <p className="text-sm">Run a calculation to see job history here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jobs.map(job => {
                const cfg = statusConfig[job.status] || statusConfig.queued;
                const Icon = cfg.icon;
                const isExpanded = expandedId === job.id;
                const warnCount = job.error_details?.warning_count ?? 0;
                const rowErrCount = job.error_details?.row_error_count ?? 0;
                const samples = job.error_details?.sample_errors ?? [];

                return (
                  <div key={job.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors text-left"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${cfg.bg} ${cfg.text}`}>
                        <Icon className={`w-3 h-3 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                        {job.status}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-mono truncate">
                          {new Date(job.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right text-[11px] space-y-0.5 shrink-0">
                        <p className="text-slate-500">{job.processed_rows}/{job.total_rows ?? '?'} rows</p>
                        <p className="text-slate-400">{formatDuration(job.started_at, job.finished_at)}</p>
                      </div>

                      {warnCount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold shrink-0">
                          {warnCount} warn{warnCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-4 pt-1 ml-8 space-y-3">
                        <div className="grid grid-cols-3 gap-4 text-[11px]">
                          <div>
                            <p className="text-slate-400 uppercase font-bold">Attempt</p>
                            <p className="text-slate-700">{job.attempt_count}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 uppercase font-bold">Warnings</p>
                            <p className="text-slate-700">{warnCount}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 uppercase font-bold">Row Errors</p>
                            <p className="text-slate-700">{rowErrCount}</p>
                          </div>
                        </div>

                        {job.error_message && (
                          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] font-mono">
                            {job.error_message}
                          </div>
                        )}

                        {samples.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Sample Errors (max 5)</p>
                            {samples.map((s, i) => (
                              <div key={i} className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-[11px] font-mono text-amber-900 flex items-start gap-2">
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                <span>[{s.col_key}] {s.message}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] text-slate-300 font-mono">Job ID: {job.id}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-400">
          Showing last {jobs.length} jobs
        </div>
      </div>
    </div>
  );
};
