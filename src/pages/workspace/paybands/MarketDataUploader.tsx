import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUp, Search, CheckCircle2, AlertTriangle, ArrowRight, Loader2, FileSpreadsheet, HelpCircle, Download } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import PayBandsGuideDrawer from '../../../components/paybands/PayBandsGuideDrawer';

export default function MarketDataUploader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  const [provider, setProvider] = useState<'MERCER' | 'WTW' | 'THIRD'>('MERCER');
  const [pricingScope, setPricingScope] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [errorReport, setErrorReport] = useState<{valid: number, invalid: number, errors: string[]} | null>(null);
  const [successImportId, setSuccessImportId] = useState<string | null>(null);

  function handleDownloadTemplate() {
    const headers = [
      'provider',
      'country_code',
      'currency',
      'vendor_level_code',
      'market_effective_date',
      'org_count',
      'obs_count',
      'base_salary_p50',
      'target_cash_p50',
      'total_guaranteed_p50',
      'vendor_job_code',
      'vendor_job_title',
      'industry_cut',
      'size_cut',
      'geo_cut',
      'notes'
    ];

    const sampleRow = [
      'MERCER', 'US', 'USD', '51', '2025-01-01',
      '25', '140', '120000', '135000', '140000',
      'PRO-3', 'Senior Software Engineer', 'Technology', 'Large', 'National', ''
    ];

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'evocomp_market_data_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    
    try {
      const text = await selected.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error(t('paybands.imports.empty_error'));

      const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1);
      
      const parsed = rows.map(rowStr => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of rowStr) {
          if (char === '"') { inQuotes = !inQuotes; }
          else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
          else { current += char; }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));

        const data: any = {};
        rawHeaders.forEach((header, index) => {
          data[header] = values[index] || '';
        });
        return data;
      });
      
      setHeaders(rawHeaders);
      setParsedRows(parsed);
      setErrorReport(null); // Reset errors on new file
      setSuccessImportId(null);
    } catch (err: any) {
      alert(t('common.error') + " " + err.message);
      setFile(null);
      setParsedRows([]);
    }
  };

  const handleUpload = async () => {
    if (!file || parsedRows.length === 0) return;
    setIsUploading(true);
    setErrorReport(null);
    setSuccessImportId(null);

    try {
      const payload = {
         provider,
         pricing_scope: pricingScope,
         source_filename: file.name,
         rows: parsedRows
      };

      const { data, error } = await supabase.functions.invoke('payband-engine', {
        body: { action: 'validate_market_import', payload }
      });

      if (error) {
         let msg = error.message;
         if (error.context && typeof error.context.text === 'function') {
           msg = await error.context.text();
         }
         throw new Error(msg);
      }

      const res = data;
      setErrorReport({
         valid: res.valid,
         invalid: res.invalid,
         errors: res.errors || []
      });

      if (res.status === 'COMPLETED' || res.status === 'PARTIAL_SUCCESS') {
         setSuccessImportId(res.import_id);
      }
      
    } catch (err: any) {
      alert(t('common.error') + " " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <PayBandsGuideDrawer 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
        initialPhase="prepareData" 
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{t('paybands.imports.title')}</h1>
          <p className="text-slate-500 font-bold mt-2">{t('paybands.imports.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleDownloadTemplate}
            className="group flex items-center justify-center gap-2 bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-500 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
          >
            <Download className="w-4 h-4 text-emerald-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors" />
            {t('pages.pay_bands.download_template', 'Download Template')} (CSV)
          </button>
          <button 
             onClick={() => setIsGuideOpen(true)}
             className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" /> {t('common.help', { defaultValue: 'Help' })}
          </button>
          <button 
             onClick={() => navigate('/workspace/paybands')}
             className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            {t('paybands.wizard.common.back')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Metadata Card */}
         <div className="col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
            <h2 className="font-bold text-lg">{t('paybands.dashboard.manage_imports')}</h2>
            
            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase">{t('paybands.wizard.step2.weights').replace(' (%)', '')} Provider</label>
               <select 
                  value={provider} 
                  onChange={e => setProvider(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 transition-all"
               >
                  <option value="MERCER">{t('paybands.providers.MERCER')}</option>
                  <option value="WTW">{t('paybands.providers.WTW')}</option>
                  <option value="THIRD">{t('paybands.providers.THIRD')}</option>
               </select>
            </div>

            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase">{t('paybands.dashboard.manage_imports')} Scope</label>
               <input 
                  type="text" 
                  value={pricingScope}
                  onChange={e => setPricingScope(e.target.value)}
                  placeholder={t('paybands.imports.scope_placeholder')}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 transition-all"
               />
            </div>
         </div>

         {/* Upload Card */}
         <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-center">
            {!file ? (
               <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-indigo-400 transition-all group"
               >
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <FileUp className="w-8 h-8 text-indigo-500" />
                  </div>
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-lg">{t('paybands.imports.dragDropHint')}</p>
                  <p className="text-slate-400 text-sm mt-2">{t('paybands.imports.required_columns_hint')}</p>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
               </div>
            ) : (
               <div className="space-y-6">
                  <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                     <div className="flex items-center gap-4">
                        <FileSpreadsheet className="w-8 h-8 text-indigo-500" />
                        <div>
                           <p className="font-bold text-indigo-900 dark:text-indigo-200">{file.name}</p>
                           <p className="text-xs text-indigo-600 font-semibold">{parsedRows.length} rows parsed</p>
                        </div>
                     </div>
                     <button onClick={() => { setFile(null); setParsedRows([]); setErrorReport(null); }} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-indigo-200">{t('paybands.imports.change_file')}</button>
                  </div>

                  {!successImportId && !isUploading && (
                     <button onClick={handleUpload} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg flex justify-center items-center gap-2">
                        {t('paybands.imports.btn_upload')} <ArrowRight className="w-5 h-5" />
                     </button>
                  )}

                  {isUploading && (
                     <button disabled className="w-full bg-slate-200 dark:bg-slate-700 text-slate-500 font-black py-4 rounded-xl flex justify-center items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> {t('paybands.imports.uploading')}
                     </button>
                  )}
               </div>
            )}
         </div>
      </div>

      {/* Results / Errors */}
      {errorReport && (
         <div className={`p-6 rounded-2xl border ${errorReport.invalid === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} animate-in slide-in-from-bottom-4 duration-500`}>
            <div className="flex items-start gap-4">
               {errorReport.invalid === 0 ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
               ) : (
                  <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
               )}
               <div className="flex-1">
                  <h3 className={`text-xl font-black tracking-tight ${errorReport.invalid === 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                     {errorReport.invalid === 0 ? t('paybands.imports.success') : t('paybands.imports.error')}
                  </h3>
                  <p className={`font-semibold mt-1 ${errorReport.invalid === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                     {errorReport.valid} valid records stored. {errorReport.invalid} invalid records rejected.
                  </p>

                  {errorReport.errors.length > 0 && (
                     <div className="mt-4 bg-white/50 rounded-xl p-4 border border-red-200 max-h-48 overflow-y-auto">
                        <ul className="text-xs font-mono text-red-700 space-y-1">
                           {errorReport.errors.map((err, idx) => (
                              <li key={idx}>• {err}</li>
                           ))}
                        </ul>
                     </div>
                  )}

                  {successImportId && (
                     <div className="mt-6 flex gap-4">
                        <button onClick={() => navigate('/workspace/paybands')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md">
                           {t('paybands.dashboard.back_dashboard')}
                        </button>
                        <button onClick={() => { setFile(null); setErrorReport(null); setSuccessImportId(null); }} className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-2 rounded-xl font-bold transition-all border border-slate-200 shadow-sm">{t('paybands.imports.upload_another')}</button>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

   </div>
  );
}
