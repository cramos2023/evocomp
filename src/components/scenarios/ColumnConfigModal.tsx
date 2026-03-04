import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, Play, Save, AlertTriangle, CheckCircle, EyeOff, Eye } from 'lucide-react';

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
  /** When editing an existing column, pass it here */
  existingColumn?: ColumnDef;
  onSuccess: () => void;
}

export const ColumnConfigModal: React.FC<ColumnConfigModalProps> = ({
  isOpen, onClose, datasetId, scenarioRunId, tenantId, existingColumn, onSuccess
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

  const isEditMode = !!existingColumn?.id;

  if (!isOpen) return null;

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('validate-formula', {
        body: {
          formula_dsl: formulaDsl,
          tenant_id: tenantId,
          dataset_id: datasetId,
          column_key: columnKey
        }
      });
      if (error) throw error;
      setValidationResult(data);
    } catch (err: any) {
      setValidationResult({ status: 'error', errors: [{ message: err.message }] });
    } finally {
      setValidating(false);
    }
  };

  const handleSaveAndExecute = async () => {
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

    // If disabling, check for dependents first
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
          {/* Left side: disable/enable lifecycle */}
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
              {validating ? 'Validating...' : <><Play className="w-4 h-4" /> Validate AST</>}
            </button>
            <button
              type="button"
              onClick={handleSaveAndExecute}
              disabled={saving || validationResult?.status !== 'valid'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {saving ? 'Processing...' : <><Save className="w-4 h-4" /> Save & Execute</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
