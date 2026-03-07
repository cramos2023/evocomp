import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, Play, Save, AlertTriangle, CheckCircle, EyeOff, Eye, Zap } from 'lucide-react';

export interface ColumnDef {
  id?: string;
  column_key: string;
  label: string;
  data_type: 'currency' | 'percent' | 'decimal' | 'text';
  formula_dsl?: string;
  depends_on?: string[];
  is_active?: boolean;
}

interface ColumnConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  scenarioRunId: string;
  tenantId: string;
  scenarioId?: string;
  baseCurrencyCode?: string;
  /** When editing an existing column, pass it here */
  existingColumn?: ColumnDef;
  onSuccess: () => void;
  /** Called after dataset is initialized so parent can refresh state */
  onDatasetInitialized?: (datasetId: string, tenantId: string) => void;
}

export const ColumnConfigModal: React.FC<ColumnConfigModalProps> = ({
  isOpen, onClose, datasetId, scenarioRunId, tenantId, scenarioId,
  baseCurrencyCode, existingColumn, onSuccess, onDatasetInitialized
}) => {
  const [columnKey, setColumnKey] = useState(existingColumn?.column_key ?? 'calc_merit_increase_amount_local');
  const [label, setLabel] = useState(existingColumn?.label ?? 'Merit Increase (Local)');
  const [dataType, setDataType] = useState<'currency' | 'percent' | 'decimal'>(
    (existingColumn?.data_type as 'currency' | 'percent' | 'decimal') ?? 'currency'
  );
  const [formulaDsl, setFormulaDsl] = useState(existingColumn?.formula_dsl ?? 'ROUND([base_salary_local] * [input_merit_pct], 2)');

  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  // Initialize flow state
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initSuccess, setInitSuccess] = useState(false);

  const isEditMode = !!existingColumn?.id;
  const isDatasetEmpty = !datasetId;

  if (!isOpen) return null;

  // ── Initialize Column Config ───────────────────────────────────────────────
  // Calls seed-presets (service role) which handles get-or-create of the dataset.
  // We do NOT call supabase.from('dynamic_datasets').insert() from the client
  // because the client is blocked by RLS.
  const handleInitialize = async () => {
    if (!scenarioId) {
      setInitError('Cannot initialize: scenario ID is missing. Reload the page and try again.');
      return;
    }

    setInitializing(true);
    setInitError(null);
    setInitSuccess(false);

    try {
      // init-column-config is the canonical initializer:
      //   - reads tenant_id from scenarios (valid FK, not from auth user)
      //   - creates dynamic_datasets with all required columns
      //   - seeds the 9 preset column definitions
      // We only send scenario_id — tenant is resolved server-side.
      const { data, error: initErr } = await supabase.functions.invoke('init-column-config', {
        body: { scenario_id: scenarioId }
      });

      if (initErr) {
        let errorMsg = initErr.message || 'Unknown error';
        try {
          const ctx = (initErr as any).context;
          if (ctx) {
            const raw = await ctx.text?.();
            if (raw) {
              const parsed = JSON.parse(raw);
              errorMsg = parsed?.message || parsed?.error || raw;
            }
          }
        } catch (_) { /**/ }
        console.error('[ColumnConfig] init failed:', errorMsg);
        throw new Error(`Initialization failed: ${errorMsg}`);
      }

      if (!data?.ok) {
        console.error('[ColumnConfig] init-column-config ok=false:', data);
        throw new Error(data?.message || 'init-column-config returned ok=false');
      }

      console.info('[ColumnConfig] Initialized dataset:', data.dataset_id);
      setInitSuccess(true);

      // Notify parent to refresh state — it will pick up the new dataset
      onDatasetInitialized?.(data.dataset_id, data.tenant_id);

      setTimeout(() => { onClose(); onSuccess(); }, 1200);

    } catch (err: any) {
      console.error('[ColumnConfig] Initialize error:', err);
      setInitError(err.message || 'Initialization failed.');
    } finally {
      setInitializing(false);
    }
  };


  const handleValidate = async () => {
    if (isDatasetEmpty) {
      setValidationResult({ status: 'error', errors: [{ message: 'Initialize Column Config first before validating formulas.' }] });
      return;
    }
    setValidating(true);
    setValidationResult(null);
    try {
      console.info('[ColumnConfigModal] Validating formula...', { datasetId, column_key: columnKey });
      const { data, error } = await supabase.functions.invoke('validate-formula', {
        body: {
          formula_dsl: formulaDsl,
          tenant_id: tenantId || undefined,
          dataset_id: datasetId || undefined,
          column_key: columnKey
        }
      });
      if (error) {
        let errorMsg = error.message || 'Unknown error';
        try {
          const ctx = (error as any).context;
          if (ctx) {
            const raw = await ctx.text?.();
            if (raw) {
              const parsed = JSON.parse(raw);
              errorMsg = parsed?.message || parsed?.error || raw;
            }
          }
        } catch (_) { /**/ }
        console.error('[ColumnConfigModal] validate-formula error:', error);
        setValidationResult({ status: 'error', errors: [{ message: `Validation failed: ${errorMsg}` }] });
        return;
      }
      console.info('[ColumnConfigModal] validate-formula response:', data);
      setValidationResult(data);
    } catch (err: any) {
      setValidationResult({ status: 'error', errors: [{ message: err.message }] });
    } finally {
      setValidating(false);
    }
  };

  const handleSaveAndExecute = async () => {
    if (isDatasetEmpty) {
      alert('Initialize Column Config first.');
      return;
    }
    setSaving(true);
    try {
      const { error: colErr } = await supabase.from('column_definitions').upsert({
        tenant_id: tenantId,
        dataset_id: datasetId,
        column_key: columnKey,
        label,
        data_type: dataType,
        formula_dsl: formulaDsl,
        depends_on: validationResult?.depends_on || [],
        is_active: true
      }, { onConflict: 'dataset_id, column_key' });

      if (colErr) throw colErr;

      const { data: jobData, error: jobErr } = await supabase.from('formula_jobs').insert({
        tenant_id: tenantId,
        dataset_id: datasetId,
        scenario_run_id: scenarioRunId,
        requested_columns: [columnKey],
        mode: 'sync',
      }).select().single();

      if (jobErr) throw jobErr;

      const { error: engineErr } = await supabase.functions.invoke('formula-engine', {
        body: { job_id: jobData.id }
      });
      if (engineErr) throw engineErr;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save error', err);
      alert('Failed to save or execute: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!existingColumn?.id) return;
    const newActive = !existingColumn.is_active;
    setDisableError(null);
    setDisabling(true);

    if (!newActive) {
      const { data: deps } = await supabase
        .from('column_definitions')
        .select('column_key, label')
        .eq('dataset_id', datasetId)
        .eq('is_active', true)
        .contains('depends_on', [columnKey]);

      if (deps && deps.length > 0) {
        const names = deps.map(d => `'${d.label}'`).join(', ');
        setDisableError(`Cannot disable: ${names} depend on this column. Disable them first.`);
        setDisabling(false);
        return;
      }
    }

    const { error } = await supabase
      .from('column_definitions')
      .update({ is_active: newActive })
      .eq('id', existingColumn.id);

    setDisabling(false);
    if (error) {
      setDisableError(error.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  // ── Render: Initialize panel when no dataset ───────────────────────────────
  if (isDatasetEmpty) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Initialize Column Config</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-slate-600 text-sm">
              This scenario does not have a Column Config dataset yet. Click{' '}
              <strong>Initialize</strong> to create the dataset and seed the 9 standard preset
              columns (inputs + calculated outputs). This is idempotent — safe to run multiple times.
            </p>
            {initError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="whitespace-pre-wrap">{initError}</p>
              </div>
            )}
            {initSuccess && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <p>Initialized successfully! Reloading columns…</p>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInitialize}
              disabled={initializing || initSuccess}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm"
            >
              {initializing ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Initializing…</>
              ) : (
                <><Zap className="w-4 h-4" /> Initialize Column Config</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Formula editor when dataset is active ──────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditMode ? 'Edit Column' : 'Configure Dynamic Column'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Column Key</label>
              <input
                type="text"
                value={columnKey}
                onChange={e => setColumnKey(e.target.value)}
                disabled={isEditMode}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono disabled:bg-slate-50 disabled:text-slate-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">^[a-z][a-z0-9_]+ (e.g. calc_merit_increase_amount_local)</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Display Label</label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Data Type</label>
              <select
                value={dataType}
                onChange={e => setDataType(e.target.value as 'currency' | 'percent' | 'decimal')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="currency">Currency</option>
                <option value="percent">Percent</option>
                <option value="decimal">Decimal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Formula DSL</label>
            <textarea
              value={formulaDsl}
              onChange={e => { setFormulaDsl(e.target.value); setValidationResult(null); }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono h-24"
              placeholder="e.g. ROUND([base_salary_local] * [input_merit_pct], 2)"
            />
            <p className="text-[10px] text-slate-500 mt-1">Variables must be wrapped in brackets `[col_name]`.</p>
          </div>

          {validationResult && (
            <div className={`p-4 rounded-xl text-sm border ${validationResult.status === 'valid' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {validationResult.status === 'valid' ? (
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="font-bold">Syntax Valid</p>
                    <p className="text-green-700">Dependencies: {validationResult.depends_on?.join(', ') || 'None'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <p className="font-bold">Invalid Formula</p>
                    <ul className="list-disc pl-4 mt-1">
                      {validationResult.errors?.map((err: any, i: number) => (
                        <li key={i}>{err.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {disableError && (
            <div className="p-4 rounded-xl text-sm border bg-amber-50 border-amber-200 text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p>{disableError}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-3">
          {isEditMode && (
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={disabling}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {existingColumn?.is_active
                ? <><EyeOff className="w-4 h-4" /> Disable Column</>
                : <><Eye className="w-4 h-4" /> Enable Column</>}
            </button>
          )}

          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 focus:ring-2 focus:ring-slate-200 transition-colors flex items-center gap-2"
            >
              {validating ? 'Validating…' : <><Play className="w-4 h-4" /> Validate AST</>}
            </button>
            <button
              type="button"
              onClick={handleSaveAndExecute}
              disabled={saving || validationResult?.status !== 'valid'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {saving ? 'Processing…' : <><Save className="w-4 h-4" /> Save &amp; Execute</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
