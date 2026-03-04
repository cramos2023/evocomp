import React, { useState, useMemo, useEffect } from 'react';
import { X, GitCompare, TrendingUp, Users, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export interface ScenarioRun {
  id: string;
  status: string;
  created_at: string;
  [key: string]: any;
}

interface EmployeeResult {
  id: string;
  employee_id: string;
  after_json?: any;
  salary_base_before?: number;
  salary_base_after?: number;
  [key: string]: any;
}

interface CompareRunsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId: string;
  runs: ScenarioRun[];
  activeRunId: string;
  currentResults: EmployeeResult[]; // Optimization: avoid refetching candidate if it's the active run
}

export function CompareRunsModal({ isOpen, onClose, scenarioId, runs, activeRunId, currentResults }: CompareRunsModalProps) {
  const [baselineId, setBaselineId] = useState<string>('');
  const [candidateId, setCandidateId] = useState<string>(activeRunId);
  
  const [baselineResults, setBaselineResults] = useState<EmployeeResult[]>([]);
  const [candidateResults, setCandidateResults] = useState<EmployeeResult[]>(currentResults);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);

  // Set initial baseline (e.g., first completed run that is not the candidate)
  useEffect(() => {
    if (isOpen && runs.length > 1) {
      const otherRun = runs.find(r => r.id !== candidateId);
      if (otherRun) setBaselineId(otherRun.id);
    }
  }, [isOpen, runs, candidateId]);

  const handleCompare = async () => {
    if (!baselineId || !candidateId) return;
    setIsLoading(true);
    setHasCompared(false);

    try {
      // Fetch Baseline
      let baselineData = baselineId === activeRunId ? currentResults : null;
      if (!baselineData) {
        const { data, error } = await supabase
          .from('scenario_employee_results')
          .select('*')
          .eq('run_id', baselineId);
        if (error) throw error;
        baselineData = data as any[];
      }

      // Fetch Candidate
      let candidateData = candidateId === activeRunId ? currentResults : null;
      if (!candidateData) {
        const { data, error } = await supabase
          .from('scenario_employee_results')
          .select('*')
          .eq('run_id', candidateId);
        if (error) throw error;
        candidateData = data as any[];
      }

      setBaselineResults(baselineData || []);
      setCandidateResults(candidateData || []);
      setHasCompared(true);
    } catch (err) {
      console.error('Compare failed:', err);
      alert('Failed to load comparison data');
    } finally {
      setIsLoading(false);
    }
  };

  // Process deltas
  const comparisonData = useMemo(() => {
    if (!hasCompared) return null;

    const baseMap = new Map<string, EmployeeResult>();
    baselineResults.forEach(r => baseMap.set(r.employee_id, r));

    let commonCount = 0;
    let totalBaseInc = 0;
    let totalCandInc = 0;

    const rows = candidateResults.map(cand => {
      const base = baseMap.get(cand.employee_id);
      if (!base) return null; // Only compare intersection

      commonCount++;

      // Helpers
      const getVal = (row: any, key: string) => row?.after_json?.[key] || 0;
      
      const bNewBase = getVal(base, 'calc_new_base_salary_local');
      const cNewBase = getVal(cand, 'calc_new_base_salary_local');
      const baseMerit = getVal(base, 'input_merit_pct');
      const candMerit = getVal(cand, 'input_merit_pct');

      // Use calc_total_increase_local, fallback to calc_merit_increase_amount_local
      const getInc = (row: any) => row?.after_json?.calc_total_increase_local ?? row?.after_json?.calc_merit_increase_amount_local ?? 0;
      const bInc = getInc(base);
      const cInc = getInc(cand);

      totalBaseInc += bInc;
      totalCandInc += cInc;

      const incDelta = cInc - bInc;

      return {
        empId: cand.employee_id,
        name: cand.after_json?.full_name || 'Unknown',
        bNewBase, cNewBase, deltaBase: cNewBase - bNewBase,
        baseMerit, candMerit, deltaMerit: candMerit - baseMerit,
        bInc, cInc, deltaInc: incDelta
      };
    }).filter(Boolean) as any[];

    // Sort by absolute delta increase descending, take top 50
    rows.sort((a, b) => Math.abs(b.deltaInc) - Math.abs(a.deltaInc));
    const topRows = rows.slice(0, 50);

    return {
      commonCount,
      totalCandInc,
      deltaInc: totalCandInc - totalBaseInc,
      topRows
    };
  }, [baselineResults, candidateResults, hasCompared]);

  if (!isOpen) return null;

  const formatDate = (d: string) => new Date(d).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Compare Runs</h2>
              <p className="text-sm text-slate-500">Analyze differences between two scenario runs</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2"><X className="w-5 h-5" /></button>
        </div>

        {/* Controls */}
        <div className="p-6 bg-white border-b border-slate-200 shrink-0 flex items-end gap-6">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Baseline Run</label>
            <select 
              value={baselineId} 
              onChange={e => setBaselineId(e.target.value)}
              className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>Select baseline...</option>
              {runs.map(r => (
                <option key={r.id} value={r.id}>
                  {r.status} — {formatDate(r.created_at)}
                </option>
              ))}
            </select>
          </div>
          <div className="pb-3 text-slate-300"><ArrowRight className="w-5 h-5" /></div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Candidate Run</label>
            <select 
              value={candidateId} 
              onChange={e => setCandidateId(e.target.value)}
              className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
              disabled // usually candidate is the selected active run, but we can let them change it if needed. For MVP, keep it enabled.
            >
               {runs.map(r => (
                <option key={r.id} value={r.id}>
                  {r.status} — {formatDate(r.created_at)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCompare}
            disabled={isLoading || !baselineId || !candidateId || baselineId === candidateId}
            className="h-11 px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
          >
            {isLoading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/> : <GitCompare className="w-4 h-4" />}
            Compare
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          {!hasCompared && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <GitCompare className="w-16 h-16 mb-4 opacity-20" />
              <p>Select two different runs and click Compare</p>
            </div>
          )}

          {hasCompared && comparisonData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2 text-slate-500">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Employees Compared</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{comparisonData.commonCount}</div>
                </div>
                
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2 text-slate-500">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Candidate Total Inc.</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    ${comparisonData.totalCandInc.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2 text-slate-500">
                    <GitCompare className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Delta vs Baseline</span>
                  </div>
                  <div className={`text-2xl font-bold ${comparisonData.deltaInc > 0 ? 'text-rose-600' : comparisonData.deltaInc < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {comparisonData.deltaInc > 0 ? '+' : ''}${comparisonData.deltaInc.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              {/* Top Deltas Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900">Top 50 Variances (by Total Increase)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 font-bold tracking-wider">Employee</th>
                        <th className="px-6 py-3 font-bold tracking-wider text-right">Merit % Delta</th>
                        <th className="px-6 py-3 font-bold tracking-wider text-right">New Base Delta</th>
                        <th className="px-6 py-3 font-bold tracking-wider text-right">Increase Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparisonData.topRows.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-8 text-slate-400">No differences found.</td></tr>
                      ) : (
                        comparisonData.topRows.map((r, i) => (
                          <tr key={r.empId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3">
                              <div className="font-bold text-slate-900">{r.name}</div>
                              <div className="text-xs text-slate-500 font-mono">{r.empId}</div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="text-slate-900">Cand: {(r.candMerit * 100).toFixed(1)}%</div>
                              <div className={`text-xs font-bold ${r.deltaMerit !== 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                Δ {(r.deltaMerit * 100).toFixed(1)}%
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="text-slate-900">${r.cNewBase.toLocaleString()}</div>
                              <div className={`text-xs font-bold ${r.deltaBase !== 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                Δ ${r.deltaBase.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="font-bold text-slate-900">${r.cInc.toLocaleString()}</div>
                              <div className={`text-xs font-bold ${r.deltaInc > 0 ? 'text-rose-600' : r.deltaInc < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {r.deltaInc > 0 ? '+' : ''}${r.deltaInc.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
