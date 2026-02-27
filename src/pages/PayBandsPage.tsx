import React, { useEffect, useState } from 'react';
import { Plus, Search, DollarSign, Layers, TrendingUp, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

const BASIS_OPTIONS = ['BASE_SALARY', 'ANNUAL_TARGET_CASH', 'TOTAL_GUARANTEED'];
const BASIS_COLORS: Record<string, string> = {
  BASE_SALARY: 'bg-blue-100 text-blue-700', ANNUAL_TARGET_CASH: 'bg-indigo-100 text-indigo-700', TOTAL_GUARANTEED: 'bg-purple-100 text-purple-700',
};

interface Band {
  id: string; grade: string; basis_type: string; country_code: string | null; currency: string | null;
  min_salary: number; midpoint: number; max_salary: number; spread: number | null;
}

const PayBandsPage = () => {
  const { t } = useTranslation();
  const [bands, setBands]             = useState<Band[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterBasis, setFilterBasis] = useState('ALL');
  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm] = useState({ grade: '', basis_type: 'BASE_SALARY', country_code: '', currency: '', min_salary: '', midpoint: '', max_salary: '' });
  const [formError, setFormError]     = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { fetchBands(); }, []);

  async function fetchBands() {
    try {
      const { data, error } = await supabase.from('pay_bands').select('id, grade, basis_type, country_code, currency, min_salary, midpoint, max_salary, spread').order('grade').order('basis_type');
      if (error) throw error;
      setBands((data as Band[]) || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const filtered = bands.filter(b => {
    const matchSearch = !search || b.grade.toLowerCase().includes(search.toLowerCase());
    const matchBasis  = filterBasis === 'ALL' || b.basis_type === filterBasis;
    return matchSearch && matchBasis;
  });

  const avgSpread = bands.length > 0
    ? (bands.reduce((s, b) => { const sp = ((b.max_salary - b.min_salary) / b.min_salary * 100); return s + sp; }, 0) / bands.length).toFixed(0) : '—';

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.grade) { setFormError(t('merit.error_grade_required')); return; }
    if (!form.min_salary || !form.midpoint || !form.max_salary) { setFormError(t('merit.error_band_amounts_required')); return; }
    setFormLoading(true); setFormError('');
    try {
      const { error } = await supabase.from('pay_bands').insert({
        grade: form.grade.trim().toUpperCase(), basis_type: form.basis_type,
        country_code: form.country_code.trim().toUpperCase() || null, currency: form.currency.trim().toUpperCase() || null,
        min_salary: parseFloat(form.min_salary), midpoint: parseFloat(form.midpoint), max_salary: parseFloat(form.max_salary),
      });
      if (error) throw error;
      setShowCreate(false); setForm({ grade: '', basis_type: 'BASE_SALARY', country_code: '', currency: '', min_salary: '', midpoint: '', max_salary: '' });
      await fetchBands();
    } catch (err: any) { setFormError(err.message || 'Error'); }
    finally { setFormLoading(false); }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('pay_bands.title')}</h1>
          <p className="text-slate-500 mt-1">{t('pay_bands.subtitle')}</p>
        </div>
        <button data-testid="create-band-btn" onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4" />{t('pay_bands.create')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">{t('pay_bands.total')}</p>
          <div className="flex items-center justify-between"><h3 className="text-2xl font-bold text-slate-900">{bands.length}</h3><Layers className="w-5 h-5 text-blue-500" /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">{t('pay_bands.avg_spread')}</p>
          <div className="flex items-center justify-between"><h3 className="text-2xl font-bold text-slate-900">{avgSpread}%</h3><TrendingUp className="w-5 h-5 text-green-500" /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 flex items-center gap-4 bg-blue-50/30 border-blue-100">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-bold text-blue-900">{t('pay_bands.currency_policy')}</p>
            <p className="text-xs text-blue-700">{t('pay_bands.currency_policy_desc')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {['ALL', ...BASIS_OPTIONS].map(b => (
          <button key={b} data-testid={`basis-filter-${b}`} onClick={() => setFilterBasis(b)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterBasis === b ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>
            {b === 'ALL' ? (t('pay_bands.filter_all') || 'All') : t(`merit.basis_${b.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input data-testid="pay-bands-search" placeholder={t('pay_bands.search_placeholder') || 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>
          <span className="text-xs text-slate-400">{filtered.length} {t('pay_bands.results') || 'bands'}</span>
        </div>

        {loading ? <div className="p-12 text-center text-slate-400 text-sm">Loading...</div> : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">{t('pay_bands.col_grade') || 'Grade'}</th>
                <th className="px-6 py-4">{t('pay_bands.col_basis') || 'Basis'}</th>
                <th className="px-6 py-4">{t('pay_bands.col_country') || 'Country'}</th>
                <th className="px-6 py-4">{t('pay_bands.col_currency') || 'Currency'}</th>
                <th className="px-6 py-4">{t('pay_bands.table.range')}</th>
                <th className="px-6 py-4">{t('pay_bands.table.spread')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">{t('pay_bands.empty')}</td></tr>
              ) : filtered.map(band => {
                const spread = ((band.max_salary - band.min_salary) / band.min_salary * 100).toFixed(0);
                return (
                  <tr key={band.id} data-testid={`band-row-${band.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-900">{band.grade}</span></td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${BASIS_COLORS[band.basis_type] ?? 'bg-slate-100 text-slate-500'}`}>{t(`merit.basis_${band.basis_type.toLowerCase()}`)}</span></td>
                    <td className="px-6 py-4"><span className="text-sm text-slate-500">{band.country_code || '—'}</span></td>
                    <td className="px-6 py-4"><span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">{band.currency || '—'}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 min-w-[160px]">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>{Number(band.min_salary).toLocaleString()}</span>
                          <span className="text-slate-900">{Number(band.midpoint).toLocaleString()}</span>
                          <span>{Number(band.max_salary).toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full relative overflow-hidden">
                          <div className="absolute inset-y-0 left-0 right-0 bg-blue-500 rounded-full opacity-30"></div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-3 bg-slate-800 rounded-full border-2 border-white"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-700">{spread}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{t('pay_bands.create_title') || 'New Pay Band'}</h2>
              <button onClick={() => { setShowCreate(false); setFormError(''); }} className="p-2 text-slate-400 hover:text-slate-900 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"><AlertCircle className="w-4 h-4 shrink-0" />{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('pay_bands.col_grade') || 'Grade'}</label>
                  <input data-testid="band-grade-input" type="text" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. G5" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('pay_bands.col_basis') || 'Basis'}</label>
                  <select data-testid="band-basis-select" value={form.basis_type} onChange={e => setForm(f => ({ ...f, basis_type: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white">
                    {BASIS_OPTIONS.map(b => <option key={b} value={b}>{t(`merit.basis_${b.toLowerCase()}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('pay_bands.col_country') || 'Country'} ({t('common.optional') || 'opt.'})</label>
                  <input data-testid="band-country-input" type="text" value={form.country_code} onChange={e => setForm(f => ({ ...f, country_code: e.target.value.slice(0,2) }))} placeholder="US" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('pay_bands.col_currency') || 'Currency'} ({t('common.optional') || 'opt.'})</label>
                  <input data-testid="band-currency-input" type="text" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.slice(0,3) }))} placeholder="USD" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ label: t('merit.band_min'), field: 'min_salary', id: 'band-min-input' }, { label: t('merit.band_mid'), field: 'midpoint', id: 'band-mid-input' }, { label: t('merit.band_max'), field: 'max_salary', id: 'band-max-input' }].map(f => (
                  <div key={f.field}>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{f.label}</label>
                    <input data-testid={f.id} type="number" value={(form as any)[f.field]} onChange={e => setForm(frm => ({ ...frm, [f.field]: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setFormError(''); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">{t('merit.cancel')}</button>
                <button data-testid="save-band-btn" type="submit" disabled={formLoading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors">{formLoading ? (t('common.saving') || 'Saving...') : t('pay_bands.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayBandsPage;
