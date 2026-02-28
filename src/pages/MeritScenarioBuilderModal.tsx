import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

function buildMatrix(stepFactor: number, budgetPct: number): Record<string, Record<string, number>> {
  const cap = 1.0;
  const fe = { BELOW_MIN: cap + 4*stepFactor, BELOW_MID: cap + 3*stepFactor, ABOVE_MID: cap + 2*stepFactor, ABOVE_MAX: cap };
  const sub = (b: number, o: number) => Math.max(0, b - o);
  const raw: Record<string, Record<string, number>> = {
    FE: fe,
    E:  { BELOW_MIN: sub(fe.BELOW_MIN, stepFactor),   BELOW_MID: sub(fe.BELOW_MID, stepFactor),   ABOVE_MID: sub(fe.ABOVE_MID, stepFactor),   ABOVE_MAX: fe.ABOVE_MAX },
    FM: { BELOW_MIN: sub(fe.BELOW_MIN, 2*stepFactor), BELOW_MID: sub(fe.BELOW_MID, 2*stepFactor), ABOVE_MID: sub(fe.ABOVE_MID, 2*stepFactor), ABOVE_MAX: sub(fe.ABOVE_MAX, 2*stepFactor) },
    PM: { BELOW_MIN: 0, BELOW_MID: 0, ABOVE_MID: 0, ABOVE_MAX: 0 },
    DNM:{ BELOW_MIN: 0, BELOW_MID: 0, ABOVE_MID: 0, ABOVE_MAX: 0 },
  };
  const result: Record<string, Record<string, number>> = {};
  for (const [r, zones] of Object.entries(raw)) {
    result[r] = {};
    for (const [z, m] of Object.entries(zones)) result[r][z] = budgetPct * (m as number);
  }
  return result;
}

const ZONES   = ['BELOW_MIN', 'BELOW_MID', 'ABOVE_MID', 'ABOVE_MAX'];
const RATINGS = ['FE', 'E', 'FM', 'PM', 'DNM'];
const BASIS_OPTIONS = ['BASE_SALARY', 'ANNUAL_TARGET_CASH', 'TOTAL_GUARANTEED'];

interface Props { isOpen: boolean; onClose: () => void; onCreated: () => void; }

const MeritScenarioBuilderModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const { t } = useTranslation();
  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [name, setName]           = useState('');
  const [snapshotId, setSnapshotId] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [compBasis, setCompBasis]   = useState('BASE_SALARY');
  const [budgetPct, setBudgetPct]   = useState('20');
  const [stepFactor, setStepFactor] = useState('0.50');
  const [threshold1, setThreshold1] = useState('0.75');
  const [threshold2, setThreshold2] = useState('1.00');
  const [threshold3, setThreshold3] = useState('1.25');
  const [fteStandard, setFteStandard] = useState('40');

  useEffect(() => {
    if (isOpen) { fetchSnapshots(); setStep(1); setError(''); }
  }, [isOpen]);

  async function fetchSnapshots() {
    const { data } = await supabase.from('snapshots').select('id, name, snapshot_date').order('created_at', { ascending: false });
    setSnapshots(data || []);
  }

  const budgetPctNum  = parseFloat(budgetPct) / 100 || 0;
  const stepFactorNum = parseFloat(stepFactor) || 0.5;
  const matrixPreview = buildMatrix(stepFactorNum, budgetPctNum);

  async function handleCreate() {
    if (!name.trim()) { setError(t('merit.error_name_required')); return; }
    if (!snapshotId)  { setError(t('merit.error_snapshot_required')); return; }
    setLoading(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found for user');

      const rulesJson = {
        comp_basis: compBasis, approved_budget_pct: budgetPctNum, step_factor: stepFactorNum,
        threshold_1: parseFloat(threshold1), threshold_2: parseFloat(threshold2), threshold_3: parseFloat(threshold3),
        fte_hours_standard: parseFloat(fteStandard),
      };
      const { data: scenario, error: sErr } = await supabase.from('scenarios').insert({
        tenant_id: profile.tenant_id,
        name: name.trim(), snapshot_id: snapshotId, base_currency: baseCurrency.toUpperCase(),
        scenario_type: 'MERIT_REVIEW', rules_json: rulesJson, status: 'DRAFT',
      }).select().single();
      if (sErr) throw sErr;
      await supabase.from('scenario_rules').insert({
        tenant_id: profile.tenant_id,
        scenario_id: scenario.id,
        rules_json: rulesJson
      });
      onCreated(); onClose();
    } catch (err: any) { setError(err.message || 'Error creating scenario'); }
    finally { setLoading(false); }
  }

  if (!isOpen) return null;

  return (
    <div data-testid="merit-scenario-builder-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('merit.builder_title')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t('merit.builder_subtitle')}</p>
          </div>
          <button data-testid="close-modal-btn" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex px-6 pt-4 gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${s === step ? 'bg-blue-600 text-white' : s < step ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{s}</div>
              <span className={`text-xs font-medium ${s === step ? 'text-slate-900' : 'text-slate-400'}`}>{s === 1 ? t('merit.step1_label') : s === 2 ? t('merit.step2_label') : t('merit.step3_label')}</span>
              {s < 3 && <div className="w-8 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('merit.scenario_name')}</label>
                <input data-testid="scenario-name-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('merit.scenario_name_placeholder')} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('merit.select_snapshot')}</label>
                <select data-testid="snapshot-select" value={snapshotId} onChange={e => setSnapshotId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white">
                  <option value="">{t('merit.snapshot_placeholder')}</option>
                  {snapshots.map(s => <option key={s.id} value={s.id}>{s.name} — {s.snapshot_date}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('merit.base_currency')}</label>
                <input data-testid="base-currency-input" type="text" value={baseCurrency} onChange={e => setBaseCurrency(e.target.value.toUpperCase().slice(0,3))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('merit.comp_basis')}</label>
                <div className="grid grid-cols-1 gap-2">
                  {BASIS_OPTIONS.map(opt => (
                    <button key={opt} data-testid={`comp-basis-${opt}`} onClick={() => setCompBasis(opt)} className={`flex items-center justify-between px-4 py-3 border rounded-xl text-sm font-medium transition-all ${compBasis === opt ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <span>{t(`merit.basis_${opt.toLowerCase()}`)}</span>
                      {compBasis === opt && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('merit.approved_budget_pct')} (%)</label>
                  <input data-testid="budget-pct-input" type="number" value={budgetPct} onChange={e => setBudgetPct(e.target.value)} step="0.1" min="0" max="100" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  <p className="text-[10px] text-slate-400 mt-1">{t('merit.budget_pct_hint')}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('merit.step_factor')}</label>
                  <input data-testid="step-factor-input" type="number" value={stepFactor} onChange={e => setStepFactor(e.target.value)} step="0.05" min="0.1" max="2" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('merit.thresholds')}</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t('merit.threshold_t1'), value: threshold1, onChange: setThreshold1, id: 'threshold1-input' },
                    { label: t('merit.threshold_t2'), value: threshold2, onChange: setThreshold2, id: 'threshold2-input' },
                    { label: t('merit.threshold_t3'), value: threshold3, onChange: setThreshold3, id: 'threshold3-input' },
                  ].map(f => (
                    <div key={f.id}>
                      <label className="block text-[10px] text-slate-500 mb-1">{f.label}</label>
                      <input data-testid={f.id} type="number" value={f.value} onChange={e => f.onChange(e.target.value)} step="0.05" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('merit.fte_hours')}</label>
                <input type="number" value={fteStandard} onChange={e => setFteStandard(e.target.value)} className="w-40 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm text-slate-500 mb-4">{t('merit.matrix_preview_desc')}</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('merit.rating')}</th>
                      {ZONES.map(z => <th key={z} className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t(`merit.zone_${z.toLowerCase()}`)}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {RATINGS.map(rating => (
                      <tr key={rating} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{rating}</td>
                        {ZONES.map(zone => {
                          const val = matrixPreview[rating]?.[zone] ?? 0;
                          const isZero = val === 0;
                          return (
                            <td key={zone} data-testid={`matrix-${rating}-${zone}`} className="px-4 py-3 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${isZero ? 'bg-slate-100 text-slate-400' : val >= 0.40 ? 'bg-green-100 text-green-700' : val >= 0.20 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                {isZero ? '—' : `${(val * 100).toFixed(1)}%`}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">{t('merit.matrix_note', { budget: `${(budgetPctNum * 100).toFixed(1)}%`, step: stepFactor })}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button data-testid="modal-back-btn" onClick={() => { setError(''); setStep(s => s - 1); }} disabled={step === 1} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-4 h-4" />{t('merit.back')}
          </button>
          {step < 3 ? (
            <button data-testid="modal-next-btn" onClick={() => { setError(''); setStep(s => s + 1); }} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors">
              {t('merit.next')}<ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button data-testid="create-scenario-btn" onClick={handleCreate} disabled={loading} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors">
              {loading ? t('merit.creating') : t('merit.create_scenario')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeritScenarioBuilderModal;
