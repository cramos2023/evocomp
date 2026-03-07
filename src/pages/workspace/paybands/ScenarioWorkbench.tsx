import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { Play, CheckCircle2, AlertTriangle, ArrowLeft, Loader2, Info, ArrowRight, ShieldCheck, Layers } from 'lucide-react';

export default function ScenarioWorkbench() {
  const { t } = useTranslation();
  const { id: scenarioId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [scenario, setScenario] = useState<any>(null);
  const [runData, setRunData] = useState<any>(null);
  const [publishedVersionId, setPublishedVersionId] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    if (scenarioId) fetchScenario();
  }, [scenarioId]);

  async function fetchScenario() {
     try {
        const { data, error } = await supabase.from('payband_build_scenarios').select('*').eq('id', scenarioId).single();
        if (error) throw error;
        setScenario(data);
     } catch (err: any) {
        setErrorStatus(t('common.error') + ' - ' + t('paybands.wizard.common.back'));
     } finally {
        setIsLoading(false);
     }
  }

  const handleRun = async () => {
     setIsRunning(true);
     setErrorStatus(null);
     try {
        const { data, error } = await supabase.functions.invoke('payband-engine', {
           body: { action: 'run_payband_scenario', payload: { scenario_id: scenarioId } }
        });

        if (error) {
           let msg = error.message;
           if (error.context && typeof error.context.text === 'function') {
              msg = await error.context.text();
           }
           throw new Error(msg);
        }

        setRunData(data);
        await fetchScenario(); // refresh status
     } catch (err: any) {
        setErrorStatus(`${t('common.error')}: ${err.message}`);
     } finally {
        setIsRunning(false);
     }
  };

  const handlePublish = async () => {
     if (!runData?.run_id) return;
     if (!confirm(t('common.confirm'))) return;

     setIsPublishing(true);
     try {
        const { data, error } = await supabase.functions.invoke('payband-engine', {
           body: { action: 'publish_version', payload: { run_id: runData.run_id } }
        });

        if (error) {
           let msg = error.message;
           if (error.context && typeof error.context.text === 'function') {
              msg = await error.context.text();
           }
           throw new Error(msg);
        }

        setPublishedVersionId(data.version_id);
        await fetchScenario();
     } catch (err: any) {
        setErrorStatus(`${t('common.error')}: ${err.message}`);
     } finally {
        setIsPublishing(false);
     }
  };

  const handleMarkPrimary = async () => {
     if (!publishedVersionId) return;
     try {
         // Optionally reset others
         
         const { error } = await supabase.from('pay_band_versions').update({ is_primary: true }).eq('id', publishedVersionId);
         if (error) throw error;
         alert(t('paybands.imports.success'));
         navigate('/workspace/paybands');
     } catch (e: any) {
         alert(t('common.error') + ': ' + e.message);
     }
  };

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <button onClick={() => navigate('/workspace/paybands/builder/new')} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2 font-bold text-sm">
             <ArrowLeft className="w-4 h-4" /> {t('paybands.wizard.common.back')}
          </button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{t('paybands.workbench.title')}</h1>
          <p className="text-slate-500 font-bold mt-2">
            {scenario?.name} &middot; {scenario?.country_code} &middot; {scenario?.basis_type}
          </p>
        </div>
        
        <div className="flex gap-3">
           {!runData ? (
             <button 
                onClick={handleRun} disabled={isRunning}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
             >
                {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
                {t('paybands.workbench.btn_run')}
             </button>
           ) : !publishedVersionId ? (
             <button 
                onClick={handlePublish} disabled={isPublishing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
             >
                {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                {t('paybands.workbench.btn_publish')}
             </button>
           ) : (
             <button 
                onClick={handleMarkPrimary}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md"
             >
                <CheckCircle2 className="w-5 h-5" />
                {t('paybands.workbench.btn_primary')}
             </button>
           )}
        </div>
      </div>

      {errorStatus && (
         <div className="p-4 bg-red-50 text-red-700 font-bold border border-red-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{errorStatus}</p>
         </div>
      )}

      {/* Placeholder / Empty State */}
      {!runData && !errorStatus && (
         <div className="bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
               <Layers className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">{t('paybands.workbench.engine_ready')}</h3>
            <p className="text-slate-500 font-medium max-w-lg mx-auto">
               {t('paybands.workbench.engine_desc')}
            </p>
         </div>
      )}

      {/* Results View */}
      {runData && (
         <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Diagnostics Quality Report */}
            {runData.quality_report && (
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                     <AlertTriangle className="w-5 h-5 text-amber-500" />
                     <h3 className="font-black text-slate-800 dark:text-slate-200">{t('paybands.workbench.data_quality')}</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('paybands.workbench.warnings')}</h4>
                        {runData.quality_report.warnings?.length === 0 ? (
                           <p className="text-sm font-semibold text-emerald-600">{t('paybands.workbench.no_warnings')}</p>
                        ) : (
                           <ul className="text-sm text-amber-700 space-y-1 list-disc pl-4 font-semibold">
                              {runData.quality_report.warnings?.map((w: string, i: number) => <li key={i}>{w}</li>)}
                           </ul>
                        )}
                        {runData.quality_report.missing_basis_field && (
                           <p className="text-sm font-bold text-red-600 mt-2">{t('paybands.workbench.critical_basis_msg')}</p>
                        )}
                     </div>
                     <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('paybands.workbench.exclusions')}</h4>
                        {runData.quality_report.exclusions?.length === 0 ? (
                           <p className="text-sm font-semibold text-emerald-600">{t('paybands.workbench.no_exclusions')}</p>
                        ) : (
                           <ul className="text-sm text-red-600 space-y-1 list-disc pl-4 font-semibold">
                              {runData.quality_report.exclusions?.map((e: string, i: number) => <li key={i}>{e}</li>)}
                           </ul>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {/* Generated Pay Bands Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
               <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                  <h3 className="font-black text-slate-800 dark:text-slate-200">{t('paybands.workbench.generated_bands')}</h3>
                  <div className="text-sm font-bold text-slate-500">
                     {t('paybands.labels.run_hash')}: <code className="bg-white px-2 py-1 rounded border shadow-inner text-xs">{runData.run_id?.slice(0,8)}...</code>
                  </div>
               </div>
               
               <div className="overflow-x-auto">
                  <table className="w-full text-left font-semibold">
                     <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
                        <tr>
                           <th className="px-6 py-4">{t('paybands.labels.internal_grade')}</th>
                           <th className="px-6 py-4">{t('paybands.labels.market_mid_aged')}</th>
                           <th className="px-6 py-4 text-indigo-700 dark:text-indigo-400">{t('paybands.labels.proposed_min')}</th>
                           <th className="px-6 py-4 text-indigo-700 dark:text-indigo-400">{t('paybands.labels.proposed_mid')}</th>
                           <th className="px-6 py-4 text-indigo-700 dark:text-indigo-400">{t('paybands.labels.proposed_max')}</th>
                           <th className="px-6 py-4 text-center">{t('paybands.labels.spread')}</th>
                           <th className="px-6 py-4">{t('paybands.wizard.step1.currency')}</th>
                           <th className="px-6 py-4 text-right">{t('paybands.labels.explainability')}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {runData.outputs?.map((row: any) => (
                           <tr key={row.grade} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                              <td className="px-6 py-4 font-black text-slate-800 dark:text-slate-200">{row.grade}</td>
                              <td className="px-6 py-4 text-slate-500">{row.aged_market_mid.toLocaleString()}</td>
                              <td className="px-6 py-4 text-indigo-900 dark:text-indigo-50">{row.proposed_min.toLocaleString()}</td>
                              <td className="px-6 py-4 text-indigo-900 dark:text-indigo-50 font-black">{row.proposed_mid.toLocaleString()}</td>
                              <td className="px-6 py-4 text-indigo-900 dark:text-indigo-50">{row.proposed_max.toLocaleString()}</td>
                              <td className="px-6 py-4 text-center">
                                 <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs">
                                    {row.range_spread}%
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-slate-400 text-sm">{row.currency}</td>
                              <td className="px-6 py-4 text-right">
                                 <div className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded text-[10px] uppercase font-bold" title={`Previous Mid: ${row.explainability_json?.previous_midpoint}`}>
                                    <Info className="w-3 h-3" />
                                    {row.explainability_json?.applied_guideline || t('paybands.workbench.standard_guideline')}
                                 </div>
                              </td>
                           </tr>
                        ))}

                        {(!runData.outputs || runData.outputs.length === 0) && (
                           <tr>
                              <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-bold">
                                 {t('paybands.workbench.no_data')}
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

         </div>
      )}

    </div>
  );
}
