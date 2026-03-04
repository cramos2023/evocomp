import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, DollarSign, BarChart3, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

const FLAG_COLORS: Record<string, string> = {
  MISSING_BAND: 'bg-red-100 text-red-700 border-red-200', INVALID_RATING: 'bg-orange-100 text-orange-700 border-orange-200',
  INVALID_HOURS: 'bg-yellow-100 text-yellow-700 border-yellow-200', MISSING_BASIS_FIELD: 'bg-purple-100 text-purple-700 border-purple-200',
  BELOW_BAND_MIN: 'bg-blue-100 text-blue-700 border-blue-200', ABOVE_BAND_MAX: 'bg-pink-100 text-pink-700 border-pink-200',
  MISSING_VARIABLE_TARGET: 'bg-amber-100 text-amber-700 border-amber-200', MISSING_FX_RATE: 'bg-red-100 text-red-700 border-red-200',
  MISSING_GUIDELINE_CELL: 'bg-purple-100 text-purple-700 border-purple-200', INELIGIBLE_STATUS: 'bg-gray-100 text-gray-700 border-gray-200',
  BELOW_MIN: 'bg-sky-100 text-sky-700 border-sky-200', MIXED_BASIS: 'bg-teal-100 text-teal-700 border-teal-200',
};
const ZONE_COLORS: Record<string, string> = {
  BELOW_MIN: 'bg-sky-100 text-sky-700', BELOW_MID: 'bg-blue-100 text-blue-700', ABOVE_MID: 'bg-indigo-100 text-indigo-700', ABOVE_MAX: 'bg-slate-100 text-slate-600',
};

const fmt    = (n: number | null, d = 2)  => n != null ? n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const fmtPct = (n: number | null)         => n != null ? `${(n * 100).toFixed(2)}%` : '—';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const MeritResultsPage: React.FC = () => {
  const { t }  = useTranslation();
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();

  const [scenario, setScenario]   = useState<any>(null);
  const [runs, setRuns]           = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [results, setResults]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [running, setRunning]     = useState(false);
  const [runError, setRunError]   = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = useCallback(async () => {
    if (!scenarioId) return;
    setLoading(true);
    try {
      const { data: scen } = await supabase.from('scenarios').select('*, snapshot:snapshots(name, snapshot_date)').eq('id', scenarioId).single();
      setScenario(scen);
      const { data: runData } = await supabase.from('scenario_runs').select('*').eq('scenario_id', scenarioId).order('run_number', { ascending: false });
      setRuns(runData || []);
      const latest = runData?.[0] ?? null;
      setSelectedRun(latest);
      if (latest?.id) {
        const { data: resData } = await supabase.from('scenario_employee_results').select('*').eq('scenario_run_id', latest.id).order('employee_external_id', { ascending: true, nullsFirst: false });
        setResults(resData || []);
      } else { setResults([]); }
    } finally { setLoading(false); }
  }, [scenarioId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset page when results change
  useEffect(() => { setCurrentPage(1); }, [results, pageSize]);

  async function handleRun() {
    if (!scenarioId) return;
    setRunning(true); setRunError('');
    try {
      const { data, error } = await supabase.functions.invoke('scenario-engine-v30-bundled', { 
        body: { scenarioId, action: 'run' }
      });
      
      if (error) {
        try {
          const body = await error.context.json();
          const msg = body.error || error.message;
          setRunError(`${msg}${body.hint ? ` - ${body.hint}` : ''}`);
        } catch {
          setRunError(error.message || 'Run failed');
        }
        return;
      }
      
      if (data?.error) throw new Error(data.error);
      await loadData();
    } catch (err: any) { 
      setRunError(err.message || 'Run failed'); 
    } finally { 
      setRunning(false); 
    }
  }

  async function switchRun(run: any) {
    setSelectedRun(run);
    const { data } = await supabase.from('scenario_employee_results').select('*').eq('scenario_run_id', run.id).order('employee_external_id', { ascending: true, nullsFirst: false });
    setResults(data || []);
  }

  if (loading) return <div className="p-8 space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>;

  const rules = scenario?.rules_json ?? {};
  const qr    = selectedRun?.quality_report ?? selectedRun?.quality_report_json ?? {};

  // Pagination calculations
  const totalResults = results.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalResults);
  const paginatedResults = results.slice(startIdx, endIdx);

  return (
    <div className="flex flex-col min-h-screen max-h-screen" data-testid="merit-results-page">
      {/* ═══ FIXED TOP SECTION ═══ */}
      <div className="flex-shrink-0 bg-[rgb(var(--surface-main))] border-b border-[rgb(var(--border))] shadow-sm px-6 py-4 space-y-4">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-4 flex-wrap max-w-7xl mx-auto w-full">
          <div>
            <button data-testid="back-to-scenarios-btn" onClick={() => navigate('/app/comp/scenarios')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" />{t('merit.back_to_scenarios')}
            </button>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{scenario?.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-bold">
              <span className="bg-slate-100 px-2 py-0.5 rounded-lg">{t('merit.snapshot')}: {scenario?.snapshot?.name}</span>
              <span className="text-slate-300">•</span>
              <span className="uppercase tracking-widest text-blue-600">{rules.comp_basis?.replace(/_/g, ' ')}</span>
              <span className="text-slate-300">•</span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">{t('merit.budget_pct_label')}: {fmtPct(rules.approved_budget_pct)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {runs.length > 0 && (
              <select data-testid="run-selector" value={selectedRun?.id ?? ''} onChange={e => { const r = runs.find(x => x.id === e.target.value); if (r) switchRun(r); }} className="border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-black uppercase tracking-tight shadow-sm cursor-pointer hover:border-slate-300 transition-colors">
              {runs.map(r => <option key={r.id} value={r.id}>{t('merit.run_number')} #{r.run_number} — {r.engine_mode === 'EXECUTION_RUN' ? '✦ EXEC' : '◇ GUIDE'} — {new Date(r.created_at).toLocaleString()} ({r.status})</option>)}
              </select>
            )}
            <button data-testid="run-scenario-btn" onClick={handleRun} disabled={running} className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 hover:bg-slate-700 disabled:opacity-60 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-slate-600/20 active:scale-95">
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? t('merit.running') : t('merit.generate_guidelines', { defaultValue: 'Generate Guidelines' })}
            </button>
            <button data-testid="open-workbench-btn" onClick={() => navigate(`/app/comp/scenarios/${scenarioId}/execute`)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
              <BarChart3 className="w-4 h-4" />
              {t('merit.open_workbench', { defaultValue: 'Open Workbench' })}
            </button>
          </div>
        </div>

        {/* Budget Cards */}
        {selectedRun && (
          <div data-testid="budget-panel" className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-7xl mx-auto w-full">
            {[
              { label: t('merit.baseline_total'),   value: fmt(selectedRun.baseline_total),           icon: DollarSign, color: 'text-slate-600' },
              { label: t('merit.approved_budget'),  value: fmt(selectedRun.approved_budget_amount),   icon: TrendingUp,  color: 'text-blue-600' },
              { label: t('merit.applied_total'),    value: fmt(selectedRun.total_applied_amount),     icon: BarChart3,   color: 'text-indigo-600' },
              { label: t('merit.remaining_budget'), value: fmt(selectedRun.remaining_budget_amount),  icon: Info,        color: 'text-slate-500' },
              { label: t('merit.budget_status'),    value: selectedRun.budget_status === 'WITHIN' ? t('merit.budget_status_within') : selectedRun.budget_status === 'OVER' ? t('merit.budget_status_over') : '—', icon: CheckCircle, color: selectedRun.budget_status === 'WITHIN' ? 'text-green-600' : 'text-red-600' },
            ].map((card, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{card.label}</p>
                  <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                </div>
                <p className={`text-base font-black ${card.color} tracking-tight`}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quality Report */}
        {selectedRun && qr.total_employees > 0 && (
          <div data-testid="quality-report-panel" className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-inner max-w-7xl mx-auto w-full">
            <div className="flex flex-wrap gap-4 items-center">
              {[
                { key: 'total_employees', label: t('merit.qr_total'), warn: false },
                { key: 'missing_band', label: t('merit.qr_missing_band'), warn: true },
                { key: 'invalid_rating', label: t('merit.qr_invalid_rating'), warn: true },
                { key: 'invalid_hours', label: t('merit.qr_invalid_hours'), warn: true },
                { key: 'missing_basis_field', label: t('merit.qr_missing_basis'), warn: true },
                { key: 'missing_variable_target', label: t('merit.qr_missing_variable', { defaultValue: 'Missing Variable' }), warn: true },
                { key: 'missing_fx', label: t('merit.qr_missing_fx', { defaultValue: 'Missing FX' }), warn: true },
              ].map(item => {
                const val = qr[item.key] ?? 0;
                const isWarn = item.warn && val > 0;
                return (
                  <div key={item.key} className="flex items-center gap-2 border-r border-slate-200 pr-4 last:border-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                    <p className={`text-xs font-black ${isWarn ? 'text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded' : 'text-slate-900'}`}>{val}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {runError && (
          <div data-testid="run-error-msg" className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 max-w-7xl mx-auto w-full">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{runError}
          </div>
        )}
      </div>

      {/* ═══ SCROLLABLE TABLE SECTION ═══ */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {runs.length === 0 && (
            <div data-testid="no-runs-panel" className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">{t('merit.no_runs_title')}</h3>
              <p className="text-slate-500 text-sm mb-6">{t('merit.no_runs_subtitle')}</p>
              <button data-testid="run-scenario-empty-btn" onClick={handleRun} disabled={running} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors">
                {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {running ? t('merit.running') : t('merit.generate_guidelines', { defaultValue: 'Generate Guidelines' })}
              </button>
            </div>
          )}

          {selectedRun && (
            <div data-testid="results-table" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Table Title Bar */}
              <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-[10px]">{t('merit.results_by_employee')}</h3>
                  {selectedRun?.engine_mode && (
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      selectedRun.engine_mode === 'EXECUTION_RUN' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedRun.engine_mode === 'EXECUTION_RUN' ? t('merit.mode_execution', { defaultValue: 'Execution' }) : t('merit.mode_guidelines', { defaultValue: 'Guidelines' })}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-black text-slate-400 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">{totalResults} {t('merit.employees')}</span>
              </div>
              
              {results.length === 0 ? (
                <div className="p-12 text-center text-slate-400"><p className="text-sm">{t('merit.no_results_in_run')}</p></div>
              ) : (
                <>
                  {/* Table with sticky thead */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="bg-slate-50/95 backdrop-blur-md sticky top-0 z-10">
                        <tr>
                          {[
                            t('merit.col_employee_id'), t('merit.col_rating'), t('merit.col_grade'), 
                            t('merit.col_basis_amount'), t('merit.col_band_mid'), t('merit.col_compa_ratio'), t('merit.col_zone'), 
                            t('merit.col_guideline_pct'),
                            ...(selectedRun?.engine_mode === 'EXECUTION_RUN' ? [
                              t('merit.col_requested_pct', { defaultValue: 'Requested %' }),
                              t('merit.col_gross_increase', { defaultValue: 'Gross' }),
                              t('merit.col_consolidated', { defaultValue: 'Consolidated' }),
                              t('merit.col_lump_sum', { defaultValue: 'Lump Sum' }),
                              t('merit.col_budget_spend', { defaultValue: 'Budget Spend' }),
                              t('merit.col_compa_after', { defaultValue: 'Compa After' }),
                            ] : [
                              t('merit.col_increase'), t('merit.col_new_amount'),
                            ]),
                            t('merit.col_flags')
                          ].map((col) => (
                            <th key={col} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200 whitespace-nowrap bg-slate-50">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {paginatedResults.map(r => {
                          const flags: string[] = r.flags_json || [];
                          const hasIssue = flags.some(f => ['MISSING_BAND','INVALID_RATING','INVALID_HOURS','MISSING_BASIS_FIELD','MISSING_FX_RATE'].includes(f));
                          const isExec = selectedRun?.engine_mode === 'EXECUTION_RUN';
                          return (
                            <tr key={r.id} data-testid={`result-row-${r.employee_external_id || r.employee_id}`} className={`hover:bg-slate-50/80 transition-colors ${hasIssue ? 'bg-amber-50/20' : ''}`}>
                              <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{r.employee_external_id || r.before_json?.employee_external_id || r.employee_id?.slice(0,8)}</td>
                              <td className="px-4 py-3 text-xs font-black text-slate-900 border-l border-transparent">{r.before_json?.performance_rating || '—'}</td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-500">{r.before_json?.pay_grade_internal || '—'}</td>
                              <td className="px-4 py-3 text-xs text-right font-black text-slate-900 whitespace-nowrap">{fmt(r.salary_basis_amount)}</td>
                              <td className="px-4 py-3 text-[11px] text-right text-slate-400 whitespace-nowrap">{r.band_mid ? fmt(r.band_mid) : <span className="text-red-400">—</span>}</td>
                              <td className="px-4 py-3 text-xs text-center font-bold text-slate-700">{(r.compa_before ?? r.compa_ratio) ? (r.compa_before ?? r.compa_ratio)?.toFixed(3) : '—'}</td>
                              <td className="px-4 py-3 text-xs">{r.compa_zone ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter ${ZONE_COLORS[r.compa_zone] ?? 'bg-slate-100 text-slate-500'}`}>{r.compa_zone}</span> : '—'}</td>
                              <td className="px-4 py-3 text-xs text-center font-black text-blue-700">{r.guideline_max_pct != null ? fmtPct(r.guideline_max_pct) : r.guideline_pct != null ? fmtPct(r.guideline_pct) : '—'}</td>
                              {isExec ? (
                                <>
                                  <td className="px-4 py-3 text-xs text-center font-black text-indigo-700">{r.requested_merit_pct != null ? fmtPct(r.requested_merit_pct) : '—'}</td>
                                  <td className="px-4 py-3 text-xs text-right font-bold text-green-700 whitespace-nowrap">{r.gross_increase_amount != null ? `+${fmt(r.gross_increase_amount)}` : '—'}</td>
                                  <td className="px-4 py-3 text-xs text-right text-slate-700 whitespace-nowrap">{fmt(r.consolidated_amount)}</td>
                                  <td className="px-4 py-3 text-xs text-right whitespace-nowrap">{r.lump_sum_amount > 0 ? <span className="text-amber-600 font-bold">{fmt(r.lump_sum_amount)}</span> : <span className="text-slate-300">0</span>}</td>
                                  <td className="px-4 py-3 text-xs text-right font-bold text-slate-900 whitespace-nowrap">{fmt(r.budget_spend)}</td>
                                  <td className="px-4 py-3 text-xs text-center font-bold text-slate-700">{r.compa_after?.toFixed(3) ?? '—'}</td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-3 text-xs text-right font-black text-green-700 whitespace-nowrap">{r.increase_amount != null ? `+${fmt(r.increase_amount)}` : '—'}</td>
                                  <td className="px-4 py-3 text-xs text-right font-black text-slate-900 whitespace-nowrap">{r.new_amount != null ? fmt(r.new_amount) : '—'}</td>
                                </>
                              )}
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1 min-w-[80px]">
                                  {flags.length === 0 ? <span className="text-[10px] text-slate-200">—</span> : flags.map(f => (
                                    <span key={f} data-testid={`flag-${f}`} className={`px-1.5 py-0.5 rounded text-[8px] font-black border tracking-tighter uppercase ${FLAG_COLORS[f] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>{f}</span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* ═══ PAGINATION BAR ═══ */}
                  <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
                    {/* Showing X–Y of Z */}
                    <p className="text-[11px] text-slate-500 font-medium">
                      {t('merit.page_showing')} <span className="font-black text-slate-700">{startIdx + 1}–{endIdx}</span> {t('merit.page_of')} <span className="font-black text-slate-700">{totalResults}</span>
                    </p>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-2">
                      {/* Rows per page */}
                      <div className="flex items-center gap-1.5 mr-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('merit.page_rows_per_page')}</span>
                        <select
                          value={pageSize}
                          onChange={e => setPageSize(Number(e.target.value))}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-bold cursor-pointer"
                        >
                          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>

                      {/* Prev button */}
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={safeCurrentPage <= 1}
                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />{t('merit.page_prev')}
                      </button>

                      {/* Page indicator */}
                      <span className="text-[11px] font-black text-slate-700 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                        {safeCurrentPage} / {totalPages}
                      </span>

                      {/* Next button */}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={safeCurrentPage >= totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        {t('merit.page_next')}<ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeritResultsPage;
