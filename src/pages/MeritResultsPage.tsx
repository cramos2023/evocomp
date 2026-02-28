import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, DollarSign, BarChart3, Info } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

const FLAG_COLORS: Record<string, string> = {
  MISSING_BAND: 'bg-red-100 text-red-700 border-red-200', INVALID_RATING: 'bg-orange-100 text-orange-700 border-orange-200',
  INVALID_HOURS: 'bg-yellow-100 text-yellow-700 border-yellow-200', MISSING_BASIS_FIELD: 'bg-purple-100 text-purple-700 border-purple-200',
  BELOW_BAND_MIN: 'bg-blue-100 text-blue-700 border-blue-200', ABOVE_BAND_MAX: 'bg-pink-100 text-pink-700 border-pink-200',
};
const ZONE_COLORS: Record<string, string> = {
  BELOW_MIN: 'bg-sky-100 text-sky-700', BELOW_MID: 'bg-blue-100 text-blue-700', ABOVE_MID: 'bg-indigo-100 text-indigo-700', ABOVE_MAX: 'bg-slate-100 text-slate-600',
};

const fmt    = (n: number | null, d = 2)  => n != null ? n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const fmtPct = (n: number | null)         => n != null ? `${(n * 100).toFixed(2)}%` : '—';

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

  async function handleRun() {
    if (!scenarioId) return;
    setRunning(true); setRunError('');
    try {
      const { data, error } = await supabase.functions.invoke('scenario-engine', { 
        body: { scenarioId, action: 'run' }
      });
      
      if (error) {
        // Try to parse detailed error if body is JSON
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
  const qr    = selectedRun?.quality_report_json ?? {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="merit-results-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button data-testid="back-to-scenarios-btn" onClick={() => navigate('/app/comp/scenarios')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />{t('merit.back_to_scenarios')}
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{scenario?.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span>{t('merit.snapshot')}: {scenario?.snapshot?.name}</span>
            <span>•</span>
            <span>{rules.comp_basis?.replace(/_/g, ' ')}</span>
            <span>•</span>
            <span>{t('merit.budget_pct_label')}: {fmtPct(rules.approved_budget_pct)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {runs.length > 0 && (
            <select data-testid="run-selector" value={selectedRun?.id ?? ''} onChange={e => { const r = runs.find(x => x.id === e.target.value); if (r) switchRun(r); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
              {runs.map(r => <option key={r.id} value={r.id}>{t('merit.run_number')} #{r.run_number} — {new Date(r.created_at).toLocaleString()} ({r.status})</option>)}
            </select>
          )}
          <button data-testid="run-scenario-btn" onClick={handleRun} disabled={running} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors shadow-sm shadow-blue-600/20">
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? t('merit.running') : t('merit.run_scenario')}
          </button>
        </div>
      </div>

      {runError && (
        <div data-testid="run-error-msg" className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />{runError}
        </div>
      )}

      {runs.length === 0 && (
        <div data-testid="no-runs-panel" className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">{t('merit.no_runs_title')}</h3>
          <p className="text-slate-500 text-sm mb-6">{t('merit.no_runs_subtitle')}</p>
          <button data-testid="run-scenario-empty-btn" onClick={handleRun} disabled={running} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors">
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? t('merit.running') : t('merit.run_scenario')}
          </button>
        </div>
      )}

      {selectedRun && (
        <>
          <div data-testid="budget-panel" className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: t('merit.baseline_total'),   value: fmt(selectedRun.baseline_total),           icon: DollarSign, color: 'text-slate-600' },
              { label: t('merit.approved_budget'),  value: fmt(selectedRun.approved_budget_amount),   icon: TrendingUp,  color: 'text-blue-600' },
              { label: t('merit.applied_total'),    value: fmt(selectedRun.total_applied_amount),     icon: BarChart3,   color: 'text-indigo-600' },
              { label: t('merit.remaining_budget'), value: fmt(selectedRun.remaining_budget_amount),  icon: Info,        color: 'text-slate-500' },
              { label: t('merit.budget_status'),    value: selectedRun.budget_status === 'WITHIN' ? t('merit.budget_status_within') : selectedRun.budget_status === 'OVER' ? t('merit.budget_status_over') : '—', icon: CheckCircle, color: selectedRun.budget_status === 'WITHIN' ? 'text-green-600' : 'text-red-600' },
            ].map((card, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {qr.total_employees > 0 && (
            <div data-testid="quality-report-panel" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" />{t('merit.quality_report')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'total_employees', label: t('merit.qr_total'), warn: false },
                  { key: 'missing_band', label: t('merit.qr_missing_band'), warn: true },
                  { key: 'invalid_rating', label: t('merit.qr_invalid_rating'), warn: true },
                  { key: 'invalid_hours', label: t('merit.qr_invalid_hours'), warn: true },
                  { key: 'missing_basis_field', label: t('merit.qr_missing_basis'), warn: true },
                  { key: 'below_band_min', label: t('merit.qr_below_min'), warn: false },
                  { key: 'above_band_max', label: t('merit.qr_above_max'), warn: false },
                ].map(item => {
                  const val = qr[item.key] ?? 0;
                  const isWarn = item.warn && val > 0;
                  return (
                    <div key={item.key} className={`p-3 rounded-xl border ${isWarn ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                      <p className={`text-xl font-bold ${isWarn ? 'text-amber-700' : 'text-slate-900'}`}>{val}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div data-testid="results-table" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">{t('merit.results_by_employee')}</h3>
              <span className="text-sm text-slate-500">{results.length} {t('merit.employees')}</span>
            </div>
            {results.length === 0 ? (
              <div className="p-12 text-center text-slate-400"><p className="text-sm">{t('merit.no_results_in_run')}</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {[t('merit.col_employee_id'), t('merit.col_rating'), t('merit.col_grade'), t('merit.col_basis_amount'), t('merit.col_band_mid'), t('merit.col_compa_ratio'), t('merit.col_zone'), t('merit.col_guideline_pct'), t('merit.col_applied_pct'), t('merit.col_increase'), t('merit.col_new_amount'), t('merit.col_flags')].map(col => (
                        <th key={col} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map(r => {
                      const flags: string[] = r.flags_json || [];
                      const hasIssue = flags.some(f => ['MISSING_BAND','INVALID_RATING','INVALID_HOURS','MISSING_BASIS_FIELD'].includes(f));
                      return (
                        <tr key={r.id} data-testid={`result-row-${r.employee_external_id || r.employee_id}`} className={`hover:bg-slate-50 transition-colors ${hasIssue ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-4 py-3 text-sm font-mono text-slate-700 whitespace-nowrap">{r.employee_external_id || r.before_json?.employee_external_id || r.employee_id?.slice(0,8)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">{r.before_json?.performance_rating || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{r.before_json?.pay_grade_internal || '—'}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-slate-900 whitespace-nowrap">{fmt(r.salary_basis_amount)}</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-500 whitespace-nowrap">{r.band_mid ? fmt(r.band_mid) : <span className="text-red-400">—</span>}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-700">{r.compa_ratio ? r.compa_ratio.toFixed(3) : '—'}</td>
                          <td className="px-4 py-3 text-sm">{r.compa_zone ? <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${ZONE_COLORS[r.compa_zone] ?? 'bg-slate-100 text-slate-500'}`}>{r.compa_zone}</span> : '—'}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-blue-700">{r.guideline_pct != null ? fmtPct(r.guideline_pct) : '—'}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-indigo-700">{r.applied_pct != null ? fmtPct(r.applied_pct) : '—'}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-green-700 whitespace-nowrap">+{fmt(r.increase_amount)}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-slate-900 whitespace-nowrap">{fmt(r.new_amount)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 min-w-[80px]">
                              {flags.length === 0 ? <span className="text-[10px] text-slate-300">—</span> : flags.map(f => (
                                <span key={f} data-testid={`flag-${f}`} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${FLAG_COLORS[f] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>{f}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MeritResultsPage;
