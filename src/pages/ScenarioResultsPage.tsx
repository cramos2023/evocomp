import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calculator, Users, TrendingUp, 
  Download, Filter, Search, Settings, RefreshCw,
  AlertCircle, AlertTriangle, List, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { ColumnConfigModal } from '../components/scenarios/ColumnConfigModal';
import { JobStatusBadge, type FormulaJob } from '../components/scenarios/JobStatusBadge';
import { ManageColumnsModal } from '../components/scenarios/ManageColumnsModal';
import { JobHistoryModal } from '../components/scenarios/JobHistoryModal';
import { getCalculationMode, SYNC_ROW_LIMIT } from '../components/scenarios/columnsExport';
import { DataQualityReportModal } from '../components/scenarios/DataQualityReportModal';
import { FileCheck } from 'lucide-react';
import { formatCsvValue, buildCsv, downloadCsv } from '../utils/csv';


interface Scenario {
  id: string;
  name: string;
  snapshot_id?: string;
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

  // Column Config State
  const [dataset, setDataset] = useState<any>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [activeJob, setActiveJob] = useState<FormulaJob | null>(null);
  const jobPollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [isJobHistoryOpen, setIsJobHistoryOpen] = useState(false);
  const [isQualityReportOpen, setIsQualityReportOpen] = useState(false);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);


  // Filter state
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (id) fetchResults();
    return () => {
      if (jobPollInterval.current) clearInterval(jobPollInterval.current);
    };
  }, [id]);

  const startPollingJob = useCallback((jobId: string) => {
    if (jobPollInterval.current) clearInterval(jobPollInterval.current);
    jobPollInterval.current = setInterval(async () => {
      const { data: job } = await supabase.from('formula_jobs').select('*').eq('id', jobId).single();
      if (job) {
        setActiveJob(job as FormulaJob);
        if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled') {
          clearInterval(jobPollInterval.current!);
          jobPollInterval.current = null;
          setIsRecalculating(false);
          // Refresh grid data after completion
          fetchResults();
        }
      }
    }, 2000);
  }, []);

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
      if (scenarioData?.snapshot_id) setSnapshotId(scenarioData.snapshot_id);

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

      // 3. Fetch dataset and columns
      let { data: datasetData } = await supabase
        .from('dynamic_datasets')
        .select('*')
        .eq('scenario_id', id)
        .maybeSingle();

      if (!datasetData) {
        const tenantId = (await supabase.auth.getUser()).data.user?.id || '00000000-0000-0000-0000-000000000000';
        const { data: newDataset } = await supabase
          .from('dynamic_datasets')
          .insert({ scenario_id: id, tenant_id: tenantId, base_currency_code: 'USD' })
          .select()
          .single();
        datasetData = newDataset;

        // Seed preset columns server-side after creating the dataset
        if (newDataset) {
          await supabase.functions.invoke('seed-presets', {
            body: { dataset_id: newDataset.id, tenant_id: tenantId }
          });
        }
      }
      setDataset(datasetData);

      if (datasetData) {
        const { data: cols } = await supabase
          .from('column_definitions')
          .select('*')
          .eq('dataset_id', datasetData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        setColumns(cols || []);
      }

      // 4. Fetch employee results for this run
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

  const handleRecalculate = async () => {
    if (!latestRun || !dataset) return;
    setIsRecalculating(true);
    try {
      const { data: jobData, error: jobErr } = await supabase.from('formula_jobs').insert({
        tenant_id: dataset.tenant_id,
        dataset_id: dataset.id,
        scenario_run_id: latestRun.id,
        requested_columns: columns.map(c => c.column_key),
        mode: 'sync',
      }).select().single();

      if (jobErr) throw jobErr;

      setActiveJob(jobData as FormulaJob);

      // Invoke engine in background; polling will track progress
      supabase.functions.invoke('formula-engine', { body: { job_id: jobData.id } });
      startPollingJob(jobData.id);

    } catch (err: any) {
      alert('Recalculation failed: ' + err.message);
      setIsRecalculating(false);
    }
  };

  const handleUpdateInput = async (resultId: string, key: string, value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
    
    // Update local state for immediate feedback
    setResults(prev => prev.map(r => {
      if (r.id === resultId) {
        return {
          ...r,
          after_json: { ...r.after_json, [key]: numericValue }
        };
      }
      return r;
    }));

    // Fetch current after_json and merge (don't overwrite other keys)
    const row = results.find(r => r.id === resultId);
    const merged = { ...(row?.after_json || {}), [key]: numericValue };

    // Async DB update without triggering immediate recalculation
    await supabase.from('scenario_employee_results')
      .update({ after_json: merged })
      .eq('id', resultId);
  };

  // Input validation rules (warning only, never block)
  const INPUT_VALIDATION_RULES: Record<string, { min: number; max: number; label: string }> = {
    input_merit_pct: { min: 0, max: 1, label: '0–100%' },
    input_lump_sum_local: { min: 0, max: 1000000, label: '0–1,000,000' },
    input_promotion_pct: { min: 0, max: 0.50, label: '0–50%' },
  };

  const getInputWarning = (key: string, value: number): string | null => {
    const rule = INPUT_VALIDATION_RULES[key];
    if (!rule) return null;
    if (value < rule.min || value > rule.max) return `Out of range (expected ${rule.label})`;
    return null;
  };

  // Editable input column keys
  const EDITABLE_INPUTS = ['input_merit_pct', 'input_lump_sum_local', 'input_promotion_pct'];

  // Optional base cols from snapshot — only show if at least one row has the field
  const OPTIONAL_BASE_COLS = [
    { key: 'base_salary_local', label: 'Base Salary (Local)' },
    { key: 'annual_variable_target_local', label: 'Variable Target (Local)' },
    { key: 'annual_guaranteed_cash_target_local', label: 'Guaranteed Cash (Local)' },
    { key: 'target_cash_local', label: 'Target Cash (Local)' },
    { key: 'total_guaranteed_local', label: 'Total Guaranteed (Local)' },
  ];

  const visibleBaseCols = useMemo(() => {
    return OPTIONAL_BASE_COLS.filter(bc =>
      results.some(r => {
        const snap = (r as any).snapshot_employee_data;
        return snap && snap[bc.key] !== undefined && snap[bc.key] !== null;
      })
    );
  }, [results]);

  // Active calc columns (non-input, with formula)
  const calcColumns = useMemo(() => columns.filter(c => c.formula_dsl && c.is_active), [columns]);

  // Active input columns from column_definitions (for display labels)
  const inputColDefs = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of columns) { if (!c.formula_dsl && c.is_active) map.set(c.column_key, c); }
    return map;
  }, [columns]);

  // --- CSV Export ---
  const handleExportCsv = useCallback(() => {
    if (!latestRun || results.length === 0) return;
    setIsExporting(true);

    try {
      // Build column manifest in specified order
      // 1. Identifiers
      const idCols = [
        { key: 'employee_id', label: 'Employee ID', type: 'text' },
        { key: 'full_name', label: 'Full Name', type: 'text' },
      ];

      // 2. Snapshot base cols (only those visible in the grid)
      const baseCols = visibleBaseCols.map(bc => ({
        key: bc.key, label: bc.label, type: 'currency' as string,
      }));

      // 3. Performance rating
      const ratingCol = [{ key: 'performance_rating', label: 'Performance Rating', type: 'text' }];

      // 4. Active input columns
      const inputCols = EDITABLE_INPUTS
        .filter(ik => inputColDefs.has(ik) || results.some(r => r.after_json?.[ik] !== undefined))
        .map(ik => {
          const def = inputColDefs.get(ik);
          return { key: ik, label: def?.label || ik, type: def?.data_type || 'number' };
        });

      // 5. Active calc columns
      const outputCols = calcColumns.map(c => ({
        key: c.column_key, label: c.label, type: c.data_type || 'number',
      }));

      // 6. Salary before/after (always present)
      const salaryCols = [
        { key: 'salary_base_before', label: 'Salary Base Before', type: 'currency' },
        { key: 'salary_base_after', label: 'Salary Base After', type: 'currency' },
      ];

      const allCols = [...idCols, ...ratingCol, ...baseCols, ...salaryCols, ...inputCols, ...outputCols];

      // Build headers
      const headers = allCols.map(c => c.label);

      // Build rows
      const rows = results.map(res => {
        const snap = (res as any).snapshot_employee_data || {};
        return allCols.map(col => {
          let raw: unknown;
          if (col.key === 'employee_id') raw = res.employee_id;
          else if (col.key === 'full_name') raw = res.after_json?.full_name;
          else if (col.key === 'performance_rating') raw = res.before_json?.performance_rating;
          else if (col.key === 'salary_base_before') raw = res.salary_base_before;
          else if (col.key === 'salary_base_after') raw = res.salary_base_after;
          else if (col.key.startsWith('input_') || col.key.startsWith('calc_')) raw = res.after_json?.[col.key];
          else raw = snap[col.key] ?? res.after_json?.[col.key];

          if (col.type === 'text') return raw != null ? String(raw) : '';
          return formatCsvValue(raw, col.type);
        });
      });

      // Filename: evocomp_scenario_<id>_run_<runId>_<YYYYMMDD-HHMM>.csv
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `evocomp_scenario_${id}_run_${latestRun.id.substring(0, 8)}_${ts}.csv`;

      const csv = buildCsv(headers, rows);
      downloadCsv(csv, filename);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [results, latestRun, id, visibleBaseCols, inputColDefs, calcColumns]);



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
        <div className="flex gap-3 items-center">
          <button 
            type="button" 
            onClick={() => setIsManageColumnsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <List className="w-4 h-4" />
            Manage Columns
          </button>
          <button 
            type="button" 
            onClick={() => setIsJobHistoryOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Clock className="w-4 h-4" />
            Job History
          </button>
          <button 
            type="button" 
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Settings className="w-4 h-4" />
            Config Columns
          </button>
          <div className="flex flex-col items-end">
            <button 
              type="button" 
              onClick={handleRecalculate}
              disabled={isRecalculating || activeJob?.status === 'running' || activeJob?.status === 'queued'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
              {isRecalculating ? 'Recalculating...' : 'Recalculate All'}
            </button>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Rows: {results.length} · Mode: {getCalculationMode(results.length)}{results.length > SYNC_ROW_LIMIT ? ' ⚠' : ''}
            </p>
          </div>
          <button 
            type="button" 
            onClick={handleExportCsv}
            disabled={isExporting || results.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
            {isExporting ? 'Exporting…' : t('common.export')}
          </button>
        </div>
      </div>

      {activeJob && (
        <div className="mb-6">
          <JobStatusBadge job={activeJob} onDismiss={() => setActiveJob(null)} />
        </div>
      )}

      {results.length > SYNC_ROW_LIMIT && (
        <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
          Large dataset ({results.length.toLocaleString()} rows): calculation will run asynchronously.
        </div>
      )}

      {/* Data Quality Banner — missing base compensation fields */}
      {visibleBaseCols.length < 5 && results.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Some base compensation fields are missing from this snapshot (e.g., annual variable / guaranteed cash).
              Certain calculated outputs may appear blank (—) and jobs may show warnings.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsQualityReportOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
          >
            <FileCheck className="w-3.5 h-3.5" />
            View data quality report
          </button>
        </div>
      )}

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
                {/* Snapshot base columns */}
                {visibleBaseCols.map(bc => (
                  <th key={bc.key} className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right">{bc.label}</th>
                ))}
                {/* Editable inputs */}
                {EDITABLE_INPUTS.map(ik => {
                  const def = inputColDefs.get(ik);
                  return (
                    <th key={ik} className="px-4 py-4 text-[10px] uppercase font-bold text-emerald-600 tracking-widest text-right">
                      {def?.label || ik}
                    </th>
                  );
                })}
                {/* Calculated outputs */}
                {calcColumns.map(col => (
                  <th key={col.id} className="px-4 py-4 text-[10px] uppercase font-bold text-blue-500 tracking-widest text-right">
                    {col.label}
                  </th>
                ))}
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('pages.scenarios.flags')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredResults.map((res) => {
                const snap = (res as any).snapshot_employee_data || {};
                return (
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
                  {/* Snapshot base columns */}
                  {visibleBaseCols.map(bc => (
                    <td key={bc.key} className="px-4 py-4 text-sm text-slate-600 text-right font-mono">
                      {snap[bc.key] != null ? `$${Number(snap[bc.key]).toLocaleString()}` : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                  {/* Editable inputs with validation */}
                  {EDITABLE_INPUTS.map(ik => {
                    const val = Number(res.after_json?.[ik] ?? 0);
                    const warning = getInputWarning(ik, val);
                    return (
                      <td key={ik} className="px-4 py-4 text-right">
                        <div className="inline-flex flex-col items-end">
                          <input 
                            type="number" 
                            step={ik.includes('pct') ? '0.01' : '1'}
                            className={`w-24 px-2 py-1 text-right border rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none ${
                              warning ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                            }`}
                            defaultValue={val}
                            onBlur={(e) => handleUpdateInput(res.id, ik, e.target.value)}
                            title={warning || undefined}
                          />
                          {warning && (
                            <span className="text-[9px] text-amber-600 mt-0.5 max-w-[6rem] truncate" title={warning}>{warning}</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  {/* Calculated outputs */}
                  {calcColumns.map(col => {
                    const v = res.after_json?.[col.column_key];
                    const isNull = v === null || v === undefined;
                    return (
                      <td key={col.id} className={`px-4 py-4 text-sm font-bold text-right font-mono ${isNull ? 'text-slate-300 italic' : 'text-blue-600'}`}>
                        {isNull ? '—'
                          : col.data_type === 'currency' ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : col.data_type === 'percent' ? `${(Number(v) * 100).toFixed(2)}%`
                          : Number(v).toLocaleString()}
                      </td>
                    );
                  })}
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
                );
              })}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={99} className="px-6 py-12 text-center text-slate-400">No se encontraron empleados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dataset && latestRun && (
        <ColumnConfigModal 
          isOpen={isConfigModalOpen} 
          onClose={() => setIsConfigModalOpen(false)} 
          datasetId={dataset.id}
          scenarioRunId={latestRun.id}
          tenantId={dataset.tenant_id}
          onSuccess={fetchResults}
        />
      )}

      {dataset && (
        <ManageColumnsModal
          isOpen={isManageColumnsOpen}
          onClose={() => setIsManageColumnsOpen(false)}
          datasetId={dataset.id}
          onColumnsChanged={fetchResults}
        />
      )}

      {dataset && latestRun && (
        <JobHistoryModal
          isOpen={isJobHistoryOpen}
          onClose={() => setIsJobHistoryOpen(false)}
          datasetId={dataset.id}
          scenarioRunId={latestRun.id}
        />
      )}

      {snapshotId && (
        <DataQualityReportModal
          isOpen={isQualityReportOpen}
          onClose={() => setIsQualityReportOpen(false)}
          snapshotId={snapshotId}
        />
      )}
    </div>
  );
};

export default ScenarioResultsPage;
