import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Target, 
  Activity,
  ArrowRight,
  Plus,
  Save,
  Play,
  History,
  Info
} from 'lucide-react';
import { simulationService } from '../services/simulationService';
import { SimulationState } from '../types/comp';
import { supabase } from '@/lib/supabaseClient';

interface SimulationWorkbenchProps {
  scenarioId: string;
}

export const SimulationWorkbench: React.FC<SimulationWorkbenchProps> = ({ scenarioId }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [scenario, setScenario] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScenario();
  }, [scenarioId]);

  const loadScenario = async () => {
    setLoading(true);
    try {
      const { data, error: sErr } = await supabase
        .from('simulation_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single();
      
      if (sErr) throw sErr;
      setScenario(data);

      const { data: out } = await supabase
        .from('simulation_outputs')
        .select('*')
        .eq('scenario_id', scenarioId)
        .maybeSingle();
      
      if (out) setResults(out);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    setExecuting(true);
    try {
      const { summary } = await simulationService.runSimulation(scenarioId);
      await loadScenario(); // Reload to get persisted output
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) return <div className="p-8 animate-pulse text-slate-500">Loading workbench...</div>;

  const summary = results?.summary_json || {};

  return (
    <div className="flex flex-col h-full bg-[rgb(var(--surface-main))]">
      {/* Workbench Header */}
      <header className="px-8 py-6 border-b border-[rgb(var(--border-main))] bg-white dark:bg-slate-900 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {scenario?.name}
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-3 h-3" />
            {scenario?.scenario_type} Simulation • {scenario?.status}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={loadScenario}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <History className="w-5 h-5" />
          </button>
          <button 
            onClick={handleRun}
            disabled={executing}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            {executing ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            Run Simulation
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Executive Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SummaryCard 
            label="Total Payroll Impact" 
            value={`$${(summary.totalPayrollImpact || 0).toLocaleString()}`} 
            icon={<TrendingUp className="w-5 h-5" />} 
            trend={summary.totalPayrollImpact > 0 ? 'up' : 'down'}
          />
          <SummaryCard 
            label="Headcount Impacted" 
            value={summary.headcountImpacted || 0} 
            icon={<Users className="w-5 h-5" />} 
          />
          <SummaryCard 
            label="Risk Delta (Compression)" 
            value={summary.riskDelta || 0} 
            icon={<ShieldAlert className="w-5 h-5" />} 
            reverseTrend
            trend={summary.riskDelta > 0 ? 'up' : 'down'}
          />
          <SummaryCard 
            label="Market Alignment Shift" 
            value={`${(summary.marketAlignmentShift || 0).toFixed(2)}%`} 
            icon={<Target className="w-5 h-5" />} 
            trend={summary.marketAlignmentShift > 0 ? 'up' : 'down'}
          />
        </div>

        {/* Comparative View / Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Active Transformations */}
          <div className="bg-white dark:bg-slate-900 border border-[rgb(var(--border-main))] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[rgb(var(--border-main))] bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Active Transformations
              </h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {scenario?.simulation_inputs?.length || 0} Steps
              </span>
            </div>
            
            <div className="p-6">
              {(!scenario?.simulation_inputs || scenario.simulation_inputs.length === 0) ? (
                <div className="text-center py-8 space-y-3">
                   <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto">
                      <Plus className="w-6 h-6 text-slate-300" />
                   </div>
                   <p className="text-slate-400 font-medium text-sm italic">
                    No transformations added yet.
                   </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {scenario.simulation_inputs.map((tx: any, idx: number) => (
                    <li key={tx.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-[rgb(var(--border-main))]">
                      <span className="w-6 h-6 bg-white dark:bg-slate-700 rounded-md flex items-center justify-center text-[10px] font-black text-slate-400 border border-[rgb(var(--border-main))]">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                          {tx.operation_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {JSON.stringify(tx.transformation_data)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Detailed Results */}
          <div className="bg-white dark:bg-slate-900 border border-[rgb(var(--border-main))] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[rgb(var(--border-main))] bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
               <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-500" />
                Impact Analysis
              </h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                All Targets
              </span>
            </div>
            
            <div className="overflow-x-auto">
              {results?.detail_json ? (
                <table className="w-full text-left font-semibold">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-[rgb(var(--border-main))] text-[10px] text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3">Employee</th>
                      <th className="px-6 py-3">Old Salary</th>
                      <th className="px-6 py-3">New Salary</th>
                      <th className="px-6 py-3">Delta</th>
                      <th className="px-6 py-3">Band Fit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border-main))]">
                     {Object.entries(results.detail_json).map(([id, data]: [string, any]) => (
                       <tr key={id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold font-mono text-slate-500">{id.slice(0, 8)}...</td>
                          <td className="px-6 py-4 text-sm text-slate-400">${(data.base?.band_fit?.midpoint || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white">${(data.sim?.band_fit?.midpoint || 0).toLocaleString()}</td>
                          <td className={`px-6 py-4 text-sm font-black ${data.deltas.salary > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {data.deltas.salary > 0 ? `+$${data.deltas.salary.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                              data.sim.band_fit.status.startsWith('IN_RANGE') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {data.sim.band_fit.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-slate-400 font-medium text-sm italic">
                    Run simulation to see detailed impact analysis.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  reverseTrend?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, icon, trend, reverseTrend }) => {
  const isPositive = trend === 'up';
  const isGood = reverseTrend ? !isPositive : isPositive;
  
  const trendColor = isGood ? 'text-emerald-500' : 'text-amber-500';

  return (
    <div className="bg-white dark:bg-slate-900 border border-[rgb(var(--border-main))] p-6 rounded-2xl shadow-sm">
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400">
          {icon}
        </div>
        {trend && (
          <div className={`text-xs font-black uppercase tracking-tighter flex items-center gap-0.5 ${trendColor}`}>
            {isPositive ? '+' : ''}{trend === 'up' ? 'Increase' : 'Decrease'}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-tight">
          {label}
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
          {value}
        </div>
      </div>
    </div>
  );
};
