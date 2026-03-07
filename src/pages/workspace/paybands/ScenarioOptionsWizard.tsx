import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { ArrowRight, ArrowLeft, CheckCircle2, ChevronRight, Save, Layers, Settings2, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

export default function ScenarioOptionsWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isPreloading, setIsPreloading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Preloaded references
  const [refs, setRefs] = useState<{
     aging: any[], guidelines: any[], range: any[], quality: any[], grades: string[]
  }>({ aging: [], guidelines: [], range: [], quality: [], grades: [] });

  // STEP 1 State
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [basisType, setBasisType] = useState('BASE_SALARY');
  const [pricingDate, setPricingDate] = useState('');
  const [effStart, setEffStart] = useState('');
  const [effEnd, setEffEnd] = useState('');

  // STEP 2 State
  const [weightMode, setWeightMode] = useState<'GLOBAL' | 'BY_GRADE'>('GLOBAL');
  const [globalWeights, setGlobalWeights] = useState({ MERCER: 0, WTW: 0, THIRD: 0 });
  const [weightsByGrade, setWeightsByGrade] = useState<Record<string, {MERCER:number,WTW:number,THIRD:number}>>({});

  // STEP 3 State
  const [agingId, setAgingId] = useState('');
  const [guidelinesId, setGuidelinesId] = useState('');
  const [rangeId, setRangeId] = useState('');
  const [dataQualityId, setDataQualityId] = useState('');

  useEffect(() => {
    preloadData();
  }, []);

  useEffect(() => {
    // If country changes, refresh the unique grades list available for step 2 Mode B.
    if (tenantId && countryCode.length === 2 && currentStep === 1) {
       fetchMappingsByCountry(tenantId, countryCode.toUpperCase());
    }
  }, [countryCode, tenantId, currentStep]);

  async function fetchMappingsByCountry(tid: string, cc: string) {
     const { data } = await supabase.from('vendor_grade_mappings')
        .select('pay_grade_internal')
        .eq('tenant_id', tid)
        .or(`country_code.eq.${cc},country_code.is.null`);
     
     if (data) {
        const unique = Array.from(new Set(data.map((m: any) => m.pay_grade_internal as string))).sort();
        setRefs(prev => ({ ...prev, grades: unique }));
        
        const wbg: Record<string, any> = {};
        for(const g of unique) {
           wbg[g] = weightsByGrade[g] || { MERCER: 0, WTW: 0, THIRD: 0 };
        }
        setWeightsByGrade(wbg);
     }
  }

  async function preloadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      const tid = profile?.tenant_id;
      setTenantId(tid);

      if (tid) {
         const [agingRes, guideRes, rangeRes, qualRes] = await Promise.all([
            supabase.from('aging_policies').select('id, name, method').eq('tenant_id', tid),
            supabase.from('guidelines_policies').select('id, name').eq('tenant_id', tid),
            supabase.from('range_design_policies').select('id, name, min_ratio, max_ratio').eq('tenant_id', tid),
            supabase.from('data_quality_policies').select('id, name, obs_count_min, org_count_min, low_sample_treatment').eq('tenant_id', tid)
         ]);

         setRefs({
            aging: agingRes.data || [],
            guidelines: guideRes.data || [],
            range: rangeRes.data || [],
            quality: qualRes.data || [],
            grades: []
         });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPreloading(false);
    }
  }

  const handleStep1Submit = async (e: React.FormEvent) => {
     e.preventDefault();
     setStepError(null);
     if (countryCode.length !== 2) return setStepError('Country Code must be a 2-letter ISO (e.g., US, CL)');
     if (!name || !pricingDate || !effStart || !effEnd) return setStepError('All fields are required.');
     if (effStart > effEnd) return setStepError('Effective Start must be before or equal to Effective End.');

     setIsProcessing(true);
     try {
        const payload = {
           name,
           country_code: countryCode.toUpperCase(),
           basis_type: basisType,
           pricing_date: pricingDate,
           structure_effective_start: effStart,
           structure_effective_end: effEnd,
           status: 'DRAFT',
           tenant_id: tenantId
        };
        
        if (scenarioId) {
           // Update
           const { error } = await supabase.from('payband_build_scenarios').update(payload).eq('id', scenarioId);
           if (error) throw error;
        } else {
           // Insert
           const { data, error } = await supabase.from('payband_build_scenarios').insert(payload).select().single();
           if (error) throw error;
           setScenarioId(data.id);
        }
        setCurrentStep(2);
     } catch (err: any) {
        setStepError(err.message);
     } finally {
        setIsProcessing(false);
     }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
     e.preventDefault();
     setStepError(null);
     setIsProcessing(true);

     try {
        // Validate with Edge Function
        const payloadToValidate = {
           globalWeights: weightMode === 'GLOBAL' ? globalWeights : null,
           weightsByGrade: weightMode === 'BY_GRADE' ? weightsByGrade : null
        };
        
        const { data, error } = await supabase.functions.invoke('payband-engine', {
           body: { action: 'validate_weights', payload: payloadToValidate }
        });

        if (error || !data.isValid) {
           const errs = data?.errors?.join(', ') || error?.message || 'Invalid weights.';
           throw new Error(errs);
        }

        // Persist to DB
        const { error: dbErr } = await supabase.from('payband_build_scenarios').update({
           vendor_weights_json: weightMode === 'GLOBAL' ? globalWeights : {},
           vendor_weights_by_grade_json: weightMode === 'BY_GRADE' ? weightsByGrade : null,
           status: 'RUNNABLE' // Since 1 & 2 are complete
        }).eq('id', scenarioId!);

        if (dbErr) throw dbErr;
        setCurrentStep(3);

     } catch (err: any) {
        setStepError(err.message);
     } finally {
        setIsProcessing(false);
     }
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
     e.preventDefault();
     setStepError(null);
     if (!agingId || !guidelinesId || !rangeId || !dataQualityId) {
        return setStepError('You must select a policy for each category.');
     }

     setIsProcessing(true);
     try {
        const { error } = await supabase.from('payband_build_scenarios').update({
           aging_policy_id: agingId,
           guidelines_policy_id: guidelinesId,
           range_design_policy_id: rangeId,
           data_quality_policy_id: dataQualityId,
           status: 'RUNNABLE'
        }).eq('id', scenarioId!);

        if (error) throw error;
        
        // Redirect to Workbench
        navigate(`/workspace/paybands/builder/${scenarioId}`);
     } catch (err: any) {
        setStepError(err.message);
        setIsProcessing(false);
     }
  };

  if (isPreloading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <button onClick={() => navigate('/workspace/paybands')} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-2 font-bold text-sm">
             <ArrowLeft className="w-4 h-4" /> {t('paybands.dashboard.back_dashboard')}
          </button>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{t('paybands.dashboard.start_modeling')}</h1>
          <p className="text-slate-500 font-bold mt-2">{t('paybands.wizard.step1.desc')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 pb-6">
         {[
            { step: 1, label: t('paybands.wizard.step1.title'), icon: Layers },
            { step: 2, label: t('paybands.wizard.step2.title'), icon: Settings2 },
            { step: 3, label: t('paybands.wizard.step3.title'), icon: ShieldCheck }
         ].map((s) => (
            <div key={s.step} className="flex-1 text-center flex flex-col items-center">
               <div className={`w-12 h-12 flex items-center justify-center rounded-full border-2 text-lg font-black transition-all ${
                  currentStep === s.step ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900' :
                  currentStep > s.step ? 'bg-emerald-500 text-white border-emerald-500' :
                  'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
               }`}>
                  {currentStep > s.step ? <CheckCircle2 className="w-6 h-6" /> : <s.icon className="w-6 h-6" />}
               </div>
               <span className={`mt-3 text-xs font-bold uppercase tracking-widest ${
                  currentStep === s.step ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-400'
               }`}>
                  {s.label}
               </span>
            </div>
         ))}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm p-8">
         {stepError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-sm font-bold flex items-start gap-3 animate-in slide-in-from-top-4">
               <AlertTriangle className="w-5 h-5 shrink-0" />
               <p>{stepError}</p>
            </div>
         )}

         {/* STEP 1: IDENTITY */}
         {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <h2 className="text-xl font-black border-b border-slate-100 dark:border-slate-700 pb-4">1. {t('paybands.wizard.step1.title')}</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2">
                     <label className="text-xs font-bold text-slate-500 uppercase">{t('paybands.wizard.step1.scenario_name')}</label>
                     <input required autoFocus type="text" value={name} onChange={e=>setName(e.target.value)} placeholder={t('paybands.wizard.step1.scenario_name')} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase">{t('paybands.wizard.step1.country')}</label>
                     <input required type="text" maxLength={2} value={countryCode} onChange={e=>setCountryCode(e.target.value.toUpperCase())} placeholder={t('paybands.wizard.step1.country')} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none uppercase" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase">{t('paybands.wizard.step1.basis_type')}</label>
                     <select required value={basisType} onChange={e=>setBasisType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="BASE_SALARY">{t('paybands.basisType.baseSalary')}</option>
                        <option value="ANNUAL_TARGET_CASH">{t('paybands.basisType.annualTargetCash')}</option>
                        <option value="TOTAL_GUARANTEED">{t('paybands.basisType.totalGuaranteed')}</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase">{t('paybands.wizard.step1.pricing_date')}</label>
                     <input required type="date" value={pricingDate} onChange={e=>setPricingDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase">{t('paybands.wizard.step1.effective_dates')}</label>
                     <div className="flex items-center gap-2">
                        <input required type="date" value={effStart} onChange={e=>setEffStart(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <span className="text-slate-400 font-bold">{t('paybands.wizard.common.to')}</span>
                        <input required type="date" value={effEnd} onChange={e=>setEffEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                     </div>
                  </div>
               </div>
               
               <div className="flex justify-end pt-4">
                  <button type="submit" disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50">
                     {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('paybands.wizard.common.next')}
                     {!isProcessing && <ChevronRight className="w-4 h-4" />}
                  </button>
               </div>
            </form>
         )}

         {/* STEP 2: MARKET MIX WEIGHTS */}
         {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <h2 className="text-xl font-black border-b border-slate-100 dark:border-slate-700 pb-4 flex justify-between items-center">
                  <span>2. {t('paybands.wizard.step2.title')}</span>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                     <button type="button" onClick={() => setWeightMode('GLOBAL')} className={`px-4 py-1.5 text-xs font-bold rounded-md ${weightMode === 'GLOBAL' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>{t('paybands.wizard.step2.mode_global')}</button>
                     <button type="button" onClick={() => setWeightMode('BY_GRADE')} className={`px-4 py-1.5 text-xs font-bold rounded-md ${weightMode === 'BY_GRADE' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>{t('paybands.wizard.step2.mode_grade')}</button>
                  </div>
               </h2>

               {weightMode === 'GLOBAL' && (
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 space-y-6">
                     <p className="text-sm font-semibold text-slate-500">{t('paybands.wizard.step2.desc')}</p>
                     <div className="flex gap-6">
                        {['MERCER', 'WTW', 'THIRD'].map(prov => (
                           <div key={prov} className="flex-1 space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase">{prov} {t('paybands.wizard.step2.weight_label')}</label>
                              <div className="relative">
                                 <input 
                                    type="number" step="0.01" min="0" max="1" required
                                    value={(globalWeights as any)[prov]}
                                    onChange={e => setGlobalWeights({...globalWeights, [prov]: Number(e.target.value)})}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 font-bold text-center focus:ring-2 focus:ring-indigo-500" 
                                 />
                                 <span className="absolute right-4 top-2 text-slate-400 font-bold">x</span>
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="text-right text-xs font-bold text-slate-400">{t('paybands.wizard.step2.total_sum')}: {(globalWeights.MERCER + globalWeights.WTW + globalWeights.THIRD).toFixed(2)} {t('paybands.wizard.step2.must_equal_1')}</div>
                  </div>
               )}

               {weightMode === 'BY_GRADE' && (
                  <div className="space-y-4">
                     {refs.grades.length === 0 ? (
                        <div className="p-4 bg-amber-50 text-amber-700 text-sm font-bold border border-amber-200 rounded-lg flex gap-2"><AlertTriangle className="w-5 h-5"/> {t('paybands.wizard.step2.no_mappings')}</div>
                     ) : (
                        <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                           {refs.grades.map(grade => (
                              <div key={grade} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                 <div className="w-32 font-black text-slate-700 dark:text-slate-300">{grade}</div>
                                 {['MERCER', 'WTW', 'THIRD'].map(prov => (
                                    <div key={prov} className="flex items-center gap-2">
                                       <span className="text-[10px] uppercase font-bold text-slate-400">{prov}</span>
                                       <input 
                                          type="number" step="0.01" min="0" max="1" 
                                          value={weightsByGrade[grade][prov as 'MERCER'|'WTW'|'THIRD']}
                                          onChange={e => setWeightsByGrade({
                                             ...weightsByGrade, 
                                             [grade]: { ...weightsByGrade[grade], [prov]: Number(e.target.value) }
                                          })}
                                          className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-sm font-semibold text-center" 
                                       />
                                    </div>
                                 ))}
                                 <div className="flex-1 text-right text-xs font-bold text-slate-400">
                                    {t('paybands.wizard.step2.sum')}: {(weightsByGrade[grade].MERCER + weightsByGrade[grade].WTW + weightsByGrade[grade].THIRD).toFixed(2)}
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}

               <div className="flex justify-between pt-4">
                  <button type="button" onClick={() => setCurrentStep(1)} className="text-xl font-bold text-slate-400 hover:text-slate-600 transition-colors p-2"><ArrowLeft className="w-6 h-6"/></button>
                  <button type="submit" disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50">
                     {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('paybands.wizard.common.next')}
                     {!isProcessing && <ChevronRight className="w-4 h-4" />}
                  </button>
               </div>
            </form>
         )}

         {/* STEP 3: POLICIES */}
         {currentStep === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <h2 className="text-xl font-black border-b border-slate-100 dark:border-slate-700 pb-4">3. {t('paybands.wizard.step3.title')}</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Aging Policy */}
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                        <span>{t('paybands.wizard.step2.aging_policy')}</span>
                        <a href="/workspace/settings/policies" target="_blank" className="text-indigo-500 hover:underline">{t('paybands.wizard.step3.manage')}</a>
                     </label>
                     <select required value={agingId} onChange={e=>setAgingId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500">
                        <option value="" disabled>{t('paybands.wizard.step3.select_policy')}</option>
                        {refs.aging.map(p => <option key={p.id} value={p.id}>{p.name} ({p.method})</option>)}
                     </select>
                  </div>
                  
                  {/* Guidelines Policy */}
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                        <span>{t('paybands.wizard.step3.guidelines_title')}</span>
                     </label>
                     <select required value={guidelinesId} onChange={e=>setGuidelinesId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500">
                        <option value="" disabled>{t('paybands.wizard.step3.select_policy')}</option>
                        {refs.guidelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                  </div>

                  {/* Range Design */}
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                        <span>{t('paybands.wizard.step2.range_policy')}</span>
                     </label>
                     <select required value={rangeId} onChange={e=>setRangeId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500">
                        <option value="" disabled>{t('paybands.wizard.step3.select_policy')}</option>
                        {refs.range.map(p => <option key={p.id} value={p.id}>{p.name} ({(p.min_ratio*100).toFixed(0)}% - {(p.max_ratio*100).toFixed(0)}%)</option>)}
                     </select>
                  </div>

                  {/* Data Quality */}
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                        <span>{t('paybands.wizard.step2.quality_policy')}</span>
                     </label>
                     <select required value={dataQualityId} onChange={e=>setDataQualityId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500">
                        <option value="" disabled>{t('paybands.wizard.step3.select_policy')}</option>
                        {refs.quality.map(p => <option key={p.id} value={p.id}>{p.name} ({p.low_sample_treatment})</option>)}
                     </select>
                  </div>
               </div>

               <div className="flex justify-between pt-8 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setCurrentStep(2)} className="text-xl font-bold text-slate-400 hover:text-slate-600 transition-colors p-2"><ArrowLeft className="w-6 h-6"/></button>
                  <button type="submit" disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50">
                     {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                     {t('paybands.wizard.step3.run')}
                  </button>
               </div>
            </form>
         )}

      </div>
    </div>
  );
}
