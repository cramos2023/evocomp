import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calculator, Users, TrendingUp, 
  Download, Filter, Search, Settings, RefreshCw,
  AlertCircle, AlertTriangle, List, Clock, FileCheck, Play,
  ChevronLeft, ChevronRight, FileSpreadsheet, Lock, Unlock
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { ColumnConfigModal } from '../components/scenarios/ColumnConfigModal';
import { JobStatusBadge, type FormulaJob } from '../components/scenarios/JobStatusBadge';
import { ManageColumnsModal } from '../components/scenarios/ManageColumnsModal';
import { JobHistoryModal } from '../components/scenarios/JobHistoryModal';
import { getCalculationMode, SYNC_ROW_LIMIT } from '../components/scenarios/columnsExport';
import { updateEmployeeResultsBulk } from '../utils/bulkUpdates';
import { DataQualityReportModal } from '../components/scenarios/DataQualityReportModal';
import { DuplicateRunModal } from '../components/scenarios/DuplicateRunModal';
import { CompareRunsModal } from '../components/scenarios/CompareRunsModal';
import { BudgetConfigModal } from '../components/scenarios/BudgetConfigModal';
import { formatCsvValue, buildCsv, downloadCsv } from '../utils/csv';
import type { BudgetConfig, BudgetSummary } from '../types/budget';
import { DEFAULT_BUDGET_CONFIG } from '../types/budget';
import { EmployeeDetailsDrawer } from '../components/scenarios/EmployeeDetailsDrawer';
import { downloadXlsx, triggerXlsxExport } from '../utils/xlsx';


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
  created_at: string; // Added for display in dropdown
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
  employee_external_id?: string;
  salary_base_before: number;
  salary_base_after: number;
  total_cash_before?: number;
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

  // Phase 7A.1 Guideline Matrix State
  const [guidelineMatrix, setGuidelineMatrix] = useState<any[]>([]);

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

  // Phase 6B: Multiple Runs & Compare State
  const [allRuns, setAllRuns] = useState<ScenarioRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Phase 6C: Budget Controls State
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>(DEFAULT_BUDGET_CONFIG);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Phase 6G: Initial Run State
  const [isInitialRunning, setIsInitialRunning] = useState(false);
  const [initialRunError, setInitialRunError] = useState<string | null>(null);

  // Filter and Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Phase 7A.2 Column Visibility Presets
  type ViewPreset = 'default' | 'hr_base' | 'comp_base' | 'compa' | 'inputs' | 'outputs';
  const [activePreset, setActivePreset] = useState<ViewPreset>('default');

  // Phase 7A.3 Drawer State
  const [selectedDrawerEmployee, setSelectedDrawerEmployee] = useState<EmployeeResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Phase 7A.4 Export Dropdown State
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Reset page when search or run changes
  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm, activeRunId, pageSize]);

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

  async function fetchResults(requestedRunId?: string) {
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

      // 2. Fetch all runs for the scenario
      const { data: runsData, error: runsError } = await supabase
        .from('scenario_runs')
        .select('*')
        .eq('scenario_id', id)
        .order('created_at', { ascending: false });

      if (runsError) throw runsError;

      // Fetch guideline matrix (Phase 7A.1)
      const { data: matrixData } = await supabase
        .from('scenario_guideline_matrix')
        .select('*')
        .eq('scenario_id', id);
      setGuidelineMatrix(matrixData || []);
      
      if (!runsData || runsData.length === 0) {
        setAllRuns([]);
        setLatestRun(null);
        setLoading(false);
        return;
      }

      setAllRuns(runsData);

      // Determine which run to load
      let targetRun = null;
      if (requestedRunId) {
        targetRun = runsData.find((r: ScenarioRun) => r.id === requestedRunId);
      }
      if (!targetRun && activeRunId) {
        targetRun = runsData.find((r: ScenarioRun) => r.id === activeRunId);
      }
      if (!targetRun) {
        targetRun = runsData.find((r: ScenarioRun) => r.status === 'COMPLETED') || runsData[0];
      }

      setLatestRun(targetRun);
      setActiveRunId(targetRun.id);

      // 3. Fetch dataset and columns (non-fatal — Column Config feature may not be available)
      try {
        let { data: datasetData } = await supabase
          .from('dynamic_datasets')
          .select('*')
          .eq('scenario_id', id)
          .maybeSingle();

        if (datasetData) {
          setDataset(datasetData);
          const { data: cols } = await supabase
            .from('column_definitions')
            .select('*')
            .eq('dataset_id', datasetData.id)
            .eq('is_active', true)
            .order('created_at', { ascending: true });
          setColumns(cols || []);
        } else {
          setDataset(null);
          setColumns([]);
        }
      } catch (datasetErr) {
        // Column Config feature unavailable — results page still works without dynamic columns
        console.warn('[ScenarioResultsPage] dynamic_datasets unavailable:', datasetErr);
      }

      // 4. Fetch employee results for this run

      const { data: resultsData, error: resultsError } = await supabase
        .from('scenario_employee_results')
        .select('*')
        .eq('scenario_run_id', targetRun.id)
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
    if (!latestRun) return;
    if (!dataset) {
      alert(t('pages.scenarios.recalculate_no_dataset', 'No column configuration dataset found. Please click "Config Columns" to initialize it before recalculating.'));
      return;
    }
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

  const handleInitialRun = async () => {
    if (!id) return;
    setIsInitialRunning(true);
    setInitialRunError(null);
    let errorCatcher: string = '';
    try {
      // Re-using the exact existing engine from MeritResultsPage
      const { data, error } = await supabase.functions.invoke('scenario-engine-v30-bundled', { 
        body: { scenarioId: id, action: 'run' }
      });
      
      if (error) {
        try {
          const body = await error.context.json();
          errorCatcher = `${body.error || error.message}${body.hint ? ` - ${body.hint}` : ''}`;
        } catch {
          errorCatcher = error.message || 'Run failed';
        }
        throw new Error(errorCatcher);
      }
      
      if (data?.error) throw new Error(data.error);

      // Start robust polling for the new run
      let pollCount = 0;
      const MAX_POLLS = 30; // 60 seconds maximum polling (2s * 30)
      
      const pollObj = setInterval(async () => {
        pollCount++;
        const { data: currentRuns } = await supabase
          .from('scenario_runs')
          .select('*')
          .eq('scenario_id', id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (currentRuns && currentRuns.length > 0) {
          const run = currentRuns[0];
          if (run.status === 'COMPLETED' || run.status === 'FAILED') {
            clearInterval(pollObj);
            setIsInitialRunning(false);
            if (run.status === 'FAILED') {
              setInitialRunError(t('pages.scenarios.run_failed', 'El run ha fallado en el servidor. Revisa los logs.'));
            } else {
              // Successfully generated! Reload entire page data.
              fetchResults();
            }
          }
        }

        if (pollCount >= MAX_POLLS) {
          clearInterval(pollObj);
          setIsInitialRunning(false);
          setInitialRunError(t('pages.scenarios.run_timeout', 'Tiempo de espera agotado (60s). Por favor, recarga la página o intenta nuevamente.'));
        }
      }, 2000);

    } catch (err: any) {
      setInitialRunError(err.message || 'Error invocando el engine.');
      setIsInitialRunning(false);
    }
  };

  // --- Phase 7A.1: Guideline Max Calculation ---
  const getGuidelineMaxPct = useCallback((row: EmployeeResult): number | null => {
    // 1. Check direct properties (after_json or direct column)
    if (row.after_json?.guideline_max_pct !== undefined) return Number(row.after_json.guideline_max_pct);
    if ((row as any).guideline_max_pct !== undefined) return Number((row as any).guideline_max_pct);

    // 2. Compute from matrix using rules_json structure
    if (!scenario || !guidelineMatrix.length) return null;
    const rules = (latestRun as any)?.rules_snapshot || (scenario as any).rules_json || {};

    // Map rating to bucket code
    const rawRating = row.before_json?.performance_rating || (row as any).snapshot_employee_data?.performance_rating || '';
    let bucketCode = rawRating;
    if (rules.performance_buckets && Array.isArray(rules.performance_buckets)) {
      const bucket = rules.performance_buckets.find((b: any) => b.code === rawRating || b.label === rawRating);
      if (bucket) bucketCode = bucket.code;
    }

    if (!bucketCode) return null;

    // Map compa ratio to zone key
    const compa = (row as any).compa_ratio ?? row.before_json?.compa_ratio ?? (row as any).snapshot_employee_data?.compa_ratio;
    if (compa === undefined || compa === null) return null;
    const compaNum = Number(compa);

    let zoneKey = '';
    if (rules.compa_bands && Array.isArray(rules.compa_bands)) {
      const band = rules.compa_bands.find((b: any) => 
        compaNum >= (b.min ?? -Infinity) && compaNum < (b.max ?? Infinity)
      );
      if (band) zoneKey = band.key;
    } else {
      // Legacy threshold fallback
      const t1 = rules.threshold_1 ?? 0.8;
      const t2 = rules.threshold_2 ?? 1.0;
      const t3 = rules.threshold_3 ?? 1.2;
      if (compaNum < t1) zoneKey = 'BELOW_MIN';
      else if (compaNum < t2) zoneKey = 'BELOW_MID';
      else if (compaNum < t3) zoneKey = 'ABOVE_MID';
      else zoneKey = 'ABOVE_MAX';
    }

    if (!zoneKey) return null;

    const match = guidelineMatrix.find(m => m.rating_key === bucketCode && m.zone_key === zoneKey);
    return match ? Number(match.max_pct) : null;
  }, [scenario, latestRun, guidelineMatrix]);

  const handleUpdateInput = async (resultId: string, key: string, value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
    
    let finalValue = numericValue;

    // Phase 7A.1 Validation
    if (key === 'input_merit_pct') {
      const row = results.find(r => r.id === resultId);
      if (row) {
        const maxPct = getGuidelineMaxPct(row);
        if (maxPct !== null && numericValue > maxPct) {
          const rules = (latestRun as any)?.rules_snapshot || (scenario as any)?.rules_json || {};
          const mode = rules.guidelines?.enforcement_mode || 'warn';
          
          if (mode === 'block') {
             alert(`Error: ${(numericValue * 100).toFixed(2)}% exceeds the guideline max of ${(maxPct * 100).toFixed(2)}%.`);
             setResults(prev => [...prev]); // Trigger re-render to revert input visually if it's uncontrolled
             return;
          } else if (mode === 'clamp') {
             finalValue = maxPct;
          }
        }
      }
    }
    
    // Update local state for immediate feedback
    setResults(prev => prev.map(r => {
      if (r.id === resultId) {
        return {
          ...r,
          after_json: { ...r.after_json, [key]: finalValue }
        };
      }
      return r;
    }));

    // Fetch current after_json and merge (don't overwrite other keys)
    const row = results.find(r => r.id === resultId);
    const merged = { ...(row?.after_json || {}), [key]: finalValue };

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

  // --- Phase 7B Bulk Allocation Handlers ---
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [scaleResult, setScaleResult] = useState<{ factor: number; remaining: number } | null>(null);

  const handleApplyGuidelines = async () => {
    if (!latestRun || results.length === 0) return;
    setIsApplyingBulk(true);
    setScaleResult(null);
    try {
      const updates: { id: string; after_json: any }[] = [];
      const newResults = [...results];
      let changes = 0;

      for (let i = 0; i < newResults.length; i++) {
        const row = newResults[i];
        if (row.after_json?.locked_merit) continue; // Phase 7B: skip locked rows

        const maxPct = getGuidelineMaxPct(row);
        if (maxPct !== null) {
          const currentInput = Number(row.after_json?.input_merit_pct ?? 0);
          if (currentInput !== maxPct) {
            const merged = { ...(row.after_json || {}), input_merit_pct: maxPct };
            newResults[i] = { ...row, after_json: merged };
            updates.push({ id: row.id, after_json: merged });
            changes++;
          }
        }
      }

      if (changes > 0) {
        setResults(newResults);
        await updateEmployeeResultsBulk(updates);
      }
    } catch (err) {
      console.error('Error applying guidelines:', err);
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleScaleToBudget = async () => {
    if (!latestRun || results.length === 0 || budgetSummary.cap <= 0) return;
    setIsApplyingBulk(true);
    
    try {
      // 1. Calculate budget_if_all_current_inputs for unlocked rows
      // Aproximación usada: base_salary_local * input_merit_pct
      let lockedSpent = 0;
      let totalIncrement = 0;

      for (const r of results) {
        const aj = r.after_json || {};
        const isLocked = aj.locked_merit;
        const inc = (aj.calc_total_increase_local ?? aj.calc_merit_increase_amount_local ?? 0) as number;
        const lump = (aj.input_lump_sum_local ?? 0) as number;
        
        if (isLocked) {
          lockedSpent += inc + lump;
        } else {
           const snap = (r as any).snapshot_employee_data || {};
           const baseLocal = Number(snap.base_salary_local ?? r.salary_base_before ?? 0);
           const inputMerit = Number(aj.input_merit_pct ?? 0);
           totalIncrement += baseLocal * inputMerit;
        }
      }

      const availableForUnlocked = Math.max(0, budgetSummary.cap - lockedSpent);
      const scaleFactor = totalIncrement > 0 ? availableForUnlocked / totalIncrement : 1;
      const finalScale = scaleFactor > 1 ? 1 : scaleFactor;

      const updates: { id: string; after_json: any }[] = [];
      const newResults = [...results];
      let changes = 0;

      for (let i = 0; i < newResults.length; i++) {
        const row = newResults[i];
        if (row.after_json?.locked_merit) continue;

        const currentInput = Number(row.after_json?.input_merit_pct ?? 0);
        if (currentInput > 0 && finalScale !== 1) {
          const maxPct = getGuidelineMaxPct(row);
          let scaled = currentInput * finalScale;
          if (maxPct !== null && scaled > maxPct) scaled = maxPct; // never exceed guideline max even if scaling

          const merged = { ...(row.after_json || {}), input_merit_pct: scaled };
          newResults[i] = { ...row, after_json: merged };
          updates.push({ id: row.id, after_json: merged });
          changes++;
        }
      }

      if (changes > 0) {
        setResults(newResults);
        await updateEmployeeResultsBulk(updates);
      }

      setScaleResult({ factor: finalScale, remaining: availableForUnlocked - (totalIncrement * finalScale) });

    } catch (err) {
      console.error('Error scaling to budget:', err);
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleToggleLock = async (resultId: string) => {
    const row = results.find(r => r.id === resultId);
    if (!row) return;

    const currentLocked = row.after_json?.locked_merit === true;
    const merged = { ...(row.after_json || {}), locked_merit: !currentLocked };

    setResults(prev => prev.map(r => r.id === resultId ? { ...r, after_json: merged } : r));
    await supabase.from('scenario_employee_results').update({ after_json: merged }).eq('id', resultId);
  };

  const getInputWarning = (row: EmployeeResult, key: string, value: number): string | null => {
    const rule = INPUT_VALIDATION_RULES[key];
    if (rule && (value < rule.min || value > rule.max)) return `Out of range (expected ${rule.label})`;
    
    // Phase 7A.1 Warning
    if (key === 'input_merit_pct') {
      const maxPct = getGuidelineMaxPct(row);
      if (maxPct !== null && value > maxPct) {
        const rules = (latestRun as any)?.rules_snapshot || (scenario as any)?.rules_json || {};
        const mode = rules.guidelines?.enforcement_mode || 'warn';
        if (mode === 'warn') {
           return `Exceeds guideline max (${(maxPct * 100).toFixed(2)}%)`;
        }
      }
    }
    
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

  // --- Phase 7B.1: Column Layout Metadata ---
  const COLUMN_LAYOUT: Record<string, { minWidth: number; maxWidth?: number; truncate?: boolean }> = {
    full_name: { minWidth: 220, maxWidth: 320, truncate: true },
    manager_name: { minWidth: 200, maxWidth: 300, truncate: true },
    job_title: { minWidth: 260, maxWidth: 420, truncate: true },
    country_code: { minWidth: 90 },
    org_unit_name: { minWidth: 140, truncate: true },
    pay_grade_internal: { minWidth: 90 },
    career_level: { minWidth: 140 },
    job_family: { minWidth: 160, truncate: true },
    employee_status: { minWidth: 100 },
    employment_type: { minWidth: 120 },
    // Numeric currency columns
    base_salary_local: { minWidth: 140 },
    target_cash_local: { minWidth: 140 },
    total_guaranteed_local: { minWidth: 140 },
    annual_variable_target_local: { minWidth: 140 },
    annual_guaranteed_cash_target_local: { minWidth: 140 },
    calc_new_base_salary_local: { minWidth: 140 },
    // Percent columns
    compa_ratio: { minWidth: 110 },
    compa_after: { minWidth: 110 },
    guideline_max_pct: { minWidth: 110 },
    input_merit_pct: { minWidth: 110 },
    input_promotion_pct: { minWidth: 110 },
    input_lump_sum_local: { minWidth: 140 }, // numeric
    performance_rating: { minWidth: 100 },
    compa_band: { minWidth: 140 },
    lock: { minWidth: 60 },
    flags: { minWidth: 120 }
  };

  const getColumnStyles = (key: string) => {
    const layout = COLUMN_LAYOUT[key];
    if (!layout) return {};
    const width = layout.maxWidth || layout.minWidth;
    return {
      minWidth: `${layout.minWidth}px`,
      width: `${width}px`,
      maxWidth: layout.maxWidth ? `${layout.maxWidth}px` : undefined
    };
  };

  const renderCell = (content: any, columnKey: string) => {
    const layout = COLUMN_LAYOUT[columnKey];
    if (layout?.truncate) {
      return (
        <div className="truncate" title={String(content || '')}>
          {content ?? <span className="text-slate-300">—</span>}
        </div>
      );
    }
    return content ?? <span className="text-slate-300">—</span>;
  };

  const visibleBaseCols = useMemo(() => {
    if (results.length === 0) return [];
    
    // Check first 50 rows (or fewer if dataset is smaller) for base fields
    const sampleSize = Math.min(50, results.length);
    const sample = results.slice(0, sampleSize);
    
    return OPTIONAL_BASE_COLS.filter(bc => {
      let missingCount = 0;
      
      for (const r of sample) {
        // 1. Check dedicated column if it matches a top-level DB column name
        const dbColMap: Record<string, keyof EmployeeResult> = {
          'base_salary_local': 'salary_base_before', // Closest match, but ideally read exact if exists
          'target_cash_local': 'total_cash_before'
        };
        const dbCol = dbColMap[bc.key];
        
        let hasValue = false;
        
        if (dbCol && r[dbCol] !== undefined && r[dbCol] !== null) {
          hasValue = true;
        } else if (r.before_json && r.before_json[bc.key] !== undefined && r.before_json[bc.key] !== null) {
          // 2. Check before_json
          hasValue = true;
        }
        
        if (!hasValue) missingCount++;
      }
      
      // Keep field visible ONLY if > 90% of the sample HAS the value (missing <= 10%)
      const missingPct = missingCount / sampleSize;
      return missingPct <= 0.1;
    });
  }, [results]);

  // Active calc columns (non-input, with formula)
  const calcColumns = useMemo(() => columns.filter(c => c.formula_dsl && c.is_active), [columns]);

  // Active input columns from column_definitions (for display labels)
  const inputColDefs = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of columns) { if (!c.formula_dsl && c.is_active) map.set(c.column_key, c); }
    return map;
  }, [columns]);

  // --- Phase 7A.2: Column Groups & Visibility ---
  const presetIncludes = (preset: ViewPreset, group: string) => {
    if (group === 'A') return true; // Identity always visible
    if (preset === 'default') return ['E', 'F'].includes(group); // Default: Identity + Guideline + Inputs
    if (preset === 'hr_base') return ['B'].includes(group);
    if (preset === 'comp_base') return ['C'].includes(group);
    if (preset === 'compa') return ['D'].includes(group);
    if (preset === 'inputs') return ['F'].includes(group);
    if (preset === 'outputs') return ['G'].includes(group);
    return false;
  };

  // Safe getter for any base/json attribute without breaking type safety
  const getAnyAttr = useCallback((row: EmployeeResult, key: string): any => {
    // 1. Direct DB column on EmployeeResult
    const dbColMap: Record<string, keyof EmployeeResult> = {
      'base_salary_local': 'salary_base_before',
      'target_cash_local': 'total_cash_before'
    };
    const mapped = dbColMap[key];
    if (mapped && row[mapped] !== undefined && row[mapped] !== null) return row[mapped];
    if ((row as any)[key] !== undefined && (row as any)[key] !== null) return (row as any)[key];
    
    // 2. before_json
    if (row.before_json && row.before_json[key] !== undefined && row.before_json[key] !== null) return row.before_json[key];
    
    // 3. after_json
    if (row.after_json && row.after_json[key] !== undefined && row.after_json[key] !== null) return row.after_json[key];

    // 4. snapshot fallback (avoid if possible, but safe)
    const snap = (row as any).snapshot_employee_data;
    if (snap && snap[key] !== undefined && snap[key] !== null) return snap[key];

    return null;
  }, []);

  const filteredResults = useMemo(() => {
    if (!searchTerm) return results;
    return results.filter(r => 
      (r.after_json?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.employee_external_id || r.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [results, searchTerm]);

  const { pagedResults, total, totalPages, start, end } = useMemo(() => {
    const total = filteredResults.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = pageIndex * pageSize;
    const end = Math.min(start + pageSize, total);
    const pagedResults = filteredResults.slice(start, end);
    return { pagedResults, total, totalPages, start, end };
  }, [filteredResults, pageIndex, pageSize]);

  // --- CSV Export ---
  const handleExportCsv = useCallback((mode: 'current' | 'full' = 'current') => {
    if (!latestRun || results.length === 0) return;
    setIsExporting(true);
    setIsExportDropdownOpen(false);

    try {
      const scenarioRules = (latestRun as any)?.rules_snapshot || (scenario as any)?.rules_json || {};

      // 1. Define Column Groups A-G as specified in "Tabla Ideal"
      const columnsManifest: { group: string; key: string; label: string; type: 'text' | 'number' | 'currency' | 'pct' }[] = [
        // A: Identity
        { group: 'A', key: 'employee_external_id', label: 'Employee ID', type: 'text' },
        { group: 'A', key: 'full_name', label: 'Full Name', type: 'text' },
        { group: 'A', key: 'employee_status', label: 'Status', type: 'text' },
        { group: 'A', key: 'country_code', label: 'Country', type: 'text' },
        { group: 'A', key: 'org_unit_name', label: 'Org Unit', type: 'text' },
        { group: 'A', key: 'manager_name', label: 'Manager', type: 'text' },

        // B: HR Base
        { group: 'B', key: 'job_title', label: 'Job Title', type: 'text' },
        { group: 'B', key: 'position_code', label: 'Position Code', type: 'text' },
        { group: 'B', key: 'pay_grade_internal', label: 'Pay Grade', type: 'text' },
        { group: 'B', key: 'career_level', label: 'Career Level', type: 'text' },
        { group: 'B', key: 'job_family', label: 'Job Family', type: 'text' },
        { group: 'B', key: 'employment_type', label: 'Emp Type', type: 'text' },

        // C: Comp Base
        { group: 'C', key: 'base_salary_local', label: 'Base Salary (Local)', type: 'currency' },
        { group: 'C', key: 'annual_variable_target_local', label: 'Annual Var Target (Local)', type: 'currency' },
        { group: 'C', key: 'annual_guaranteed_cash_target_local', label: 'Annual Guar Target (Local)', type: 'currency' },
        { group: 'C', key: 'target_cash_local', label: 'Target Cash (Local)', type: 'currency' },
        { group: 'C', key: 'total_guaranteed_local', label: 'Total Guar (Local)', type: 'currency' },
        { group: 'C', key: 'market_reference_value_local', label: 'Market Ref (Local)', type: 'currency' },

        // D: Competitiveness
        { group: 'D', key: 'compa_ratio_before', label: 'Compa Before', type: 'pct' },
        { group: 'D', key: 'compa_band', label: 'Compa Band', type: 'text' },
        { group: 'D', key: 'compa_ratio_after', label: 'Compa After', type: 'pct' },

        // E: Guidelines
        { group: 'E', key: 'performance_rating', label: 'Rating', type: 'text' },
        { group: 'E', key: 'guideline_max_pct', label: 'Guideline Max %', type: 'pct' },
        { group: 'E', key: 'enforcement_mode', label: 'Enforcement', type: 'text' },

        // F: Inputs (Dynamic)
        ...EDITABLE_INPUTS.map(ik => {
          const def = inputColDefs.get(ik);
          return { group: 'F', key: ik, label: def?.label || ik, type: 'number' as const };
        }),

        // G: Outputs (Dynamic)
        ...calcColumns.map(c => ({
          group: 'G', key: c.column_key, label: c.label, type: 'number' as const
        }))
      ];

      // 2. Filter columns according to mode
      let activeCols = columnsManifest;
      if (mode === 'current') {
        activeCols = columnsManifest.filter(c => presetIncludes(activePreset, c.group));
      }

      // 3. Build rows using filteredResults (all pages, matching search)
      const headers = activeCols.map(c => c.label);
      const rows = filteredResults.map(res => {
        return activeCols.map(col => {
          let raw: any;

          // Special sourcing for derived/mapped fields
          if (col.key === 'compa_band') {
            const cr = Number(getAnyAttr(res, 'compa_ratio') ?? 0);
            if (cr <= 0) return '—';
            if (scenarioRules.compa_bands?.[0]) {
              const b = scenarioRules.compa_bands.find((b: any) => cr >= (b.min ?? -Infinity) && cr < (b.max ?? Infinity));
              raw = b?.label || b?.key || '—';
            } else {
              const t1 = scenarioRules.threshold_1 ?? 0.8;
              const t2 = scenarioRules.threshold_2 ?? 1.0;
              const t3 = scenarioRules.threshold_3 ?? 1.2;
              if (cr < t1) raw = 'Below Min';
              else if (cr < t2) raw = 'Below Mid';
              else if (cr < t3) raw = 'Above Mid';
              else raw = 'Above Max';
            }
          } else if (col.key === 'compa_ratio_after') {
            const bAfter = Number(getAnyAttr(res, 'calc_new_base_salary_local'));
            const mRef = Number(getAnyAttr(res, 'market_reference_value_local') ?? getAnyAttr(res, 'market_reference_amount_local'));
            raw = (bAfter > 0 && mRef > 0) ? (bAfter / mRef) : null;
          } else if (col.key === 'compa_ratio_before') {
            raw = getAnyAttr(res, 'compa_ratio');
          } else if (col.key === 'enforcement_mode') {
            raw = scenarioRules.guidelines?.enforcement_mode || 'warn';
          } else if (col.key === 'guideline_max_pct') {
            raw = getGuidelineMaxPct(res);
          } else {
            raw = getAnyAttr(res, col.key);
          }

          if (col.type === 'text') return raw != null ? String(raw) : '';
          return formatCsvValue(raw, col.type);
        });
      });

      // 4. Filename & Download
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const modeSuffix = mode === 'full' ? 'FULL' : activePreset.toUpperCase();
      const filename = `evocomp_scenario_${id}_run_${latestRun.id.substring(0, 8)}_${modeSuffix}_${ts}.csv`;

      const csv = buildCsv(headers, rows);
      downloadCsv(csv, filename);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [results, filteredResults, latestRun, id, activePreset, inputColDefs, calcColumns, getGuidelineMaxPct, getAnyAttr]);

  const handleExportXlsx = useCallback(async (mode: 'current' | 'full' = 'current') => {
    if (!latestRun || results.length === 0) return;
    setIsExporting(true);
    setIsExportDropdownOpen(false);

    try {
      // 1. Identify visible columns if mode is 'current'
      let visible_keys: string[] = [];
      if (mode === 'current') {
        const columnsManifest = [
          // A: Identity
          'employee_external_id', 'full_name', 'employee_status', 'country_code', 'org_unit_name', 'manager_name',
          // B: HR Base
          'job_title', 'position_code', 'pay_grade_internal', 'career_level', 'job_family', 'employment_type',
          // C: Comp Base
          'base_salary_local', 'annual_variable_target_local', 'annual_guaranteed_cash_target_local', 'target_cash_local', 'total_guaranteed_local', 'market_reference_value_local',
          // D: Competitiveness
          'compa_ratio_before', 'compa_band', 'compa_ratio_after',
          // E: Guidelines
          'performance_rating', 'guideline_max_pct', 'enforcement_mode',
          // F: Inputs
          ...EDITABLE_INPUTS,
          // G: Outputs
          ...calcColumns.map(c => c.column_key)
        ];

        // Mapping groups for presetIncludes
        const groupMap: Record<string, string> = {
          'employee_external_id': 'A', 'full_name': 'A', 'employee_status': 'A', 'country_code': 'A', 'org_unit_name': 'A', 'manager_name': 'A',
          'job_title': 'B', 'position_code': 'B', 'pay_grade_internal': 'B', 'career_level': 'B', 'job_family': 'B', 'employment_type': 'B',
          'base_salary_local': 'C', 'annual_variable_target_local': 'C', 'annual_guaranteed_cash_target_local': 'C', 'target_cash_local': 'C', 'total_guaranteed_local': 'C', 'market_reference_value_local': 'C',
          'compa_ratio_before': 'D', 'compa_band': 'D', 'compa_ratio_after': 'D',
          'performance_rating': 'E', 'guideline_max_pct': 'E', 'enforcement_mode': 'E',
          'input_merit_pct': 'F', 'input_lump_sum_local': 'F', 'input_promotion_pct': 'F'
        };

        visible_keys = columnsManifest.filter(k => {
          const group = groupMap[k] || (calcColumns.some(c => c.column_key === k) ? 'G' : 'A');
          return presetIncludes(activePreset, group);
        });
      }

      // 2. Invoke Edge Function
      await triggerXlsxExport('export-scenario-xlsx', {
        scenario_run_id: latestRun.id,
        mode,
        preset: activePreset,
        visible_column_keys: visible_keys
      }, supabase);

    } catch (err: any) {
      console.error('XLSX export failed:', err);
      alert('Error exporting XLSX: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  }, [latestRun, results, activePreset, calcColumns, id]);



  const qualityStats = latestRun?.quality_report || { missing_fx: 0, missing_pay_band: 0, missing_rating: 0 };
  const hasIssues = qualityStats.missing_fx > 0 || qualityStats.missing_pay_band > 0 || qualityStats.missing_rating > 0;


  // --- Phase 6C: Budget Computation (reactive) ---
  const budgetSummary: BudgetSummary = useMemo(() => {
    // Compute spent per employee
    let totalSpent = 0;
    for (const r of results) {
      const aj = r.after_json || {};
      const inc = (aj.calc_total_increase_local ?? aj.calc_merit_increase_amount_local ?? 0) as number;
      const lump = (aj.input_lump_sum_local ?? 0) as number;
      totalSpent += inc + lump;
    }

    // Compute base total for % mode (total_guaranteed_local > target_cash_local > base_salary_local)
    let baseTotal = 0;
    let baseMissing = false;
    for (const r of results) {
      const snap = (r as any).snapshot_employee_data || {};
      const val = snap.total_guaranteed_local ?? snap.target_cash_local ?? snap.base_salary_local ?? r.salary_base_before;
      if (val != null) {
        baseTotal += Number(val);
      } else {
        baseMissing = true;
      }
    }

    // Compute cap
    let cap = 0;
    if (budgetConfig.mode === 'percent') {
      cap = baseTotal * budgetConfig.percent_cap;
    } else {
      cap = budgetConfig.fixed_cap_local;
    }

    const remaining = cap - totalSpent;
    const pctUsed = cap > 0 ? totalSpent / cap : 0;

    return {
      spent: totalSpent,
      cap,
      remaining,
      pctUsed,
      isOverBudget: totalSpent > cap && cap > 0,
      baseTotal,
      baseMissing,
    };
  }, [results, budgetConfig]);

  // Top 10 employees by spent (for row highlight when over budget)
  const overBudgetHighlightIds = useMemo(() => {
    if (!budgetSummary.isOverBudget) return new Set<string>();
    const spentByEmp = results.map(r => {
      const aj = r.after_json || {};
      const inc = (aj.calc_total_increase_local ?? aj.calc_merit_increase_amount_local ?? 0) as number;
      const lump = (aj.input_lump_sum_local ?? 0) as number;
      return { id: r.id, spent: inc + lump };
    }).sort((a, b) => b.spent - a.spent).slice(0, 10);
    return new Set(spentByEmp.map(s => s.id));
  }, [results, budgetSummary.isOverBudget]);

  // Load budget config from run's rules_snapshot
  useEffect(() => {
    if (latestRun) {
      const rs = (latestRun as any).rules_snapshot;
      if (rs?.budget_config) {
        setBudgetConfig(rs.budget_config);
      } else {
        // Try localStorage fallback
        const stored = localStorage.getItem(`evocomp_budget_cap_${id}_${latestRun.id}`);
        if (stored) {
          try { setBudgetConfig(JSON.parse(stored)); } catch { /* ignore */ }
        } else {
          setBudgetConfig(DEFAULT_BUDGET_CONFIG);
        }
      }
    }
  }, [latestRun, id]);

  // Save budget config
  const handleSaveBudgetConfig = async (newConfig: BudgetConfig) => {
    setIsSavingBudget(true);
    try {
      setBudgetConfig(newConfig);

      // Persist to rules_snapshot.budget_config on scenario_runs
      const currentRs = (latestRun as any)?.rules_snapshot || {};
      const updatedRs = { ...currentRs, budget_config: newConfig };

      const { error: updateErr } = await supabase
        .from('scenario_runs')
        .update({ rules_snapshot: updatedRs })
        .eq('id', activeRunId);

      if (updateErr) {
        console.warn('Failed to persist budget to DB, falling back to localStorage:', updateErr);
        localStorage.setItem(`evocomp_budget_cap_${id}_${activeRunId}`, JSON.stringify(newConfig));
      }

      setIsBudgetModalOpen(false);
    } catch (err) {
      console.error('Budget save error:', err);
      // localStorage fallback
      localStorage.setItem(`evocomp_budget_cap_${id}_${activeRunId}`, JSON.stringify(newConfig));
      setIsBudgetModalOpen(false);
    } finally {
      setIsSavingBudget(false);
    }
  };

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
          {t('common.back', 'Back')}
        </button>
      </div>
    );
  }

  // Phase 6G Empty State
  if (!loading && allRuns.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-xl p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500"></div>
          
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm border border-indigo-100 transform -rotate-6">
            <Calculator className="w-12 h-12" />
          </div>
          
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
            {t('pages.scenarios.ready_to_run', 'Ready to Run')}
          </h2>
          
          <p className="text-slate-500 mb-10 font-medium leading-relaxed text-lg">
            {t('pages.scenarios.empty_run_desc', 'This scenario has no runs yet. Click below to generate the first run and start your analysis.')}
          </p>
          
          {initialRunError && (
            <div className="mb-10 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-start gap-3 text-left w-full shadow-sm animate-in slide-in-from-top-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-bold text-sm uppercase tracking-wider mb-1 text-red-800">{t('common.error', 'Error')}</p>
                <p className="text-sm font-medium">{initialRunError}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <button 
              type="button"
              onClick={handleInitialRun}
              disabled={isInitialRunning}
              className={`py-5 px-8 text-lg font-black tracking-wide shadow-lg flex items-center justify-center gap-3 w-full shrink-0 transition-all rounded-2xl
                ${isInitialRunning 
                  ? 'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 hover:shadow-indigo-500/25'}`}
            >
              {isInitialRunning ? (
                <>
                  <div className="w-5 h-5 border-[3px] border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                  {t('common.running', 'Running...')}
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current" />
                  {t('pages.scenarios.run_scenario', 'Run Scenario')}
                </>
              )}
            </button>
            
            <button 
              type="button"
              onClick={() => navigate('/app/comp/scenarios')}
              className="text-slate-500 font-bold hover:text-slate-900 transition-colors py-3"
            >
              &larr; {t('common.back_to_scenarios', 'Back to Scenarios')}
            </button>
          </div>
        </div>
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
          <p className="text-sm text-slate-500">
            {t('pages.scenarios.results_for_run')} 
            <select 
              className="ml-2 bg-transparent border-b border-dashed border-slate-300 text-slate-700 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
              value={activeRunId || ''}
              onChange={(e) => fetchResults(e.target.value)}
            >
              {allRuns.map(r => (
                <option key={r.id} value={r.id}>
                  {r.status} — {r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'}
                </option>
              ))}
            </select>
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <button
            type="button"
            onClick={() => setIsBudgetModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
              budgetSummary.isOverBudget
                ? 'bg-red-50 border-2 border-red-300 text-red-700 hover:bg-red-100'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            💰 Budget
          </button>
          <button 
            type="button" 
            onClick={() => setIsCompareOpen(true)}
            disabled={allRuns.length < 2 || results.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            Compare Runs
          </button>
          <button 
            type="button" 
            onClick={() => setIsDuplicateOpen(true)}
            disabled={results.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            Duplicate Run
          </button>
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
          <button 
            type="button" 
            onClick={handleApplyGuidelines}
            disabled={isApplyingBulk || results.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all shadow-sm disabled:opacity-50"
          >
            {isApplyingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Apply Guidelines
          </button>
          <button 
            type="button" 
            onClick={handleScaleToBudget}
            disabled={isApplyingBulk || results.length === 0 || budgetSummary.cap <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all shadow-sm disabled:opacity-50"
          >
            {isApplyingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Scale to Budget
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
          <div className="relative" ref={exportRef}>
            <button 
              type="button" 
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={isExporting || results.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
              {isExporting ? 'Exporting…' : t('common.export')}
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExportDropdownOpen ? 'rotate-90' : ''}`} />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-[60] py-2 animate-in slide-in-from-top-2 duration-200">
                <button
                  type="button"
                  onClick={() => handleExportCsv('current')}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="font-bold text-slate-800">Current View</p>
                    <p className="text-[10px] text-slate-400 capitalize">{activePreset} preset columns</p>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500" />
                </button>
                <div className="h-px bg-slate-100 my-1 mx-2" />
                <button
                  type="button"
                  onClick={() => handleExportCsv('full')}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="font-bold text-slate-800">Export Full CSV</p>
                    <p className="text-[10px] text-slate-400">All data groups (A–G)</p>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500" />
                </button>
                <div className="h-px bg-slate-100 my-1 mx-2" />
                <button
                  type="button"
                  onClick={() => handleExportXlsx('current')}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="font-bold text-slate-800">Export XLSX (Current)</p>
                    <p className="text-[10px] text-slate-400">Formatted Excel - {activePreset}</p>
                  </div>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500" />
                </button>
                <button
                  type="button"
                  onClick={() => handleExportXlsx('full')}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="font-bold text-slate-800">Export XLSX (Full)</p>
                    <p className="text-[10px] text-slate-400">Formatted Excel - All data</p>
                  </div>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phase 6C: Budget Summary Bar */}
      {budgetSummary.cap > 0 && results.length > 0 && (
        <div className={`mb-4 flex items-center gap-6 px-5 py-3 rounded-2xl border text-sm ${
          budgetSummary.isOverBudget
            ? 'bg-red-50 border-red-200'
            : 'bg-emerald-50/50 border-emerald-200'
        }`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Spent</span>
            <p className="font-bold text-slate-900">${budgetSummary.spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="text-slate-300">/</div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cap</span>
            <p className="font-bold text-slate-900">${budgetSummary.cap.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="text-slate-300">/</div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remaining</span>
            <p className={`font-bold ${budgetSummary.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              ${budgetSummary.remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${budgetSummary.isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(budgetSummary.pctUsed * 100, 100)}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${budgetSummary.isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
              {(budgetSummary.pctUsed * 100).toFixed(1)}%
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              budgetSummary.isOverBudget
                ? 'bg-red-100 text-red-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {budgetSummary.isOverBudget ? 'OVER' : 'OK'}
            </span>
          </div>
          {budgetSummary.baseMissing && (
            <span className="text-[10px] text-amber-600 font-bold">⚠ Budget may be incomplete (missing base fields)</span>
          )}
        </div>
      )}

      {/* Phase 6C: Over Budget Banner */}
      {budgetSummary.isOverBudget && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <strong>Over budget by ${Math.abs(budgetSummary.remaining).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
            <span className="text-red-600 ml-2">— Top 10 highest-cost employees are highlighted below.</span>
          </div>
        </div>
      )}

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

      {/* Phase 7B: Scale Result Banner */}
      {scaleResult && (
        <div className="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              <strong>Scaled to Budget:</strong> Applied a factor of {(scaleResult.factor * 100).toFixed(2)}% to unlocked rows. 
              {scaleResult.factor === 1 ? ' Current allocations already fit within budget.' : ' Allocations were proportionally reduced to fit cap.'}
            </span>
          </div>
          <button onClick={() => setScaleResult(null)} className="text-indigo-400 hover:text-indigo-600 font-bold px-2 py-1 text-xs transition-colors">Dismiss</button>
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
          <p className="text-3xl font-bold text-slate-900">{results.length}</p>
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

      {!dataset ? (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100 shadow-sm">
            <Settings className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
            Column Configuration Not Initialized
          </h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
            This scenario or run has not been configured yet. Initialize the column configuration to generate preset formulas, map data, and begin modeling your compensation adjustments.
          </p>
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 active:scale-95 font-bold rounded-xl text-sm tracking-wide"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            Config Columns &rarr; Initialize
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-900">{t('pages.scenarios.employee_details', 'Employee Details')}</h2>
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
          
          {/* Phase 7A.2 Presets Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">View:</span>
            {[
              { id: 'default', label: 'Default' },
              { id: 'hr_base', label: 'HR Base' },
              { id: 'comp_base', label: 'Comp Base' },
              { id: 'compa', label: 'Competitiveness' },
              { id: 'inputs', label: 'Inputs' },
              { id: 'outputs', label: 'Outputs' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setActivePreset(preset.id as ViewPreset)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                  activePreset === preset.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {/* GROUP A: Identity (Sticky) */}
                <th 
                  className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest sticky left-0 z-40 bg-slate-50 whitespace-nowrap shadow-[1px_0_0_rgba(226,232,240,1)]"
                  style={getColumnStyles('full_name')}
                >
                  {t('common.employee')}
                </th>
                
                {presetIncludes(activePreset, 'A') && (
                  <>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('employee_status')}>Status</th>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('country_code')}>Country</th>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('org_unit_name')}>Org Unit</th>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('manager_name')}>Manager</th>
                  </>
                )}

                {/* GROUP B: HR Base */}
                {presetIncludes(activePreset, 'B') && (
                  <>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('job_title')}>Job Title</th>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('pay_grade_internal')}>Pay Grade</th>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('career_level')}>Career Level</th>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('job_family')}>Job Family</th>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('employment_type')}>Emp Type</th>
                  </>
                )}

                {/* GROUP C: Comp Base */}
                {presetIncludes(activePreset, 'C') && (
                  <>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right whitespace-nowrap bg-slate-50" style={getColumnStyles('base_salary_local')}>Base Local</th>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right whitespace-nowrap bg-slate-50" style={getColumnStyles('target_cash_local')}>Target Cash</th>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right whitespace-nowrap bg-slate-50" style={getColumnStyles('total_guaranteed_local')}>Total Guar.</th>
                  </>
                )}

                {/* GROUP D: Compa */}
                {(presetIncludes(activePreset, 'D') || activePreset === 'default') && (
                  <>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right whitespace-nowrap bg-slate-50" style={getColumnStyles('compa_ratio')}>Compa Before</th>
                  </>
                )}
                {presetIncludes(activePreset, 'D') && (
                  <>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('compa_band')}>Compa Band</th>
                  </>
                )}

                {/* GROUP E: Guideline (Rules) */}
                {(presetIncludes(activePreset, 'E') || activePreset === 'default') && (
                  <>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap bg-slate-50" style={getColumnStyles('performance_rating')}>{t('pages.scenarios.rating')}</th>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right whitespace-nowrap bg-slate-50" style={getColumnStyles('guideline_max_pct')}>Max Allowed %</th>
                  </>
                )}

                {/* GROUP F: Inputs */}
                {presetIncludes(activePreset, 'F') && (
                  <>
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-center whitespace-nowrap bg-slate-50" style={getColumnStyles('lock')}>Lock</th>
                    {EDITABLE_INPUTS.map(ik => {
                      const def = inputColDefs.get(ik);
                      return (
                        <th key={ik} className="px-4 py-4 text-[10px] uppercase font-bold text-emerald-600 tracking-widest text-right whitespace-nowrap bg-slate-50" style={getColumnStyles(ik)}>
                          {def?.label || ik}
                        </th>
                      );
                    })}
                  </>
                )}

                {/* GROUP G: Outputs */}
                {(presetIncludes(activePreset, 'G') || activePreset === 'default') && (
                  <th className="px-4 py-4 text-[10px] uppercase font-bold text-blue-500 tracking-widest text-right whitespace-nowrap bg-slate-50" style={getColumnStyles('calc_new_base_salary_local')}>
                    New Base Local
                  </th>
                )}
                {presetIncludes(activePreset, 'G') && (
                  <>
                    {calcColumns.filter(c => c.column_key !== 'calc_new_base_salary_local').map(col => (
                      <th key={col.id} className="px-4 py-4 text-[10px] uppercase font-bold text-blue-500 tracking-widest text-right whitespace-nowrap bg-slate-50" style={getColumnStyles(col.column_key)}>
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-[10px] uppercase font-bold text-purple-600 tracking-widest text-right whitespace-nowrap bg-slate-50" style={getColumnStyles('compa_after')}>
                      Compa After
                    </th>
                  </>
                )}

                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest sticky right-0 bg-slate-50 shadow-[-1px_0_0_rgba(226,232,240,1)] z-20" style={getColumnStyles('flags')}>{t('pages.scenarios.flags')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pagedResults.map((res) => {
                const rating = getAnyAttr(res, 'performance_rating') || '?';
                const compaBeforeNum = Number(getAnyAttr(res, 'compa_ratio') ?? 0);
                
                // Helper to render simple text column
                const renderCol = (key: string) => (
                  <td 
                    className="px-4 py-4 text-sm text-slate-600" 
                    style={getColumnStyles(key)}
                  >
                    {renderCell(getAnyAttr(res, key), key)}
                  </td>
                );
                
                // Helper to render currency column
                const renderMoneyCol = (key: string, isCalc = false) => {
                  const val = getAnyAttr(res, key);
                  return (
                    <td 
                      className={`px-4 py-4 text-sm text-right font-mono ${isCalc ? 'font-bold text-blue-600' : 'text-slate-600'}`}
                      style={getColumnStyles(key)}
                    >
                      {val != null ? `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : <span className="text-slate-300">—</span>}
                    </td>
                  );
                };

                return (
                <tr 
                  key={res.id} 
                  onClick={() => {
                    setSelectedDrawerEmployee(res);
                    setIsDrawerOpen(true);
                  }}
                  className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                    overBudgetHighlightIds.has(res.id) ? 'ring-2 ring-inset ring-red-200 bg-red-50/30' : ''
                  }`}
                >
                  {/* GROUP A: Identity (Sticky) */}
                  <td 
                    className="px-6 py-4 sticky left-0 z-30 bg-white shadow-[1px_0_0_rgba(241,245,249,1)]"
                    style={getColumnStyles('full_name')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 shrink-0 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {String(getAnyAttr(res, 'full_name') || getAnyAttr(res, 'employee_external_id') || res.employee_id || 'N/A').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate" title={getAnyAttr(res, 'full_name')}>
                            {getAnyAttr(res, 'full_name') || 'N/A'}
                          </p>
                          {res.flags_json?.includes('MISSING_FX') && <AlertTriangle className="w-3 h-3 shrink-0 text-amber-500" />}
                          {res.flags_json?.includes('NO_PAY_BAND') && <AlertCircle className="w-3 h-3 shrink-0 text-red-500" />}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase truncate">
                          {(getAnyAttr(res, 'employee_external_id') || res.employee_id || 'UNKNOWN').substring(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {presetIncludes(activePreset, 'A') && (
                    <>
                      <td className="px-4 py-4" style={getColumnStyles('employee_status')}>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                           {getAnyAttr(res, 'employee_status') || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 font-mono uppercase" style={getColumnStyles('country_code')}>
                        {getAnyAttr(res, 'country_code') ?? '—'}
                      </td>
                      {renderCol('org_unit_name')}
                      {renderCol('manager_name')}
                    </>
                  )}

                  {/* GROUP B: HR Base */}
                  {presetIncludes(activePreset, 'B') && (
                    <>
                      {renderCol('job_title')}
                      {renderCol('pay_grade_internal')}
                      {renderCol('career_level')}
                      {renderCol('job_family')}
                      {renderCol('employment_type')}
                    </>
                  )}

                  {/* GROUP C: Comp Base */}
                  {presetIncludes(activePreset, 'C') && (
                    <>
                      {renderMoneyCol('base_salary_local')}
                      {renderMoneyCol('target_cash_local')}
                      {renderMoneyCol('total_guaranteed_local')}
                    </>
                  )}

                  {/* GROUP D: Compa */}
                  {(presetIncludes(activePreset, 'D') || activePreset === 'default') && (
                    <td className="px-4 py-4 text-sm text-slate-600 text-right font-mono" style={getColumnStyles('compa_ratio')}>
                      {compaBeforeNum ? `${(compaBeforeNum * 100).toFixed(1)}%` : <span className="text-slate-300">—</span>}
                    </td>
                  )}
                  {presetIncludes(activePreset, 'D') && (
                    <td className="px-4 py-4 text-sm text-slate-600" style={getColumnStyles('compa_band')}>
                      {(() => {
                        const rules = (latestRun as any)?.rules_snapshot || (scenario as any)?.rules_json || {};
                        let zoneLabel = '—';
                        if (compaBeforeNum > 0) {
                          if (rules.compa_bands && Array.isArray(rules.compa_bands)) {
                            const band = rules.compa_bands.find((b: any) => compaBeforeNum >= (b.min ?? -Infinity) && compaBeforeNum < (b.max ?? Infinity));
                            if (band) zoneLabel = band.label || band.key;
                          } else {
                            const t1 = rules.threshold_1 ?? 0.8;
                            const t2 = rules.threshold_2 ?? 1.0;
                            const t3 = rules.threshold_3 ?? 1.2;
                            if (compaBeforeNum < t1) zoneLabel = 'Below Min';
                            else if (compaBeforeNum < t2) zoneLabel = 'Below Mid';
                            else if (compaBeforeNum < t3) zoneLabel = 'Above Mid';
                            else zoneLabel = 'Above Max';
                          }
                        }
                        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">{renderCell(zoneLabel, 'compa_band')}</span>;
                      })()}
                    </td>
                  )}

                  {/* GROUP E: Guideline */}
                  {(presetIncludes(activePreset, 'E') || activePreset === 'default') && (
                     <>
                        <td className="px-6 py-4 text-sm text-slate-600 font-bold whitespace-nowrap" style={getColumnStyles('performance_rating')}>
                          {renderCell(rating, 'performance_rating')}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 text-right font-mono" style={getColumnStyles('guideline_max_pct')}>
                          {(() => {
                            const maxPct = getGuidelineMaxPct(res);
                            if (maxPct === null) return <span className="text-slate-300" title="No guideline available">—</span>;
                            
                            const rules = (latestRun as any)?.rules_snapshot || (scenario as any)?.rules_json || {};
                            const mode = rules.guidelines?.enforcement_mode || 'warn';
                            const isExceeded = Number(res.after_json?.input_merit_pct ?? 0) > maxPct;
                            
                            return (
                              <span 
                                title={`Rating ${rating} => Max ${(maxPct * 100).toFixed(2)}%`}
                                className={`inline-block px-1.5 py-0.5 rounded ${isExceeded && mode === 'warn' ? 'bg-amber-100 text-amber-700 font-bold' : ''}`}
                              >
                                {(maxPct * 100).toFixed(2)}%
                              </span>
                            );
                          })()}
                        </td>
                     </>
                  )}

                  {/* GROUP F: Inputs */}
                  {presetIncludes(activePreset, 'F') && (
                    <>
                      <td className="px-4 py-4 text-center" style={getColumnStyles('lock')}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleLock(res.id); }}
                          className={`p-1.5 rounded transition-colors ${res.after_json?.locked_merit ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}
                          title={res.after_json?.locked_merit ? "Unlock Row" : "Lock Row"}
                        >
                          {res.after_json?.locked_merit ? <Lock className="w-4 h-4 shrink-0" /> : <Unlock className="w-4 h-4 shrink-0" />}
                        </button>
                      </td>
                      {EDITABLE_INPUTS.map(ik => {
                        const val = Number(res.after_json?.[ik] ?? 0);
                        const warning = getInputWarning(res, ik, val);
                        return (
                          <td key={ik} className="px-4 py-4 text-right" style={getColumnStyles(ik)}>
                            <div className="inline-flex flex-col items-end">
                              <input 
                                key={`${res.id}-${ik}-${val}`}
                                type="number" 
                                step={ik.includes('pct') ? '0.01' : '1'}
                                onClick={(e) => e.stopPropagation()} // Prevent opening drawer when interacting with input
                                className={`w-24 px-2 py-1 text-right border rounded text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 outline-none ${
                                  warning ? 'border-amber-400 bg-amber-50' : 'border-emerald-200'
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
                    </>
                  )}

                  {/* GROUP G: Outputs */}
                  {(presetIncludes(activePreset, 'G') || activePreset === 'default') && (
                    renderMoneyCol('calc_new_base_salary_local', true)
                  )}
                  {presetIncludes(activePreset, 'G') && (
                    <>
                      {calcColumns.filter(c => c.column_key !== 'calc_new_base_salary_local').map(col => {
                        const v = res.after_json?.[col.column_key];
                        const isNull = v === null || v === undefined;
                        return (
                          <td 
                            key={col.id} 
                            className={`px-4 py-4 text-sm font-bold text-right font-mono ${isNull ? 'text-slate-300 italic' : 'text-blue-600'}`}
                            style={getColumnStyles(col.column_key)}
                          >
                            {isNull ? '—'
                              : col.data_type === 'currency' ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                              : col.data_type === 'percent' ? `${(Number(v) * 100).toFixed(2)}%`
                              : Number(v).toLocaleString()}
                          </td>
                        );
                      })}
                      
                      {/* Derived: Compa After */}
                      <td 
                        className="px-4 py-4 text-sm font-bold text-purple-600 text-right font-mono"
                        style={getColumnStyles('compa_after')}
                      >
                        {(() => {
                          const baseAfter = Number(getAnyAttr(res, 'calc_new_base_salary_local'));
                          const marketRef = Number(getAnyAttr(res, 'market_reference_value_local') ?? getAnyAttr(res, 'market_reference_amount_local'));
                          
                          if (baseAfter > 0 && marketRef > 0) {
                             const compaAfter = baseAfter / marketRef;
                             return `${(compaAfter * 100).toFixed(1)}%`;
                          }
                          return <span className="text-slate-300 font-normal" title="Market reference denominator not found">—</span>;
                        })()}
                      </td>
                    </>
                  )}

                  <td className="px-6 py-4 sticky right-0 bg-white shadow-[-1px_0_0_rgba(241,245,249,1)] z-30" style={getColumnStyles('flags')}>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {res.flags_json?.map((flag: string) => (
                        <span key={flag} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-tighter ${
                          flag === 'INVALID_RATING' || flag === 'MISSING_FX' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          flag === 'NO_PAY_BAND' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
                );
              })}
              {total === 0 && (
                <tr>
                  <td colSpan={99} className="px-6 py-12 text-center text-slate-400">No empleados encontrados en esta configuración.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium font-inter">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-sans">Rows per page:</span>
              <select
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700 cursor-pointer text-xs"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
            <span className="text-[11px] text-slate-500 font-sans">
              Showing <span className="text-slate-900 font-bold">{total > 0 ? start + 1 : 0}</span>–
              <span className="text-slate-900 font-bold">{end}</span> of{" "}
              <span className="text-slate-900 font-bold">{total}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex(prev => prev - 1)}
              className="p-2 border border-slate-200 rounded-xl hover:bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm group active:scale-95"
              title="Previous Page"
            >
              <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
            </button>
            <div className="flex items-center gap-1.5 px-3 min-w-[100px] justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter font-sans">Page</span>
              <span className="text-sm font-black text-slate-900 font-sans">{pageIndex + 1}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter text-center font-sans">of {totalPages || 1}</span>
            </div>
            <button
              type="button"
              disabled={pageIndex >= totalPages - 1}
              onClick={() => setPageIndex(prev => prev + 1)}
              className="p-2 border border-slate-200 rounded-xl hover:bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm group active:scale-95"
              title="Next Page"
            >
              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
      )}

      <ColumnConfigModal 
        isOpen={isConfigModalOpen} 
        onClose={() => setIsConfigModalOpen(false)} 
        datasetId={dataset?.id || ''}
        scenarioRunId={latestRun?.id || ''}
        tenantId={dataset?.tenant_id || ''}
        scenarioId={id!}
        onSuccess={fetchResults}
        onDatasetInitialized={(newDatasetId, newTenantId) => {
          // Refresh results so dataset state is picked up from DB
          fetchResults();
        }}
      />

      <ManageColumnsModal
        isOpen={isManageColumnsOpen}
        onClose={() => setIsManageColumnsOpen(false)}
        datasetId={dataset?.id || ''}
        onColumnsChanged={fetchResults}
      />

      <JobHistoryModal
        isOpen={isJobHistoryOpen}
        onClose={() => setIsJobHistoryOpen(false)}
        datasetId={dataset?.id || ''}
        scenarioRunId={latestRun?.id || ''}
      />

      {snapshotId && (
        <DataQualityReportModal
          isOpen={isQualityReportOpen}
          onClose={() => setIsQualityReportOpen(false)}
          snapshotId={snapshotId}
        />
      )}

      {/* Phase 6B Modals */}
      <DuplicateRunModal
        isOpen={isDuplicateOpen}
        onClose={() => setIsDuplicateOpen(false)}
        scenarioId={id!}
        sourceRunId={activeRunId!}
        onSuccess={(newRunId) => {
          setIsDuplicateOpen(false);
          fetchResults(newRunId); // Reload page with new run active
        }}
      />

      <CompareRunsModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        scenarioId={id!}
        runs={allRuns}
        activeRunId={activeRunId!}
        currentResults={results}
      />

      <BudgetConfigModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        config={budgetConfig}
        onSave={handleSaveBudgetConfig}
        isSaving={isSavingBudget}
      />

      {/* Phase 7A.3 Employee Details Drawer */}
      <EmployeeDetailsDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        employee={selectedDrawerEmployee}
        getAnyAttr={getAnyAttr}
        guidelineMaxPct={selectedDrawerEmployee ? getGuidelineMaxPct(selectedDrawerEmployee) : null}
        scenarioRules={(latestRun as any)?.rules_snapshot || (scenario as any)?.rules_json || {}}
      />
    </div>
  );
};

export default ScenarioResultsPage;
