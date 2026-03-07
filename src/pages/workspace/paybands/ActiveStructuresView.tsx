import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { Layers, Plus, ShieldCheck, Search, CheckCircle2, Navigation, AlertTriangle, ArrowRight, Activity, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ActiveStructuresView({ profile }: { profile: any }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolution Tester State
  const [testCountry, setTestCountry] = useState('US');
  const [testBasis, setTestBasis] = useState('BASE_SALARY');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [profile?.tenant_id]);

  async function fetchVersions() {
     if (!profile?.tenant_id) return;
     try {
        const { data, error } = await supabase
           .from('pay_band_versions')
           .select('*, pay_bands(count)')
           .eq('tenant_id', profile.tenant_id)
           .eq('status', 'PUBLISHED')
           .order('is_primary', { ascending: false })
           .order('published_at', { ascending: false });

        if (error) throw error;
        setVersions(data || []);
     } catch (err) {
        console.error("Error loading versions:", err);
     } finally {
        setLoading(false);
     }
  }

  const handleTestResolution = async () => {
     setIsTesting(true);
     setTestResult(null);
     try {
        const { data, error } = await supabase.functions.invoke('payband-engine', {
           body: {
              action: 'resolve_active_paybands',
              payload: { country_code: testCountry, basis_type: testBasis, as_of_date: testDate }
           }
        });
        if (error) throw error;
        setTestResult(data);
     } catch (err: any) {
        setTestResult({ error: err.message });
     } finally {
        setIsTesting(false);
     }
  };

  const setPrimary = async (id: string, country: string, basis: string) => {
     if (!confirm(t('common.confirm'))) return;
     try {
        // Technically backend should transaction this, but we'll do it sequentially in UI for MVP
        await supabase.from('pay_band_versions').update({ is_primary: false })
           .eq('tenant_id', profile.tenant_id).eq('country_code', country).eq('basis_type', basis);
           
        await supabase.from('pay_band_versions').update({ is_primary: true }).eq('id', id);
        await fetchVersions();
     } catch (e: any) {
        alert(t('common.error') + ": " + e.message);
     }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tighter">
            {t('paybands.dashboard.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold">{t('paybands.dashboard.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
             onClick={() => navigate('/workspace/paybands/mappings')}
             className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
            <Navigation className="w-4 h-4 text-slate-400" /> {t('paybands.mappings.title')}
          </button>
          <button 
             onClick={() => navigate('/workspace/paybands/imports')}
             className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" /> {t('paybands.dashboard.manage_imports')}
          </button>
          <button 
             onClick={() => navigate('/workspace/paybands/builder/new')}
             className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-colors shadow-md shadow-indigo-500/20 flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t('paybands.dashboard.start_modeling')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="md:col-span-2 space-y-6">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-3">
               <ShieldCheck className="w-5 h-5 text-emerald-500" /> {t('paybands.dashboard.active_structures')}
            </h2>

            {loading ? (
               <div className="p-10 text-center text-slate-500 font-bold">{t('common.running')}</div>
            ) : versions.length === 0 ? (
               <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex justify-center items-center mx-auto shadow-sm"><Layers className="w-6 h-6 text-slate-400" /></div>
                  <p className="text-slate-600 font-bold">{t('paybands.dashboard.no_structures')}</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {versions.map(v => (
                     <div key={v.id} className={`p-6 rounded-2xl border transition-all ${v.is_primary ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                        <div className="flex justify-between items-start">
                           <div>
                              <div className="flex items-center gap-3 mb-2">
                                 <h3 className="text-lg font-black text-slate-900 dark:text-white">v{v.version_number} &middot; {v.country_code}</h3>
                                 <span className="bg-slate-100 dark:bg-slate-900 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase">{t(`paybands.basisType.${v.basis_type === 'BASE_SALARY' ? 'baseSalary' : v.basis_type === 'ANNUAL_TARGET_CASH' ? 'annualTargetCash' : 'totalGuaranteed'}`)}</span>
                                 {v.is_primary && <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"><CheckCircle2 className="w-3 h-3" /> {t('paybands.status.published')}</span>}
                              </div>
                              <div className="text-sm text-slate-500 font-semibold flex items-center gap-4">
                                 <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {v.structure_effective_start} to {v.structure_effective_end}</span>
                                 <span className="flex items-center gap-1.5"><Layers className="w-4 h-4" /> {v.pay_bands[0]?.count || 0} {t('paybands.labels.grades')}</span>
                              </div>
                              <div className="mt-3 text-[10px] font-mono text-slate-400">
                                 {t('paybands.labels.deployed')}: {new Date(v.published_at).toLocaleString()} | {t('paybands.labels.source_scenario')}: {v.source_scenario_id?.slice(0,8)} | {t('paybands.labels.hash')}: {v.config_hash?.slice(0,8)}
                              </div>
                           </div>

                           {!v.is_primary && (
                              <button onClick={() => setPrimary(v.id, v.country_code, v.basis_type)} className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm">
                                 {t('paybands.actions.publish')}
                              </button>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>

         <div className="md:col-span-1">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-6 sticky top-8">
               <h3 className="font-black text-lg flex items-center gap-3 text-slate-100">
                  <Activity className="w-5 h-5 text-indigo-400" /> {t('paybands.dashboard.active_resolution')}
               </h3>
               <p className="text-sm text-slate-400 font-medium">{t('paybands.dashboard.resolution_desc')}</p>
               
               <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('paybands.dashboard.target_country')}</label>
                     <input type="text" maxLength={2} value={testCountry} onChange={e=>setTestCountry(e.target.value.toUpperCase())} className="w-full bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 uppercase" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('paybands.wizard.step1.basis_type')}</label>
                     <select value={testBasis} onChange={e=>setTestBasis(e.target.value)} className="w-full bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500">
                        <option value="BASE_SALARY">{t('paybands.basisType.baseSalary')}</option>
                        <option value="ANNUAL_TARGET_CASH">{t('paybands.basisType.annualTargetCash')}</option>
                        <option value="TOTAL_GUARANTEED">{t('paybands.basisType.totalGuaranteed')}</option>
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('paybands.dashboard.as_of_date')}</label>
                     <input type="date" value={testDate} onChange={e=>setTestDate(e.target.value)} className="w-full bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500" />
                  </div>
               </div>

               <button onClick={handleTestResolution} disabled={isTesting} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg py-3 rounded-xl font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 transition-all disabled:opacity-50">
                  {isTesting ? t('paybands.dashboard.resolving') : t('paybands.dashboard.btn_resolve')} <Search className="w-4 h-4" />
               </button>

               {testResult && (
                  <div className="mt-4 p-4 rounded-xl text-sm font-mono break-all animate-in slide-in-from-bottom-2 bg-slate-950 border border-slate-800">
                     {testResult.error ? (
                        <span className="text-red-400">{testResult.error}</span>
                     ) : testResult.explanation ? (
                        <span className="text-amber-400">{testResult.explanation}</span>
                     ) : (
                        <div className="space-y-2">
                           <div className="text-emerald-400 flex items-center gap-2 font-bold mb-3"><CheckCircle2 className="w-4 h-4"/> {t('paybands.dashboard.match_found')}</div>
                           <div className="text-slate-300">{t('paybands.dashboard.version')}: <span className="text-white font-bold">{testResult.active_version?.version_number}</span></div>
                           <div className="text-slate-300">{t('paybands.labels.id')}: <span className="text-slate-500 text-xs">{testResult.active_version?.id}</span></div>
                           <div className="text-slate-300">{t('paybands.labels.bands')}: <span className="text-indigo-300 font-bold">{testResult.active_version?.pay_bands?.length} {t('paybands.dashboard.bands_loaded')}</span></div>
                        </div>
                     )}
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
