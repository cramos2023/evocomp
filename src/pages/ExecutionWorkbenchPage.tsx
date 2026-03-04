import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, RefreshCw, AlertTriangle, CheckCircle,
  DollarSign, TrendingUp, BarChart3, Info, Search,
  ChevronLeft, ChevronRight, Filter, X
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

interface EmployeeRow {
  id: string;
  employee_external_id: string;
  full_name: string;
  country_code: string;
  local_currency: string;
  pay_grade_internal: string;
  performance_rating: string;
  base_salary_local: number;
  annual_variable_target_local: number;
  target_cash_local: number;
  contract_hours_per_week: number;
  employee_status: string;
  manager_name: string;
}

interface GuidelineCell {
  rating_key: string;
  zone_key: string;
  max_pct: number;
}

type ExecutionStatus = 'DRAFT' | 'RUNNABLE' | 'EXECUTED';

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

const fmt = (n: number | null | undefined, d = 0) =>
  n != null ? n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const fmtPct = (n: number | null | undefined) =>
  n != null ? `${(n * 100).toFixed(2)}%` : '—';

const ZONE_COLORS: Record<string, string> = {
  BELOW_MIN: 'bg-sky-100 text-sky-700', BELOW_MID: 'bg-blue-100 text-blue-700',
  ABOVE_MID: 'bg-indigo-100 text-indigo-700', ABOVE_MAX: 'bg-slate-100 text-slate-600',
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════

const ExecutionWorkbenchPage: React.FC = () => {
  const { t } = useTranslation();
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();

  // Core data
  const [scenario, setScenario] = useState<any>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [guidelines, setGuidelines] = useState<GuidelineCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [execError, setExecError] = useState('');
  const [perEmpErrors, setPerEmpErrors] = useState<Record<string, any>>({});
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('DRAFT');

  // Manager inputs: { snapshot_employee_id → pct string }
  const [inputs, setInputs] = useState<Record<string, string>>({});

  // Filters
  const [filterCountry, setFilterCountry] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Payband + FX for client-side preview
  const [bands, setBands] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);

  // ─── LOAD DATA ───
  const loadData = useCallback(async () => {
    if (!scenarioId) return;
    setLoading(true);
    try {
      // Scenario
      const { data: scen } = await supabase.from('scenarios')
        .select('*, snapshot:snapshots(name, snapshot_date), rules:scenario_rules(rules_json)')
        .eq('id', scenarioId).single();
      setScenario(scen);
      if (!scen?.snapshot_id) return;

      // Employees from snapshot
      const { data: empData } = await supabase.from('snapshot_employee_data')
        .select('*').eq('snapshot_id', scen.snapshot_id)
        .order('employee_external_id', { ascending: true });
      setEmployees(empData || []);

      // Guideline matrix
      const { data: glData } = await supabase.from('scenario_guideline_matrix')
        .select('*').eq('scenario_id', scenarioId);
      setGuidelines(glData || []);

      // Existing inputs (if any, for resume)
      const { data: inputData } = await supabase.from('scenario_employee_inputs')
        .select('snapshot_employee_id, requested_merit_pct')
        .eq('scenario_id', scenarioId).eq('pass_number', 1);
      if (inputData && inputData.length > 0) {
        const restored: Record<string, string> = {};
        for (const inp of inputData) {
          restored[inp.snapshot_employee_id] = (inp.requested_merit_pct * 100).toFixed(2);
        }
        setInputs(restored);
      }

      // Check if execution run already exists
      const { data: existingRuns } = await supabase.from('scenario_runs')
        .select('id, engine_mode').eq('scenario_id', scenarioId)
        .eq('engine_mode', 'EXECUTION_RUN').limit(1);
      if (existingRuns && existingRuns.length > 0) {
        setExecutionStatus('EXECUTED');
      }

      // Bands + FX for preview
      const { data: bandData } = await supabase.from('pay_bands').select('*');
      setBands(bandData || []);
      const baseCurrency = scen.base_currency || 'USD';
      const { data: rateData } = await supabase.from('fx_rates')
        .select('*').eq('to_currency', baseCurrency).order('date', { ascending: false });
      setRates(rateData || []);
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── DERIVED DATA ───
  const rules = scenario?.rules?.[0]?.rules_json || scenario?.rules_json || {};
  const fteStandard = rules.fte_hours_standard || 40;
  const baseCurrency = scenario?.base_currency || 'USD';

  // Build lookup maps
  const guidelineMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of guidelines) m.set(`${g.rating_key}_${g.zone_key}`, g.max_pct);
    return m;
  }, [guidelines]);

  const rateMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rates) m.set(r.from_currency, Number(r.rate));
    return m;
  }, [rates]);

  const bandMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const b of bands) m.set(`${b.grade}_${b.basis_type}`, b);
    return m;
  }, [bands]);

  // Normalize rating (matching engine logic)
  const normalizeRating = (raw: string): string => {
    const r = (raw || '').toUpperCase().trim();
    const map: Record<string, string> = {
      'FE': 'FE', 'FAR EXCEEDS': 'FE', 'FAR_EXCEEDS': 'FE', '5': 'FE',
      'E': 'E', 'EXCEEDS': 'E', '4': 'E',
      'FM': 'FM', 'FULLY MEETS': 'FM', 'FULLY_MEETS': 'FM', '3': 'FM', 'MEETS': 'FM',
      'PM': 'PM', 'PARTIALLY MEETS': 'PM', '2': 'PM',
      'DNM': 'DNM', 'DOES NOT MEET': 'DNM', '1': 'DNM',
    };
    return map[r] ?? r;
  };

  const getZone = (cr: number): string => {
    const t1 = rules.threshold_1 || 0.8, t2 = rules.threshold_2 || 1.0, t3 = rules.threshold_3 || 1.2;
    if (cr < t1) return 'BELOW_MIN';
    if (cr < t2) return 'BELOW_MID';
    if (cr < t3) return 'ABOVE_MID';
    return 'ABOVE_MAX';
  };

  // Compute per-employee derived data
  const enrichedEmployees = useMemo(() => {
    return employees.map(emp => {
      const fxRate = rateMap.get(emp.local_currency) || (emp.local_currency === baseCurrency ? 1 : 1);
      const baseSalary = Number(emp.base_salary_local) || 0;
      const variableTarget = Number(emp.annual_variable_target_local) || Math.max(0, (Number(emp.target_cash_local) || 0) - baseSalary);
      const totalCashLocal = baseSalary + Math.max(0, variableTarget);
      const totalCashBase = totalCashLocal / (fxRate || 1);
      const contractHours = Number(emp.contract_hours_per_week) || 0;

      // Payband lookup
      const band = bandMap.get(`${emp.pay_grade_internal}_BASE_SALARY`) ||
                    bandMap.get(`${emp.pay_grade_internal}_ANNUAL_TARGET_CASH`) || null;
      const midBase = band ? Number(band.midpoint) : 0;
      const maxBase = band ? Number(band.max_salary) : 0;
      const fteAdj = (contractHours > 0 && fteStandard > 0) ? (fteStandard / contractHours) : 1;
      const compaBefore = midBase > 0 ? (totalCashBase / midBase) * fteAdj : null;
      const zone = compaBefore != null ? getZone(compaBefore) : null;

      // Guideline max
      const rating = normalizeRating(emp.performance_rating);
      const guidelineMaxPct = (zone && rating) ? (guidelineMap.get(`${rating}_${zone}`) ?? 0) : 0;

      // Manager input
      const inputStr = inputs[emp.id] ?? '';
      const inputPct = inputStr !== '' ? parseFloat(inputStr) / 100 : null;
      const isValid = inputPct !== null && inputPct >= 0 && inputPct <= guidelineMaxPct;
      const isEmpty = inputStr === '' || inputStr === undefined;
      const exceedsGuideline = inputPct !== null && inputPct > guidelineMaxPct;
      const isNegative = inputPct !== null && inputPct < 0;

      // Compute preview values
      let grossIncrease = 0, consolidated = 0, lumpSum = 0, newTotalCash = totalCashBase, compaAfter = compaBefore;
      if (inputPct !== null && inputPct >= 0) {
        grossIncrease = totalCashBase * inputPct;
        const maxTotalCashAdj = (contractHours > 0 && fteStandard > 0)
          ? maxBase * (contractHours / fteStandard) : maxBase;
        const roomToMax = Math.max(0, maxTotalCashAdj - totalCashBase);
        consolidated = Math.min(grossIncrease, roomToMax);
        lumpSum = grossIncrease - consolidated;
        newTotalCash = totalCashBase + consolidated;
        compaAfter = midBase > 0 ? (newTotalCash / midBase) * fteAdj : null;
      }

      return {
        ...emp,
        totalCashBase,
        compaBefore,
        zone,
        guidelineMaxPct,
        inputStr,
        inputPct,
        isValid,
        isEmpty,
        exceedsGuideline,
        isNegative,
        grossIncrease,
        consolidated,
        lumpSum,
        newTotalCash,
        compaAfter,
        budgetSpend: grossIncrease,
      };
    });
  }, [employees, inputs, guidelineMap, rateMap, bandMap, baseCurrency, fteStandard, rules]);

  // Filter + search
  const filteredEmployees = useMemo(() => {
    return enrichedEmployees.filter(e => {
      if (filterCountry && e.country_code !== filterCountry) return false;
      if (filterManager && e.manager_name !== filterManager) return false;
      if (filterGrade && e.pay_grade_internal !== filterGrade) return false;
      if (filterRating && e.performance_rating !== filterRating) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!e.employee_external_id?.toLowerCase().includes(term) &&
            !e.full_name?.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [enrichedEmployees, filterCountry, filterManager, filterGrade, filterRating, searchTerm]);

  // Pagination
  const totalFiltered = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedEmployees = filteredEmployees.slice(startIdx, startIdx + pageSize);

  useEffect(() => { setCurrentPage(1); }, [filterCountry, filterManager, filterGrade, filterRating, searchTerm, pageSize]);

  // Budget calculations (across ALL employees, not just filtered)
  const budgetPool = useMemo(() => {
    const pct = rules.approved_budget_pct || 0;
    const totalCashSum = enrichedEmployees.reduce((sum, e) => sum + e.totalCashBase, 0);
    return totalCashSum * pct;
  }, [enrichedEmployees, rules]);

  const budgetUsed = useMemo(() => {
    return enrichedEmployees.reduce((sum, e) => sum + e.budgetSpend, 0);
  }, [enrichedEmployees]);

  const budgetRemaining = budgetPool - budgetUsed;
  const budgetPctUsed = budgetPool > 0 ? (budgetUsed / budgetPool) * 100 : 0;

  // Validation status (across ALL employees)
  const validationErrors = useMemo(() => {
    let empty = 0, exceeds = 0, negative = 0, total = 0;
    for (const e of enrichedEmployees) {
      total++;
      if (e.isEmpty) empty++;
      if (e.exceedsGuideline) exceeds++;
      if (e.isNegative) negative++;
    }
    return { empty, exceeds, negative, total, hasErrors: empty > 0 || exceeds > 0 || negative > 0 };
  }, [enrichedEmployees]);

  // Derive execution status
  useEffect(() => {
    if (executionStatus === 'EXECUTED') return; // already executed
    const allFilled = enrichedEmployees.length > 0 && enrichedEmployees.every(e => !e.isEmpty);
    const noErrors = !validationErrors.hasErrors;
    setExecutionStatus(allFilled && noErrors ? 'RUNNABLE' : 'DRAFT');
  }, [enrichedEmployees, validationErrors, executionStatus]);

  // Unique values for filters
  const uniqueCountries = useMemo(() => [...new Set(employees.map(e => e.country_code).filter(Boolean))].sort(), [employees]);
  const uniqueManagers = useMemo(() => [...new Set(employees.map(e => e.manager_name).filter(Boolean))].sort(), [employees]);
  const uniqueGrades = useMemo(() => [...new Set(employees.map(e => e.pay_grade_internal).filter(Boolean))].sort(), [employees]);
  const uniqueRatings = useMemo(() => [...new Set(employees.map(e => e.performance_rating).filter(Boolean))].sort(), [employees]);

  // ─── HANDLERS ───
  const handleInputChange = (empId: string, value: string) => {
    setInputs(prev => ({ ...prev, [empId]: value }));
    setPerEmpErrors(prev => { const n = { ...prev }; delete n[empId]; return n; });
  };

  const handleExecute = async () => {
    if (!scenarioId || validationErrors.hasErrors) return;
    setExecuting(true);
    setExecError('');
    setPerEmpErrors({});

    try {
      const inputsPayload = enrichedEmployees.map(e => ({
        snapshot_employee_id: e.id,
        requested_merit_pct: e.inputPct ?? 0,
      }));

      const { data, error } = await supabase.functions.invoke('scenario-engine-v30-bundled', {
        body: { scenarioId, mode: 'EXECUTION_RUN', inputs: inputsPayload },
      });

      if (error) {
        try {
          const body = await error.context.json();
          if (body.per_employee_errors) setPerEmpErrors(body.per_employee_errors);
          setExecError(body.message || body.error || error.message);
        } catch {
          setExecError(error.message || 'Execution failed');
        }
        return;
      }

      if (data?.error) {
        if (data.per_employee_errors) setPerEmpErrors(data.per_employee_errors);
        setExecError(data.message || data.error);
        return;
      }

      setExecutionStatus('EXECUTED');
      // Navigate to results
      navigate(`/app/comp/scenarios/${scenarioId}/results`);
    } catch (err: any) {
      setExecError(err.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  // ─── RENDER ───
  if (loading) return (
    <div className="p-8 space-y-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  const STATUS_BADGE: Record<ExecutionStatus, { label: string; color: string }> = {
    DRAFT: { label: t('workbench.status_draft', { defaultValue: 'Draft' }), color: 'bg-amber-100 text-amber-700' },
    RUNNABLE: { label: t('workbench.status_runnable', { defaultValue: 'Ready' }), color: 'bg-green-100 text-green-700' },
    EXECUTED: { label: t('workbench.status_executed', { defaultValue: 'Executed' }), color: 'bg-blue-100 text-blue-700' },
  };

  const badge = STATUS_BADGE[executionStatus];

  return (
    <div className="flex flex-col min-h-screen max-h-screen" data-testid="execution-workbench">
      {/* ═══ STICKY TOP SECTION ═══ */}
      <div className="flex-shrink-0 bg-[rgb(var(--surface-main))] border-b border-[rgb(var(--border))] shadow-sm px-6 py-4 space-y-4">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-4 flex-wrap max-w-7xl mx-auto w-full">
          <div>
            <button onClick={() => navigate(`/app/comp/scenarios/${scenarioId}/results`)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" />{t('workbench.back_to_results', { defaultValue: 'Back to Results' })}
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {t('workbench.title', { defaultValue: 'Execution Workbench' })}
              </h1>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-bold mt-1">{scenario?.name} — {scenario?.snapshot?.name}</p>
          </div>
          <button
            data-testid="execute-btn"
            onClick={handleExecute}
            disabled={executing || validationErrors.hasErrors || executionStatus === 'EXECUTED'}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
          >
            {executing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {executing ? t('workbench.executing', { defaultValue: 'Executing…' }) : t('workbench.run_execution', { defaultValue: 'Run Execution' })}
          </button>
        </div>

        {/* Budget Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-7xl mx-auto w-full">
          {[
            { label: t('workbench.budget_pool', { defaultValue: 'Budget Pool' }), value: fmt(budgetPool), icon: DollarSign, color: 'text-blue-600' },
            { label: t('workbench.budget_used', { defaultValue: 'Budget Used' }), value: fmt(budgetUsed), icon: TrendingUp, color: budgetUsed > budgetPool ? 'text-red-600' : 'text-indigo-600' },
            { label: t('workbench.budget_remaining', { defaultValue: 'Remaining' }), value: fmt(budgetRemaining), icon: BarChart3, color: budgetRemaining < 0 ? 'text-red-600' : 'text-green-600' },
            { label: t('workbench.pct_used', { defaultValue: '% Used' }), value: `${budgetPctUsed.toFixed(1)}%`, icon: Info, color: budgetPctUsed > 100 ? 'text-red-600' : 'text-slate-600' },
            { label: t('workbench.budget_status', { defaultValue: 'Status' }), value: budgetUsed <= budgetPool ? t('workbench.within', { defaultValue: 'Within' }) : t('workbench.over', { defaultValue: 'Over' }), icon: CheckCircle, color: budgetUsed <= budgetPool ? 'text-green-600' : 'text-red-600' },
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

        {/* Validation Summary */}
        {validationErrors.hasErrors && (
          <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-xl p-3 max-w-7xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex gap-4 text-xs font-bold">
              {validationErrors.empty > 0 && <span className="text-amber-700">{validationErrors.empty} {t('workbench.empty_inputs', { defaultValue: 'empty' })}</span>}
              {validationErrors.exceeds > 0 && <span className="text-red-700">{validationErrors.exceeds} {t('workbench.exceeds_guideline', { defaultValue: 'exceed guideline' })}</span>}
              {validationErrors.negative > 0 && <span className="text-red-700">{validationErrors.negative} {t('workbench.negative', { defaultValue: 'negative' })}</span>}
            </div>
            <span className="text-[10px] text-amber-600 font-bold ml-auto">{t('workbench.fix_to_proceed', { defaultValue: 'Fix all errors to proceed' })}</span>
          </div>
        )}

        {/* Error Banner */}
        {execError && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 max-w-7xl mx-auto w-full">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{execError}
          </div>
        )}

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 max-w-7xl mx-auto w-full">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder={t('workbench.search', { defaultValue: 'Search…' })} value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20 w-48" />
          </div>
          {[
            { value: filterCountry, set: setFilterCountry, items: uniqueCountries, label: 'Country' },
            { value: filterManager, set: setFilterManager, items: uniqueManagers, label: 'Manager' },
            { value: filterGrade, set: setFilterGrade, items: uniqueGrades, label: 'Grade' },
            { value: filterRating, set: setFilterRating, items: uniqueRatings, label: 'Rating' },
          ].map(f => (
            <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-bold cursor-pointer">
              <option value="">{t(`workbench.filter_${f.label.toLowerCase()}`, { defaultValue: `All ${f.label}s` })}</option>
              {f.items.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          ))}
          {(filterCountry || filterManager || filterGrade || filterRating || searchTerm) && (
            <button onClick={() => { setFilterCountry(''); setFilterManager(''); setFilterGrade(''); setFilterRating(''); setSearchTerm(''); }}
              className="text-[10px] text-slate-500 hover:text-slate-700 font-bold flex items-center gap-1">
              <X className="w-3 h-3" />{t('workbench.clear_filters', { defaultValue: 'Clear' })}
            </button>
          )}
        </div>
      </div>

      {/* ═══ SCROLLABLE TABLE ═══ */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-[1600px] mx-auto">
          {guidelines.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">{t('workbench.no_guidelines_title', { defaultValue: 'No Guidelines Generated' })}</h3>
              <p className="text-slate-500 text-sm mb-6">{t('workbench.no_guidelines_subtitle', { defaultValue: 'Run "Generate Guidelines" from the Results page first.' })}</p>
              <button onClick={() => navigate(`/app/comp/scenarios/${scenarioId}/results`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors">
                <ArrowLeft className="w-4 h-4" />{t('workbench.go_to_results', { defaultValue: 'Go to Results' })}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-[10px]">
                  {t('workbench.employees', { defaultValue: 'Employees' })}
                </h3>
                <span className="text-[10px] font-black text-slate-400 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                  {totalFiltered} / {employees.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="bg-slate-50/95 backdrop-blur-md sticky top-0 z-10">
                    <tr>
                      {['ID', 'Name', 'Country', 'Grade', 'Rating', 'Total Cash', 'Compa', 'Zone', 'Guideline', 'Merit %', 'Gross', 'Consolidated', 'Lump Sum', 'New Total', 'Compa After'].map(col => (
                        <th key={col} className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200 whitespace-nowrap bg-slate-50">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedEmployees.map(emp => {
                      const serverErr = perEmpErrors[emp.id];
                      const hasError = emp.isEmpty || emp.exceedsGuideline || emp.isNegative || !!serverErr;
                      return (
                        <tr key={emp.id} data-testid={`wb-row-${emp.employee_external_id}`}
                          className={`hover:bg-slate-50/80 transition-colors ${hasError ? 'bg-red-50/30' : ''}`}>
                          <td className="px-3 py-2.5 text-xs font-mono text-slate-500 whitespace-nowrap">{emp.employee_external_id}</td>
                          <td className="px-3 py-2.5 text-xs font-bold text-slate-900 whitespace-nowrap max-w-[150px] truncate">{emp.full_name || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{emp.country_code}</td>
                          <td className="px-3 py-2.5 text-xs font-bold text-slate-500">{emp.pay_grade_internal || '—'}</td>
                          <td className="px-3 py-2.5 text-xs font-black text-slate-900">{emp.performance_rating || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-right font-black text-slate-900 whitespace-nowrap">{fmt(emp.totalCashBase)}</td>
                          <td className="px-3 py-2.5 text-xs text-center font-bold text-slate-700">{emp.compaBefore?.toFixed(3) ?? '—'}</td>
                          <td className="px-3 py-2.5 text-xs">
                            {emp.zone ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter ${ZONE_COLORS[emp.zone] ?? 'bg-slate-100'}`}>{emp.zone}</span> : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-center font-black text-blue-700">{fmtPct(emp.guidelineMaxPct)}</td>
                          {/* ═══ THE ONLY EDITABLE FIELD ═══ */}
                          <td className="px-3 py-1.5">
                            <div className="relative">
                              <input
                                data-testid={`input-merit-${emp.employee_external_id}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={emp.inputStr}
                                onChange={e => handleInputChange(emp.id, e.target.value)}
                                disabled={executionStatus === 'EXECUTED'}
                                placeholder="0.00"
                                className={`w-20 px-2 py-1.5 text-xs font-black text-right border rounded-lg outline-none transition-colors
                                  ${emp.isEmpty ? 'border-amber-300 bg-amber-50/50' :
                                    emp.exceedsGuideline || emp.isNegative ? 'border-red-400 bg-red-50/50 text-red-700' :
                                    'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}`}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">%</span>
                            </div>
                            {emp.isEmpty && !executionStatus.startsWith('EXEC') && (
                              <p className="text-[9px] text-amber-600 font-bold mt-0.5">{t('workbench.required', { defaultValue: 'Required' })}</p>
                            )}
                            {emp.exceedsGuideline && (
                              <p className="text-[9px] text-red-600 font-bold mt-0.5">{t('workbench.exceeds', { defaultValue: 'Max' })} {fmtPct(emp.guidelineMaxPct)}</p>
                            )}
                            {serverErr && (
                              <p className="text-[9px] text-red-600 font-bold mt-0.5">{serverErr.reason}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right font-bold text-green-700 whitespace-nowrap">{emp.inputPct != null ? `+${fmt(emp.grossIncrease)}` : '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-right text-slate-700 whitespace-nowrap">{emp.inputPct != null ? fmt(emp.consolidated) : '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-right whitespace-nowrap">
                            {emp.lumpSum > 0 ? <span className="text-amber-600 font-bold">{fmt(emp.lumpSum)}</span> : emp.inputPct != null ? <span className="text-slate-300">0</span> : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right font-black text-slate-900 whitespace-nowrap">{emp.inputPct != null ? fmt(emp.newTotalCash) : '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-center font-bold text-slate-700">{emp.compaAfter != null && emp.inputPct != null ? emp.compaAfter.toFixed(3) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
                <p className="text-[11px] text-slate-500 font-medium">
                  {t('merit.page_showing', { defaultValue: 'Showing' })} <span className="font-black text-slate-700">{startIdx + 1}–{Math.min(startIdx + pageSize, totalFiltered)}</span> {t('merit.page_of', { defaultValue: 'of' })} <span className="font-black text-slate-700">{totalFiltered}</span>
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('merit.page_rows_per_page', { defaultValue: 'Rows' })}</span>
                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-bold cursor-pointer">
                      {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                    <ChevronLeft className="w-3.5 h-3.5" />{t('merit.page_prev', { defaultValue: 'Prev' })}
                  </button>
                  <span className="text-[11px] font-black text-slate-700 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                    {safePage} / {totalPages}
                  </span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                    {t('merit.page_next', { defaultValue: 'Next' })}<ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutionWorkbenchPage;
