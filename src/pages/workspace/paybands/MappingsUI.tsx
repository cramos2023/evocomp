import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabaseClient';
import { Plus, Trash2, Save, ArrowLeft, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PayBandsGuideDrawer from '../../../components/paybands/PayBandsGuideDrawer';

type Mapping = {
  id?: string;
  provider: string;
  vendor_level_code: string;
  pay_grade_internal: string;
  country_code: string | null;
  _isNew?: boolean;
};

export default function MappingsUI() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    fetchMappings();
  }, []);

  async function fetchMappings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      const tid = profile?.tenant_id;
      setTenantId(tid);

      if (tid) {
        const { data } = await supabase.from('vendor_grade_mappings').select('*').eq('tenant_id', tid).order('provider').order('vendor_level_code');
        setMappings(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = () => {
    setMappings([{ provider: 'MERCER', country_code: '', vendor_level_code: '', pay_grade_internal: '', _isNew: true }, ...mappings]);
  };

  const handleUpdate = (index: number, field: keyof Mapping, value: string | null) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [field]: value === '' ? null : value };
    setMappings(newMappings);
  };

  const handleDelete = async (index: number) => {
    const item = mappings[index];
    if (item.id) {
       if (!confirm(t('common.confirm'))) return;
       await supabase.from('vendor_grade_mappings').delete().eq('id', item.id);
    }
    const newMappings = [...mappings];
    newMappings.splice(index, 1);
    setMappings(newMappings);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const toUpsert = mappings.map(m => {
        const { _isNew, ...rest } = m;
        return { ...rest, tenant_id: tenantId };
      });
      
      // Basic validation
      for (const m of toUpsert) {
         if (!m.vendor_level_code || !m.pay_grade_internal) {
            throw new Error(t('paybands.validation.requiredField'));
         }
      }

      const { error } = await supabase.from('vendor_grade_mappings').upsert(toUpsert, { onConflict: 'id' });
      if (error) throw error;
      await fetchMappings();
      alert(t('paybands.imports.success'));
    } catch (e: any) {
      alert(t('common.error') + " " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">{t('common.running')}</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <PayBandsGuideDrawer 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
        initialPhase="prepareData" 
      />
      
      <div className="mb-0">
        <button
          onClick={() => navigate('/workspace/paybands')}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors font-bold text-xs uppercase tracking-widest group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center group-hover:border-slate-900 dark:group-hover:border-white transition-all shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </div>
          {t('common.back')}
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
            {t('paybands.mappings.title')}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1 font-medium">
            {t('paybands.mappings.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setIsGuideOpen(true)}
             className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <HelpCircle className="w-4 h-4" /> {t('common.help', { defaultValue: 'Help' })}
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 transition-colors text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            {t('paybands.mappings.buttons.add_rule')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 dark:bg-emerald-600 hover:bg-blue-700 dark:hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-bold disabled:opacity-50 shadow-md shadow-blue-500/10 dark:shadow-emerald-500/10"
          >
            <Save className="w-4 h-4" />
            {saving ? t('common.saving') : t('paybands.mappings.buttons.save_mappings')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-900/80 border-b border-slate-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-center">
                  {t('paybands.mappings.columns.provider')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-center">
                  {t('paybands.mappings.columns.country_code')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-center">
                  {t('paybands.mappings.columns.vendor_level_code')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-center">
                  {t('paybands.mappings.columns.internal_grade')}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-center w-[140px]">
                  {t('paybands.mappings.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-zinc-500 italic">
                    {t('paybands.mappings.empty_msg', { defaultValue: 'No mapping rules yet. Add one to get started.' })}
                  </td>
                </tr>
              ) : (
                mappings.map((mapping, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-3">
                      <select
                        value={mapping.provider}
                        onChange={(e) => handleUpdate(index, 'provider', e.target.value)}
                        className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-emerald-500 transition-colors"
                      >
                        <option value="MERCER">{t('paybands.providers.MERCER')}</option>
                        <option value="WTW">{t('paybands.providers.WTW')}</option>
                        <option value="THIRD">{t('paybands.providers.THIRD')}</option>
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="text"
                        value={mapping.country_code || ''}
                        onChange={(e) => handleUpdate(index, 'country_code', e.target.value)}
                        placeholder={t('paybands.mappings.placeholders.country_code')}
                        className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-emerald-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="text"
                        value={mapping.vendor_level_code}
                        onChange={(e) => handleUpdate(index, 'vendor_level_code', e.target.value)}
                        placeholder={t('paybands.mappings.placeholders.vendor_level_code')}
                        className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-emerald-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="text"
                        value={mapping.pay_grade_internal}
                        onChange={(e) => handleUpdate(index, 'pay_grade_internal', e.target.value)}
                        placeholder={t('paybands.mappings.placeholders.internal_grade')}
                        className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-emerald-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                      />
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleDelete(index)}
                        className="p-2 text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                        title={t('paybands.actions.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
