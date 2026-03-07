import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabaseClient';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const [mappings, setMappings] = useState<Mapping[]>([]);
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
    setMappings([{ provider: 'MERCER', vendor_level_code: '', pay_grade_internal: '', country_code: null, _isNew: true }, ...mappings]);
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
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <button onClick={() => navigate('/workspace/paybands')} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2 font-bold text-sm">
             <ArrowLeft className="w-4 h-4" /> {t('paybands.wizard.common.back')}
          </button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{t('paybands.mappings.title')}</h1>
          <p className="text-slate-500 font-bold mt-2">{t('paybands.mappings.desc')}</p>
        </div>
        <div className="flex gap-3">
           <button onClick={handleAdd} className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2">
             <Plus className="w-4 h-4" /> {t('paybands.mappings.add')}
           </button>
           <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
             <Save className="w-4 h-4" /> {saving ? t('common.running') : t('paybands.mappings.btn_save')}
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-black text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">{t('paybands.wizard.step2.weights').replace(' (%)', '')} Provider</th>
                  <th className="px-6 py-4">{t('paybands.wizard.step1.country')} (ISO-2)</th>
                  <th className="px-6 py-4">{t('paybands.labels.vendor_level_code')}</th>
                  <th className="px-6 py-4">{t('paybands.labels.internal_grade')}</th>
                  <th className="px-6 py-4 text-right">{t('paybands.labels.actions') || 'Actions'}</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
               {mappings.length === 0 ? (
                  <tr>
                     <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold">{t('paybands.mappings.empty_msg')}</td>
                  </tr>
               ) : mappings.map((m, idx) => (
                  <tr key={m.id || `new-${idx}`} className={m._isNew ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}>
                     <td className="px-6 py-3">
                        <select 
                           value={m.provider} 
                           onChange={e => handleUpdate(idx, 'provider', e.target.value)}
                           className="w-full bg-transparent border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                        >
                           <option value="MERCER">{t('paybands.providers.MERCER')}</option>
                           <option value="WTW">{t('paybands.providers.WTW')}</option>
                           <option value="THIRD">{t('paybands.providers.THIRD')}</option>
                        </select>
                     </td>
                     <td className="px-6 py-3">
                        <input 
                           type="text" 
                           placeholder={t('paybands.mappings.country_placeholder')}
                           value={m.country_code || ''} 
                           onChange={e => handleUpdate(idx, 'country_code', e.target.value.toUpperCase())}
                           maxLength={2}
                           className="w-full bg-transparent border-b border-dashed border-slate-300 rounded-none px-2 py-1 focus:border-indigo-500 focus:ring-0 outline-none text-sm"
                        />
                     </td>
                     <td className="px-6 py-3">
                        <input 
                           type="text" 
                           placeholder={t('paybands.mappings.level_placeholder')}
                           value={m.vendor_level_code} 
                           onChange={e => handleUpdate(idx, 'vendor_level_code', e.target.value)}
                           className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-semibold"
                        />
                     </td>
                     <td className="px-6 py-3">
                        <input 
                           type="text" 
                           placeholder={t('paybands.mappings.grade_placeholder')}
                           value={m.pay_grade_internal} 
                           onChange={e => handleUpdate(idx, 'pay_grade_internal', e.target.value)}
                           className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-bold text-indigo-900 dark:text-indigo-300"
                        />
                     </td>
                     <td className="px-6 py-3 text-right">
                        <button onClick={() => handleDelete(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   </div>
  );
}
