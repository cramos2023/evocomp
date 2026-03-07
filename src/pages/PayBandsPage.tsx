import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, DollarSign, Layers, TrendingUp, X, AlertCircle, Upload, Download, CheckCircle2, Trash2, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { downloadXlsx, triggerXlsxExport } from '../utils/xlsx';

const BASIS_OPTIONS = ['BASE_SALARY', 'ANNUAL_TARGET_CASH', 'TOTAL_GUARANTEED'];
const BASIS_COLORS: Record<string, string> = {
  BASE_SALARY: 'bg-blue-100 text-blue-700', ANNUAL_TARGET_CASH: 'bg-indigo-100 text-indigo-700', TOTAL_GUARANTEED: 'bg-purple-100 text-purple-700',
};

const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' }, { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' }, { code: 'CO', name: 'Colombia' }, { code: 'CL', name: 'Chile' },
  { code: 'AR', name: 'Argentina' }, { code: 'PE', name: 'Peru' }, { code: 'ES', name: 'Spain' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' }, { code: 'IT', name: 'Italy' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'PT', name: 'Portugal' }, { code: 'NL', name: 'Netherlands' }
].sort((a,b) => a.name.localeCompare(b.name));

const CURRENCY_OPTIONS = [
  'USD', 'EUR', 'GBP', 'BRL', 'MXN', 'COP', 'CLP', 'ARS', 'PEN', 'CAD', 'CHF'
].sort();

interface Band {
  id: string; grade: string; basis_type: string; country_code: string | null; currency: string | null;
  min_salary: number; midpoint: number; max_salary: number; spread: number | null;
  effective_year: number; effective_month: number;
}

const PayBandsPage = () => {
  const { t } = useTranslation();
  const [bands, setBands]             = useState<Band[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterBasis, setFilterBasis] = useState('ALL');
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [filterYear, setFilterYear]   = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [showCreate, setShowCreate]   = useState(false);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [form, setForm] = useState({ grade: '', basis_type: 'BASE_SALARY', country_code: '', currency: '', min_salary: '', midpoint: '', max_salary: '', effective_year: currentYear.toString(), effective_month: currentMonth.toString() });
  const [formError, setFormError]     = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bandToDelete, setBandToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fxRates, setFxRates] = useState<any[]>([]);
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { 
    fetchBands(); 
    fetchFXRates();
  }, []);

  async function fetchFXRates() {
    try {
      const { data, error } = await supabase.from('fx_rates').select('*').order('date', { ascending: false });
      if (error) throw error;
      setFxRates(data || []);
    } catch (err) { console.error('FX Fetch error:', err); }
  }

  async function fetchBands() {
    try {
      // Order by Latest Period -> Country Code -> Grade -> Basis Type
      const { data, error } = await supabase
        .from('pay_bands')
        .select('id, grade, basis_type, country_code, currency, min_salary, midpoint, max_salary, spread, effective_year, effective_month')
        .order('effective_year', { ascending: false })
        .order('effective_month', { ascending: false })
        .order('country_code', { ascending: true, nullsFirst: false })
        .order('grade', { ascending: true })
        .order('basis_type', { ascending: true });
        
      if (error) throw error;
      setBands((data as Band[]) || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleUpdateBand(id: string, updates: Partial<Band>) {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('pay_bands').update(updates).eq('id', id);
      if (error) throw error;
      await fetchBands();
    } catch (err) {
      console.error('Update error:', err);
      alert('Error updating band');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteBand() {
    if (!bandToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('pay_bands').delete().eq('id', bandToDelete);
      if (error) throw error;
      setBandToDelete(null);
      await fetchBands();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting band');
    } finally {
      setIsDeleting(false);
    }
  }

  const filtered = bands.filter(b => {
    const matchSearch = !search || b.grade.toLowerCase().includes(search.toLowerCase());
    // Robust match for basis_type (handles potential case mismatches or data glitches)
    const matchBasis  = filterBasis === 'ALL' || b.basis_type.toUpperCase() === filterBasis.toUpperCase();
    const matchCountry = filterCountry === 'ALL' || (b.country_code && b.country_code.toUpperCase() === filterCountry.toUpperCase());
    const matchYear = filterYear === 'ALL' || b.effective_year.toString() === filterYear;
    const matchMonth = filterMonth === 'ALL' || b.effective_month.toString() === filterMonth;
    return matchSearch && matchBasis && matchCountry && matchYear && matchMonth;
  });

  const activeBands = filtered.length > 0 ? filtered : [];
  
  const avgSpread = activeBands.length > 0
    ? (activeBands.reduce((s, b) => { 
        const sp = ((b.max_salary - b.min_salary) / b.min_salary * 100); 
        return s + sp; 
      }, 0) / activeBands.length).toFixed(0) : '—';

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.grade) { setFormError(t('merit.error_grade_required')); return; }
    if (!form.min_salary || !form.midpoint || !form.max_salary) { setFormError(t('merit.error_band_amounts_required')); return; }
    setFormLoading(true); setFormError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.tenant_id) throw new Error('No tenant found for user');

      const { error } = await supabase.from('pay_bands').insert({
        tenant_id: profile.tenant_id,
        grade: form.grade.trim().toUpperCase(), basis_type: form.basis_type,
        country_code: form.country_code.trim().toUpperCase() || null, currency: form.currency.trim().toUpperCase() || null,
        min_salary: parseFloat(form.min_salary), midpoint: parseFloat(form.midpoint), max_salary: parseFloat(form.max_salary),
        effective_year: parseInt(form.effective_year), effective_month: parseInt(form.effective_month)
      });
      if (error) throw error;
      setShowCreate(false); setForm({ grade: '', basis_type: 'BASE_SALARY', country_code: '', currency: '', min_salary: '', midpoint: '', max_salary: '', effective_year: currentYear.toString(), effective_month: currentMonth.toString() });
      await fetchBands();
    } catch (err: any) { setFormError(err.message || 'Error'); }
    finally { setFormLoading(false); }
  }

  function handleDownloadTemplate() {
    const headers = [
      'grade', 'country_code', 'currency', 'effective_year', 'effective_month',
      'base_min', 'base_mid', 'base_max',
      'target_cash_min', 'target_cash_mid', 'target_cash_max',
      'total_guar_min', 'total_guar_mid', 'total_guar_max'
    ];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const csvContent = [
      headers.join(','), 
      ['G', 'CL', 'CLP', currentYear.toString(), currentMonth.toString(), '1000', '1500', '2000', '1200', '1800', '2400', '', '', ''].join(','),
      ['H', 'CO', 'COP', currentYear.toString(), currentMonth.toString(), '5000', '6000', '7000', '', '', '', '', '', ''].join(',')
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pay_bands_template_wide.csv';
    link.click();
  }

  async function handleExportXlsx() {
    setIsExporting(true);
    try {
      await triggerXlsxExport('export-pay-bands-xlsx', {
        search,
        filterBasis,
        filterCountry,
        filterYear,
        filterMonth
      }, supabase);
    } catch (err: any) {
      alert('Error exporting XLSX: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const text = await file.text();
      const rows = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) throw new Error('No tenant found for user');

      const parsedBands: Omit<Band, 'id' | 'spread'>[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        // Simple CSV split (doesn't handle commas inside quotes cleanly, but suffices for amounts without commas)
        const columns = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => { rowData[h] = columns[idx] || ''; });
        
        if (!rowData.grade) continue;
        
        const country = rowData.country_code ? rowData.country_code.toUpperCase().substring(0,2) : null;
        const curr = rowData.currency ? rowData.currency.toUpperCase().substring(0,3) : null;
        const eYear = rowData.effective_year ? parseInt(rowData.effective_year) : currentYear;
        const eMonth = rowData.effective_month ? parseInt(rowData.effective_month) : currentMonth;
        
        // Helper to extract and push a band if min/mid/max are present
        const pushBand = (basisType: string, prefix: string) => {
          const min = parseFloat(rowData[`${prefix}_min`]);
          const mid = parseFloat(rowData[`${prefix}_mid`]);
          const max = parseFloat(rowData[`${prefix}_max`]);
          
          if (!isNaN(min) && !isNaN(mid) && !isNaN(max)) {
            parsedBands.push({
              tenant_id: profile.tenant_id,
              grade: rowData.grade.toUpperCase(),
              basis_type: basisType,
              country_code: country,
              currency: curr,
              effective_year: eYear,
              effective_month: eMonth,
              min_salary: min,
              midpoint: mid,
              max_salary: max
            } as any);
          }
        };

        // Old format fallback (if they upload the old template)
        if (rowData.min_salary && rowData.midpoint && rowData.max_salary) {
           parsedBands.push({
             tenant_id: profile.tenant_id,
             grade: rowData.grade.toUpperCase(),
             basis_type: rowData.basis_type || 'BASE_SALARY',
             country_code: country,
             currency: curr,
             effective_year: eYear,
             effective_month: eMonth,
             min_salary: parseFloat(rowData.min_salary),
             midpoint: parseFloat(rowData.midpoint),
             max_salary: parseFloat(rowData.max_salary)
           } as any);
        } else {
           // New Wide Format
           pushBand('BASE_SALARY', 'base');
           pushBand('ANNUAL_TARGET_CASH', 'target_cash');
           pushBand('TOTAL_GUARANTEED', 'total_guar');
        }
      }
      
      if (parsedBands.length === 0) throw new Error('No valid rows found in CSV');
      
      const { error } = await supabase.from('pay_bands').insert(parsedBands);
      if (error) throw error;
      
      setUploadMessage({ type: 'success', text: t('pages.pay_bands.upload_success', { count: parsedBands.length }) || `Successfully uploaded ${parsedBands.length} bands.` });
      await fetchBands();
    } catch (err: any) {
      console.error(err);
      setUploadMessage({ type: 'error', text: t('pages.pay_bands.upload_error') || 'Error uploading CSV: ' + err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadMessage(null), 5000);
    }
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none mb-3">
            {t('pages.pay_bands.title')}
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-lg font-bold">{t('pages.pay_bands.subtitle')}</p>
          {uploadMessage && (
            <div className={`mt-4 p-4 text-sm font-bold flex items-center gap-2 rounded-xl border ${uploadMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {uploadMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
              {uploadMessage.text}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-secondary px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
            <Upload className="w-5 h-5" /> {uploading ? t('pages.pay_bands.uploading') || 'Uploading...' : t('pages.pay_bands.bulk_upload') || 'Bulk Upload CSV'}
          </button>
          <button onClick={handleDownloadTemplate} className="btn-secondary px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
            <Download className="w-5 h-5" /> {t('pages.pay_bands.download_template') || 'Download Template'}
          </button>
          <button 
            onClick={handleExportXlsx} 
            className="btn-secondary px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap border-emerald-200 hover:border-emerald-500 text-emerald-700 bg-emerald-50/30"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Export XLSX (Formatted)
          </button>
          <button 
            data-testid="create-band-btn" 
            onClick={() => setShowCreate(true)} 
            className="btn-premium px-8 py-4 text-xs flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />{t('pages.pay_bands.create')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
          <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em] mb-3">{t('pages.pay_bands.total')}</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{filtered.length}</h3>
            <div className="w-12 h-12 bg-[rgba(46,79,210,0.08)] rounded-2xl flex items-center justify-center text-[rgb(var(--primary))] group-hover:bg-[rgb(var(--primary))] group-hover:text-white transition-all transform group-hover:scale-110">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
          <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em] mb-3">{t('pages.pay_bands.avg_spread')}</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{avgSpread}%</h3>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:scale-110">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] md:col-span-2 flex items-center gap-8 bg-gradient-to-br from-[rgba(46,79,210,0.04)] to-transparent border-[rgb(var(--primary-soft))] relative overflow-hidden group">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-[rgb(var(--primary))] opacity-[0.03] rounded-full blur-3xl group-hover:opacity-10 transition-opacity" />
          <div className="w-14 h-14 bg-[rgb(var(--primary))] rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-[rgba(46,79,210,0.2)]">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-lg font-black text-[rgb(var(--text-primary))] tracking-tight mb-1">{t('pages.pay_bands.currency_policy')}</p>
            <p className="text-sm font-bold text-[rgb(var(--text-secondary))] leading-relaxed">{t('pages.pay_bands.currency_policy_desc')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {['ALL', ...BASIS_OPTIONS].map(b => (
          <button 
            key={b} 
            data-testid={`basis-filter-${b}`} 
            onClick={() => setFilterBasis(b)} 
            className={`px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${
              filterBasis === b 
                ? 'bg-[rgb(var(--primary))] text-white shadow-lg shadow-[rgba(46,79,210,0.2)]' 
                : 'bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border))] hover:border-[rgb(var(--text-primary))] hover:text-[rgb(var(--text-primary))] shadow-sm'
            }`}
          >
            {b === 'ALL' ? (t('pay_bands.filter_all') || 'All') : t(`merit.basis_${b.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-6 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-surface-2))] flex flex-col items-stretch gap-6">
          <div className="flex flex-wrap gap-4 items-center w-full">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="flex-1 min-w-[120px] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl px-4 py-3.5 text-sm font-black text-[rgb(var(--text-primary))] outline-none cursor-pointer focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all appearance-none"
            >
              <option value="ALL">🗓️ {t('pay_bands.all_years')}</option>
              {Array.from(new Set(bands.map(b => b.effective_year))).sort((a,b) => b-a).map(y => y && <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="flex-1 min-w-[140px] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl px-4 py-3.5 text-sm font-black text-[rgb(var(--text-primary))] outline-none cursor-pointer focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all appearance-none"
            >
              <option value="ALL">📅 {t('pay_bands.all_months')}</option>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'short' })}</option>)}
            </select>
            <button
              onClick={() => { setFilterYear(currentYear.toString()); setFilterMonth(currentMonth.toString()); }}
              className="px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-[rgb(var(--primary))] bg-[rgba(46,79,210,0.08)] rounded-xl border border-transparent border-[rgba(46,79,210,0.1)] hover:bg-[rgba(46,79,210,0.15)] transition-all whitespace-nowrap shrink-0 shadow-sm"
              title="Shortcut to Current Year/Month"
            >
              {t('pay_bands.current_period')}
            </button>
            <div className="hidden md:block w-px h-10 bg-[rgb(var(--border))] mx-2" />
            <select
              data-testid="country-filter"
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="flex-1 min-w-[180px] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl px-4 py-3.5 text-sm font-black text-[rgb(var(--text-primary))] outline-none cursor-pointer focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all appearance-none"
            >
              <option value="ALL">🌍 {t('pay_bands.filter_all') || 'All Countries'}</option>
              {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
            </select>
          </div>
          <div className="relative w-full group">
            <Search className="w-5 h-5 text-[rgb(var(--text-muted))] absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[rgb(var(--primary))]" />
            <input 
              data-testid="pay-bands-search" 
              placeholder={t('pay_bands.search_placeholder') || 'Search levels, grades...'} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] pl-12 pr-6 py-3.5 text-sm font-bold outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all" 
            />
          </div>
          <span className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{filtered.length} {t('pay_bands.results') || 'bands found'}</span>
        </div>

        {loading ? (
          <div className="p-32 text-center text-[rgb(var(--text-muted))] flex flex-col items-center gap-6">
            <Layers className="w-12 h-12 animate-pulse" />
            <p className="font-black uppercase tracking-[0.2em] text-xs">Synchronizing market data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em] bg-[rgb(var(--bg-surface-2))]">
                  <th className="px-8 py-5">{t('pay_bands.col_grade') || 'Grade'}</th>
                  <th className="px-8 py-5">{t('pay_bands.col_basis') || 'Basis'}</th>
                  <th className="px-8 py-5">{t('pay_bands.col_country') || 'Country'}</th>
                   <th className="px-8 py-5">{t('pay_bands.col_currency') || 'Currency'}</th>
                  <th className="px-8 py-5 text-center">{t('pay_bands.col_period') || 'Period'}</th>
                  <th className="px-8 py-5">{t('pages.pay_bands.table.range')}</th>
                  <th className="px-8 py-5 text-right">{t('pages.pay_bands.table.spread')}</th>
                  <th className="px-8 py-5 text-center w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-8 py-24 text-center text-[rgb(var(--text-muted))] italic font-bold">{t('pages.pay_bands.empty')}</td></tr>
                ) : filtered.map(band => {
                  const spread = ((band.max_salary - band.min_salary) / band.min_salary * 100).toFixed(0);
                  return (
                    <tr key={band.id} data-testid={`band-row-${band.id}`} className="hover:bg-[rgb(var(--bg-surface-2))] transition-colors group">
                      <td className="px-8 py-6">
                        <span className="text-base font-black text-[rgb(var(--text-primary))] group-hover:text-[rgb(var(--primary))] transition-colors">{band.grade}</span>
                      </td>
                       <td className="px-8 py-6">
                        <select 
                          value={band.basis_type}
                          onChange={(e) => handleUpdateBand(band.id, { basis_type: e.target.value })}
                          disabled={updatingId === band.id}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border-2 outline-none cursor-pointer transition-all ${BASIS_COLORS[band.basis_type] ?? 'bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))]'} ${updatingId === band.id ? 'opacity-50' : 'hover:scale-105'}`}
                        >
                          {BASIS_OPTIONS.map(opt => <option key={opt} value={opt}>{t(`merit.basis_${opt.toLowerCase()}`)}</option>)}
                        </select>
                      </td>
                      <td className="px-8 py-6">
                        <select 
                          value={band.country_code || ''}
                          onChange={(e) => handleUpdateBand(band.id, { country_code: e.target.value || null })}
                          disabled={updatingId === band.id}
                          className="bg-transparent text-sm font-bold text-[rgb(var(--text-secondary))] outline-none cursor-pointer hover:text-[rgb(var(--primary))] transition-colors"
                        >
                          <option value="">—</option>
                          {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                        </select>
                      </td>
                      <td className="px-8 py-6">
                        <select 
                          value={band.currency || ''}
                          onChange={(e) => handleUpdateBand(band.id, { currency: e.target.value || null })}
                          disabled={updatingId === band.id}
                          className="bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] px-2 py-1 rounded-lg text-xs font-black text-[rgb(var(--text-primary))] outline-none cursor-pointer hover:border-[rgb(var(--primary))] transition-all"
                        >
                          <option value="">—</option>
                          {CURRENCY_OPTIONS.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                        </select>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-black text-[rgb(var(--text-primary))]">{band.effective_year}-{band.effective_month?.toString().padStart(2, '0')}</span>
                          {band.effective_year === 1900 && <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full mt-2 shadow-sm uppercase tracking-widest">LEGACY</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-3 min-w-[200px]">
                          <div className="flex justify-between text-[11px] font-black font-mono">
                            <span className="text-[rgb(var(--text-muted))]">{Number(band.min_salary).toLocaleString()}</span>
                            <span className="text-[rgb(var(--primary))] bg-[rgba(46,79,210,0.08)] px-2 rounded-md">{Number(band.midpoint).toLocaleString()}</span>
                            <span className="text-[rgb(var(--text-muted))]">{Number(band.max_salary).toLocaleString()}</span>
                          </div>
                          <div className="h-2 w-full bg-[rgb(var(--bg-surface-2))] rounded-full relative overflow-hidden border border-[rgb(var(--border))] shadow-inner">
                            <div className="absolute inset-y-0 left-0 right-0 bg-[rgb(var(--primary))] rounded-full opacity-20"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-4 bg-[rgb(var(--text-primary))] rounded-full border-2 border-[rgb(var(--bg-surface))] shadow-md"></div>
                          </div>
                        </div>
                      </td>
                       <td className="px-8 py-6 text-right">
                        <span className="text-base font-black text-[rgb(var(--text-primary))]">{spread}%</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button 
                          onClick={() => setBandToDelete(band.id)}
                          className="w-10 h-10 flex items-center justify-center bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all shadow-sm group-hover:shadow-md" 
                          title="Eliminar Banda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-md)] w-full max-w-xl overflow-hidden animate-in zoom-in duration-300">
            <div className="flex items-center justify-between px-10 py-8 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-surface-2))]">
              <h2 className="text-2xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{t('pay_bands.create_title') || 'New Pay Band'}</h2>
              <button 
                onClick={() => { setShowCreate(false); setFormError(''); }} 
                className="w-10 h-10 flex items-center justify-center text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-surface))] border border-transparent hover:border-[rgb(var(--border))] rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-10 space-y-8">
              {formError && (
                <div className="flex items-center gap-3 text-sm font-bold text-red-700 bg-red-50 border-2 border-red-100 rounded-2xl p-5 animate-in shake duration-500">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('pay_bands.col_grade') || 'Grade'}</label>
                  <input 
                    data-testid="band-grade-input" 
                    type="text" 
                    value={form.grade} 
                    onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} 
                    placeholder="e.g. G5" 
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm font-bold text-[rgb(var(--text-primary))] outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('pay_bands.col_basis') || 'Basis'}</label>
                  <select 
                    data-testid="band-basis-select" 
                    value={form.basis_type} 
                    onChange={e => setForm(f => ({ ...f, basis_type: e.target.value }))} 
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm font-bold text-[rgb(var(--text-primary))] outline-none cursor-pointer focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all appearance-none"
                  >
                    {BASIS_OPTIONS.map(b => <option key={b} value={b}>{t(`merit.basis_${b.toLowerCase()}`)}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('pay_bands.col_country') || 'Country'}</label>
                  <input 
                    data-testid="band-country-input" 
                    type="text" 
                    value={form.country_code} 
                    onChange={e => setForm(f => ({ ...f, country_code: e.target.value.slice(0,2) }))} 
                    placeholder="US" 
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm font-bold text-[rgb(var(--text-primary))] outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('pay_bands.col_currency') || 'Currency'}</label>
                  <input 
                    data-testid="band-currency-input" 
                    type="text" 
                    value={form.currency} 
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value.slice(0,3) }))} 
                    placeholder="USD" 
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm font-bold text-[rgb(var(--text-primary))] outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('pay_bands.col_year') || 'Effective Year'}</label>
                  <input 
                    type="number" 
                    value={form.effective_year} 
                    onChange={e => setForm(f => ({ ...f, effective_year: e.target.value }))} 
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm font-bold text-[rgb(var(--text-primary))] outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('pay_bands.col_month') || 'Effective Month'}</label>
                  <input 
                    type="number"
                    min="1"
                    max="12"
                    value={form.effective_month} 
                    onChange={e => setForm(f => ({ ...f, effective_month: e.target.value }))} 
                    className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm font-bold text-[rgb(var(--text-primary))] outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[{ label: t('merit.band_min'), field: 'min_salary', id: 'band-min-input' }, { label: t('merit.band_mid'), field: 'midpoint', id: 'band-mid-input' }, { label: t('merit.band_max'), field: 'max_salary', id: 'band-max-input' }].map(f => (
                  <div key={f.field} className="space-y-3">
                    <label className="block text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{f.label}</label>
                    <input 
                      data-testid={f.id} 
                      type="number" 
                      value={(form as any)[f.field]} 
                      onChange={e => setForm(frm => ({ ...frm, [f.field]: e.target.value }))} 
                      className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] px-5 py-4 text-sm font-bold text-[rgb(var(--text-primary))] outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all" 
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-6 pt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowCreate(false); setFormError(''); }} 
                  className="px-8 py-4 text-xs font-black text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-all uppercase tracking-widest"
                >
                  {t('merit.cancel')}
                </button>
                <button 
                  data-testid="save-band-btn" 
                  type="submit" 
                  disabled={formLoading} 
                  className="btn-premium px-12 py-4 text-xs"
                >
                  {formLoading ? (t('common.saving') || 'Saving...') : t('pages.pay_bands.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {bandToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-500/5">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-black text-[rgb(var(--text-primary))] tracking-tighter uppercase">
                  {t('pages.pay_bands.delete_confirm_title')}
                </h3>
                <p className="text-[rgb(var(--text-secondary))] text-sm font-bold leading-relaxed">
                  {t('pages.pay_bands.delete_confirm_subtitle')}
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setBandToDelete(null)}
                  className="flex-1 bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-[rgb(var(--text-primary))] transition-all"
                >
                  {t('merit.cancel')}
                </button>
                <button 
                  onClick={handleDeleteBand}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Trash2 className="w-4 h-4" />}
                  {t('pages.pay_bands.delete_confirm_button')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* FX Simulation Table */}
      <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] overflow-hidden mt-10">
        <div className="p-8 border-b border-[rgb(var(--border))] bg-gradient-to-r from-emerald-50/50 to-transparent flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[rgb(var(--text-primary))] tracking-tight">{t('pages.pay_bands.fx_simulation.title')}</h2>
              <p className="text-sm font-bold text-[rgb(var(--text-secondary))]">{t('pages.pay_bands.fx_simulation.subtitle')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t('pages.pay_bands.fx_simulation.convert_to')}</span>
            <select 
              value={targetCurrency}
              onChange={(e) => setTargetCurrency(e.target.value)}
              className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-sm font-black text-[rgb(var(--text-primary))] outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
            >
              {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em] bg-[rgb(var(--bg-surface-2))]">
                <th className="px-8 py-5">{t('pages.pay_bands.fx_simulation.col_grade_basis')}</th>
                <th className="px-8 py-5">{t('pages.pay_bands.fx_simulation.col_source_currency')}</th>
                <th className="px-8 py-5">{t('pages.pay_bands.fx_simulation.col_rate')}</th>
                <th className="px-8 py-5">{t('pages.pay_bands.fx_simulation.col_min')} ({targetCurrency})</th>
                <th className="px-8 py-5">{t('pages.pay_bands.fx_simulation.col_mid')} ({targetCurrency})</th>
                <th className="px-8 py-5">{t('pages.pay_bands.fx_simulation.col_max')} ({targetCurrency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-24 text-center text-[rgb(var(--text-muted))] italic font-bold">{t('pages.pay_bands.fx_simulation.no_data')}</td></tr>
              ) : filtered.map(band => {
                const sourceCurrency = band.currency || 'USD';
                
                // Find direct rate first
                let rateObj = fxRates.find(r => r.from_currency === sourceCurrency && r.to_currency === targetCurrency);
                let displayRate = rateObj?.rate || null;
                
                // Inverse rate if needed
                if (!displayRate && sourceCurrency !== targetCurrency) {
                  const invRate = fxRates.find(r => r.from_currency === targetCurrency && r.to_currency === sourceCurrency);
                  if (invRate) displayRate = 1 / invRate.rate;
                }

                // Default to 1 if same currency
                if (sourceCurrency === targetCurrency) displayRate = 1;

                const convert = (val: number) => displayRate ? (Number(val) * Number(displayRate)) : null;
                const minC = convert(band.min_salary);
                const midC = convert(band.midpoint);
                const maxC = convert(band.max_salary);

                return (
                  <tr key={`fx-${band.id}`} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-[rgb(var(--text-primary))]">{band.grade}</span>
                        <span className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase">{t(`merit.basis_${band.basis_type.toLowerCase()}`)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black px-2 py-1 bg-slate-100 rounded text-slate-600">{sourceCurrency}</span>
                    </td>
                    <td className="px-8 py-6 font-mono text-xs font-bold text-emerald-600">
                      {displayRate ? Number(displayRate).toFixed(4) : <span className="text-red-400">N/A</span>}
                    </td>
                    <td className="px-8 py-6 font-mono font-black text-sm text-[rgb(var(--text-primary))]">
                      {minC ? Number(minC).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-8 py-6 font-mono font-black text-sm text-[rgb(var(--primary))]">
                      {midC ? Number(midC).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-8 py-6 font-mono font-black text-sm text-[rgb(var(--text-primary))]">
                      {maxC ? Number(maxC).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayBandsPage;
