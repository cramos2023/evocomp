import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calculator, Users, TrendingUp, 
  Download, Filter, Search,
  AlertCircle, AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

interface Scenario {
  id: string;
  name: string;
  snapshot?: {
    name: string;
  };
}

interface ScenarioRun {
  id: string;
  status: string;
  total_headcount: number;
  total_increase_local: number;
  total_increase_base: number;
  finished_at: string;
  quality_report?: {
    missing_fx: number;
    missing_pay_band: number;
    missing_rating: number;
  };
}

interface EmployeeData {
  full_name?: string;
  performance_rating?: string;
  increase_amt_local?: number;
  increase_pct?: number;
  [key: string]: unknown;
}

interface EmployeeResult {
  id: string;
  employee_id: string;
  salary_base_before: number;
  salary_base_after: number;
  before_json: EmployeeData;
  after_json: EmployeeData;
  flags_json: string[];
}

const ScenarioResultsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [latestRun, setLatestRun] = useState<ScenarioRun | null>(null);
  const [results, setResults] = useState<EmployeeResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (id) fetchResults();
  }, [id]);

  async function fetchResults() {
    setLoading(true);
    try {
      // 1. Fetch scenario details
      const { data: scenarioData, error: scenarioError } = await supabase
        .from('scenarios')
        .select('*, snapshot:snapshots(name)')
        .eq('id', id)
        .single();
      
      if (scenarioError) throw scenarioError;
      setScenario(scenarioData);

      // 2. Fetch the absolute latest COMPLETED run
      const { data: runData, error: runError } = await supabase
        .from('scenario_runs')
        .select('*')
        .eq('scenario_id', id)
        .eq('status', 'COMPLETED')
        .order('finished_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (runError) throw runError;
      
      if (!runData) {
        setError('No completed runs found for this scenario.');
        setLoading(false);
        return;
      }
      
      setLatestRun(runData);

      // 3. Fetch employee results for this run
      const { data: resultsData, error: resultsError } = await supabase
        .from('scenario_employee_results')
        .select('*')
        .eq('run_id', runData.id)
        .order('employee_id', { ascending: true });

      if (resultsError) throw resultsError;
      setResults((resultsData || []) as unknown as EmployeeResult[]);

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching results:', error);
      setError(error.message || 'Error al cargar los resultados');
    } finally {
      setLoading(false);
    }
  }

  const filteredResults = useMemo(() => {
    if (!searchTerm) return results;
    return results.filter(r => 
      (r.after_json?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [results, searchTerm]);

  const qualityStats = latestRun?.quality_report || { missing_fx: 0, missing_pay_band: 0, missing_rating: 0 };
  const hasIssues = qualityStats.missing_fx > 0 || qualityStats.missing_pay_band > 0 || qualityStats.missing_rating > 0;

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="h-32 bg-white border border-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-white border border-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-white border border-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-96 bg-white border border-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="p-20 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{error || 'Scenario not found'}</h2>
        <button 
          type="button"
          onClick={() => navigate('/app/comp/scenarios')}
          className="text-blue-600 font-bold hover:underline"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button 
        type="button"
        onClick={() => navigate('/app/comp/scenarios')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('pages.scenarios.title')}
      </button>

      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{scenario.name}</h1>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {latestRun?.status}
            </span>
          </div>
          <p className="text-slate-500">
            {t('pages.scenarios.results_for_run')} {latestRun?.finished_at ? new Date(latestRun.finished_at).toLocaleString() : 'N/A'}
          </p>
        </div>
        <button type="button" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
          <Download className="w-4 h-4" />
          {t('common.export')}
        </button>
      </div>

      {hasIssues && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900">Reporte de Calidad de Datos</h3>
              <p className="text-amber-700 text-sm">Se han detectado inconsistencias que pueden afectar la precisión de los cálculos.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {qualityStats.missing_fx > 0 && (
              <div className="px-4 py-2 bg-white border border-amber-200 rounded-xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400">Sin Tasa FX</p>
                <p className="text-sm font-bold text-amber-600">{qualityStats.missing_fx} empleados</p>
              </div>
            )}
            {qualityStats.missing_pay_band > 0 && (
              <div className="px-4 py-2 bg-white border border-amber-200 rounded-xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400">Sin Banda Salarial</p>
                <p className="text-sm font-bold text-amber-600">{qualityStats.missing_pay_band} empleados</p>
              </div>
            )}
            {qualityStats.missing_rating > 0 && (
              <div className="px-4 py-2 bg-white border border-amber-200 rounded-xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400">Sin Rating</p>
                <p className="text-sm font-bold text-amber-600">{qualityStats.missing_rating} empleados</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('pages.scenarios.total_increase')}</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${Number(latestRun?.total_increase_base || latestRun?.total_increase_local || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('pages.scenarios.headcount')}</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{latestRun?.total_headcount}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('pages.scenarios.avg_increase')}</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {latestRun && latestRun.total_headcount > 0 
              ? `${((latestRun.total_increase_base || 0) / (results.reduce((acc, curr) => acc + (curr.salary_base_before || 0), 0) || 1) * 100).toFixed(2)}%`
              : '0.00%'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-900">{t('pages.scenarios.employee_details')}</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64"
              />
            </div>
            <button type="button" className="p-2 border border-slate-200 rounded-lg hover:bg-white text-slate-400">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('common.employee')}</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('pages.scenarios.rating')}</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right">{t('pages.scenarios.salary_before')}</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right">{t('pages.scenarios.increase')} (%)</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right">{t('pages.scenarios.salary_after')}</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('pages.scenarios.flags')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredResults.map((res) => (
                <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {String(res.after_json?.full_name || res.employee_id).substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{res.after_json?.full_name || 'N/A'}</p>
                          {res.flags_json?.includes('MISSING_FX') && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                          {res.flags_json?.includes('NO_PAY_BAND') && <AlertCircle className="w-3 h-3 text-red-500" />}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{res.employee_id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-bold">
                    {res.before_json?.performance_rating || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right font-mono">
                    ${Number(res.salary_base_before || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-blue-600">+${Number(res.after_json?.increase_amt_local || 0).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-400">({(Number(res.after_json?.increase_pct || 0) * 100).toFixed(1)}%)</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 text-right font-bold font-mono">
                    ${Number(res.salary_base_after || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {res.flags_json?.map((flag: string) => (
                        <span key={flag} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-tighter ${
                          flag === 'INVALID_RATING' || flag === 'MISSING_FX' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          flag === 'NO_PAY_BAND' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {flag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No se encontraron empleados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ScenarioResultsPage;
