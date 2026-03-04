import React, { useEffect, useState } from 'react';
import { 
  FileUp, Database, History, 
  CheckCircle2, Clock, AlertCircle, Search, 
  ArrowRight, Download, Trash2, Filter,
  AlertTriangle, FileCheck, XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DataQualityReportModal } from '../components/scenarios/DataQualityReportModal';

const ImportsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [qualityReports, setQualityReports] = useState<Record<string, { status: string }>>({});
  const [reportSnapshotId, setReportSnapshotId] = useState<string | null>(null);
  const [preflightWarning, setPreflightWarning] = useState<string | null>(null);
  const [generatingReportFor, setGeneratingReportFor] = useState<string | null>(null);
  const [reportPending, setReportPending] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // --- Preflight: check CSV headers for v2 columns ---
    const preflightText = await file.text();
    const preflightHeaders = preflightText.split(/\r?\n/)[0]?.split(',').map(h => h.trim()) || [];
    const V2_REQUIRED_HEADERS = ['annual_variable_target_local', 'annual_guaranteed_cash_target_local'];
    const missingV2 = V2_REQUIRED_HEADERS.filter(h => !preflightHeaders.includes(h));
    if (missingV2.length > 0) {
      setPreflightWarning(
        `This file is missing v2 compensation columns (${missingV2.join(', ')}). Imports will still work, but some scenario outputs may be blank (—) and jobs may show warnings.`
      );
    } else {
      setPreflightWarning(null);
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Get Tenant ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      const tenantId = profile?.tenant_id;
      if (!tenantId) throw new Error('No tenant_id found');

      setUploadProgress(20);

      // 2. Read File
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error('File is empty or missing data');

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1);
      setUploadProgress(30);

      // 3. Create Import Entry
      const { data: importRec, error: importErr } = await supabase
        .from('imports')
        .insert({
          tenant_id: tenantId,
          file_name: file.name,
          status: 'COMPLETED',
          type: 'EMPLOYEE_DATA',
          processed_at: new Date().toISOString(),
          created_by: user.id
        })
        .select()
        .single();

      if (importErr) throw importErr;
      setUploadProgress(40);

      // 4. Create Snapshot
      const { data: snapshot, error: snapshotErr } = await supabase
        .from('snapshots')
        .insert({
          tenant_id: tenantId,
          import_id: importRec.id,
          name: `Snapshot - ${file.name} (${new Date().toLocaleTimeString()})`,
          snapshot_date: new Date().toISOString().split('T')[0],
          source: 'UI_UPLOAD',
          created_by: user.id
        })
        .select()
        .single();

      if (snapshotErr) throw snapshotErr;
      setUploadProgress(50);

      // 5. Parse and Insert Employees (Template v2 + v1 backward compat)
      const employeesToInsert = rows
        .map(row => {
          // Smart CSV parsing: handle quoted values with commas inside
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const char of row) {
            if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
            else { current += char; }
          }
          values.push(current.trim());

          const data: any = {};
          headers.forEach((header, index) => {
            data[header] = values[index] || '';
          });

          // SKIP ROW if it's effectively empty (no ID and no content)
          // Avoids 'Anonymous' leaks from trailing commas in Excel exports
          const hasId = !!data.employee_external_id;
          const hasContent = Object.values(data).some(v => v !== '');
          if (!hasId && !hasContent) return null;

          // Normalize header aliases (v2 uses 'grade' and 'country', v1 uses longer names)
          const grade = data.grade || data.pay_grade_internal || null;
          const country = data.country || data.country_code || 'US';

          // Parse numerics safely
          const baseSalary = parseFloat(data.annual_base_salary_local || data.base_salary_local) || 0;
          const variableTarget = parseFloat(data.annual_variable_target_local) || 0;
          const guaranteedCash = parseFloat(data.annual_guaranteed_cash_target_local) || 0;
          const contractHours = parseFloat(data.contract_hours_per_week) || null; // null = v1 data → INVALID_HOURS flag

          // Derived fields (NOT in template, computed on insert)
          const totalCashTargetLocal = baseSalary + variableTarget;
          const totalGuaranteedTargetLocal = totalCashTargetLocal + guaranteedCash;

          return {
            tenant_id: tenantId,
            snapshot_id: snapshot.id,
            // Identity
            employee_external_id: data.employee_external_id || `EXT_${Math.random().toString(36).substr(2, 9)}`,
            full_name: data.full_name || 'Anonymous',
            email: data.email || null,
            country_code: country,
            local_currency: data.local_currency || 'USD',
            employee_status: data.employee_status || null,
            // Compensation (v2 required)
            base_salary_local: baseSalary,
            base_salary_base: baseSalary, // placeholder, FX conversion done by engine
            annual_variable_target_local: variableTarget,
            annual_guaranteed_cash_target_local: guaranteedCash,
            target_cash_local: totalCashTargetLocal,  // derived: base + variable
            total_guaranteed_local: totalGuaranteedTargetLocal, // derived: total_cash + guaranteed
            contract_hours_per_week: contractHours,
            // Classification (free-form, no hardcode)
            pay_grade_internal: grade,
            performance_rating: data.performance_rating || null,
            // Hierarchy
            manager_id: data.manager_external_id || null,
            manager_name: data.manager_name || null,
            // Optional enrichment
            position_code: data.position_code || null,
            job_title: data.job_title || null,
            career_function: data.career_function || null,
            job_family: data.job_family || null,
            career_level: data.career_level || null,
            employment_type: data.employment_type || null,
            hire_date: data.hire_date || null,
            start_date_in_role: data.start_date_in_role || null,
          };
        })
        .filter((emp): emp is NonNullable<typeof emp> => emp !== null); // Remove skipped rows

      // Insert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < employeesToInsert.length; i += chunkSize) {
        const chunk = employeesToInsert.slice(i, i + chunkSize);
        const { error: empErr } = await supabase
          .from('snapshot_employee_data')
          .insert(chunk);
        
        if (empErr) throw empErr;
        
        const progress = 50 + Math.round(((i + chunk.length) / employeesToInsert.length) * 50);
        setUploadProgress(progress);
      }

      // --- Trigger server-side quality report generation ---
      setReportPending(true);
      supabase.functions.invoke('generate-quality-report', {
        body: { snapshot_id: snapshot.id, tenant_id: tenantId }
      }).then(() => {
        // Poll for report readiness
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const { data: rpt } = await supabase
            .from('snapshot_import_quality_reports')
            .select('status')
            .eq('snapshot_id', snapshot.id)
            .maybeSingle();
          if (rpt) {
            clearInterval(poll);
            setReportPending(false);
            setQualityReports(prev => ({ ...prev, [snapshot.id]: { status: rpt.status } }));
          }
          if (attempts >= 20) {
            clearInterval(poll);
            setReportPending(false);
          }
        }, attempts < 10 ? 1000 : 2000);
      }).catch(() => setReportPending(false));

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setShowSuccessModal(true);
        fetchSnapshots();
      }, 500);

    } catch (err: any) {
      console.error('Import failed:', err);
      alert(`Error during import: ${err.message}`);
      setIsUploading(false);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  async function fetchSnapshots() {
    try {
      const { data, error } = await supabase
        .from('snapshots_metrics_v')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSnapshots(data || []);

      // Batch-fetch quality reports for all snapshot_ids
      if (data && data.length > 0) {
        const ids = data.map((s: any) => s.snapshot_id).filter(Boolean);
        const { data: reports } = await supabase
          .from('snapshot_import_quality_reports')
          .select('snapshot_id, status')
          .in('snapshot_id', ids);
        if (reports) {
          const map: Record<string, { status: string }> = {};
          for (const r of reports) map[r.snapshot_id] = { status: r.status };
          setQualityReports(map);
        }
      }
    } catch (err) {
      console.error('Error fetching snapshots:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport(snapshotId: string, tenantId: string) {
    setGeneratingReportFor(snapshotId);
    try {
      await supabase.functions.invoke('generate-quality-report', {
        body: { snapshot_id: snapshotId, tenant_id: tenantId }
      });
      // Poll for report
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const { data: rpt } = await supabase
          .from('snapshot_import_quality_reports')
          .select('status')
          .eq('snapshot_id', snapshotId)
          .maybeSingle();
        if (rpt) {
          clearInterval(poll);
          setGeneratingReportFor(null);
          setQualityReports(prev => ({ ...prev, [snapshotId]: { status: rpt.status } }));
        }
        if (attempts >= 15) {
          clearInterval(poll);
          setGeneratingReportFor(null);
        }
      }, 1500);
    } catch {
      setGeneratingReportFor(null);
    }
  }

  async function handleDeleteSnapshot() {
    if (!snapshotToDelete) return;
    setIsDeleting(true);
    
    try {
      // Use the database function for robust cascaded deletion
      const { error } = await supabase.rpc('delete_snapshot_cascade', { 
        p_snapshot_id: snapshotToDelete 
      });
      
      if (error) throw error;

      setSnapshotToDelete(null);
      fetchSnapshots();
    } catch (err: any) {
      console.error('Error deleting snapshot:', err);
      alert(`Failed to delete snapshot: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDownloadSnapshot(s: any) {
    try {
      const { data, error } = await supabase
        .from('snapshot_employee_data')
        .select('*')
        .eq('snapshot_id', s.snapshot_id || s.id);
      
      if (error) throw error;
      if (!data || data.length === 0) {
        alert('No data found for this snapshot');
        return;
      }

      const headers = Object.keys(data[0]).filter(k => k !== 'tenant_id');
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
          const val = row[header];
          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `evocomp_snapshot_${s.snapshot_name || s.name || s.snapshot_id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading snapshot:', err);
      alert('Failed to download snapshot');
    }
  }

  function handleDownloadTemplate() {
    // Template v2: Required (*) + Optional columns
    // Derived fields (total_cash_target, total_guaranteed_target) are NOT in template — computed on import
    const headers = [
      // --- REQUIRED ---
      'employee_external_id',       // * unique ID
      'employee_status',            // * free-form (e.g. Active, LOA, Terminated)
      'country',                    // * ISO country code
      'local_currency',             // * ISO 4217 currency
      'grade',                      // * pay grade (free-form from client)
      'performance_rating',         // * rating (free-form from client)
      'annual_base_salary_local',   // * annual base salary in local currency
      'annual_variable_target_local', // * annual variable/bonus target
      'contract_hours_per_week',    // * contracted hours per week
      // --- OPTIONAL ---
      'full_name',
      'email',
      'manager_external_id',
      'manager_name',
      'annual_guaranteed_cash_target_local',
      'position_code',
      'job_title',
      'career_function',
      'job_family',
      'career_level',
      'employment_type',
      'hire_date',
      'start_date_in_role',
    ];

    const sampleRow = [
      'EMP001', 'Active', 'US', 'USD', 'GRADE_3', 'EXCEEDS',
      '85000', '15000', '40',
      'Jane Smith', 'jane@example.com', 'MGR001', 'Robert Johnson',
      '0', 'POS-1234', 'Senior Analyst', 'Finance', 'Accounting', 'P3',
      'Full-Time', '2020-03-15', '2023-01-01',
    ];

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'evocomp_import_template_v2.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start gap-10">
        <div id="import-section" className="space-y-4">
          <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none mb-3">
            {t('pages.imports.title', 'Database')}
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-lg font-bold max-w-2xl leading-relaxed">
            {t('pages.imports.subtitle', 'Upload talent data snapshots for modeling.')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <button
            onClick={handleDownloadTemplate}
            className="group flex items-center justify-center gap-3 bg-[rgb(var(--bg-surface))] border-2 border-[rgb(var(--border))] hover:border-[rgb(var(--text-primary))] text-[rgb(var(--text-primary))] px-8 py-4 rounded-[var(--radius-btn)] font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-5 h-5 text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-primary))] transition-colors" />
            {t('pages.pay_bands.download_template', 'Download Template')}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileUpload}
          />
          <button 
            className="btn-premium px-10 py-4 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
            {t('pages.imports.upload', 'Upload Data')}
          </button>
        </div>
      </div>

      <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-8 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-surface-2))] flex items-center justify-between">
          <h2 className="text-xl font-black text-[rgb(var(--text-primary))] tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl flex items-center justify-center shadow-sm">
              <History className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            {t('pages.imports.history', 'Import History')}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[rgb(var(--bg-surface-2))] border-b border-[rgb(var(--border))] text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em]">
                <th className="px-10 py-5">Snapshot Identity</th>
                <th className="px-10 py-5">Talent Count</th>
                <th className="px-10 py-5">Data Quality</th>
                <th className="px-10 py-5">System Hash</th>
                <th className="px-10 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center text-[rgb(var(--text-muted))]">
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                      <Database className="w-12 h-12 mb-2" />
                      <p className="font-black tracking-[0.2em] text-xs">Querying snapshots...</p>
                    </div>
                  </td>
                </tr>
              ) : snapshots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center text-[rgb(var(--text-muted))] font-bold italic">No snapshots found</td>
                </tr>
              ) : snapshots.map((s) => (
                <tr key={s.snapshot_id} className="bg-[rgb(var(--bg-surface))] hover:bg-[rgb(var(--bg-surface-2))] transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] rounded-2xl flex items-center justify-center text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--primary))] group-hover:border-[rgb(var(--primary-soft))] transition-all">
                        <Database className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight group-hover:text-[rgb(var(--primary))] transition-colors">{s.snapshot_name || s.name}</p>
                        <p className="text-[11px] font-bold text-[rgb(var(--text-muted))] mt-1">{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-[rgb(var(--text-primary))]">{(s.employee_count ?? 0).toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-widest">Active nodes</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    {(() => {
                      const qr = qualityReports[s.snapshot_id];
                      if (!qr) return (
                        <button
                          onClick={() => handleGenerateReport(s.snapshot_id, s.tenant_id)}
                          disabled={generatingReportFor === s.snapshot_id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer disabled:opacity-50"
                          title="Generate quality report for this snapshot"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          {generatingReportFor === s.snapshot_id ? 'Generating...' : 'Generate Report'}
                        </button>
                      );
                      const cfg = qr.status === 'PASS'
                        ? { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: CheckCircle2, label: 'PASS' }
                        : qr.status === 'WARN'
                        ? { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: AlertTriangle, label: 'WARN' }
                        : { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: XCircle, label: 'FAIL' };
                      const Icon = cfg.icon;
                      return (
                        <button
                          onClick={() => setReportSnapshotId(s.snapshot_id)}
                          className={`inline-flex items-center gap-2 px-4 py-1.5 ${cfg.bg} ${cfg.text} border ${cfg.border} rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:scale-105 transition-transform cursor-pointer`}
                          title="View Data Quality Report"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-10 py-8">
                    <code className="text-[11px] font-black text-[rgb(var(--text-muted))] bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] px-3 py-1.5 rounded-lg font-mono tracking-tighter shadow-inner">
                      {(s.snapshot_id || s.id || '').slice(0, 12)}
                    </code>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <button 
                        onClick={() => handleDownloadSnapshot(s)}
                        className="w-10 h-10 flex items-center justify-center bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:border-[rgb(var(--text-primary))] rounded-xl transition-all shadow-sm" 
                        title="Download Source CSV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setSnapshotToDelete(s.snapshot_id || s.id)}
                        className="w-10 h-10 flex items-center justify-center bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all shadow-sm" 
                        title="Eliminar Captura"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        id="import-arrow-btn" 
                        onClick={() => navigate(`/app/comp/scenarios?snapshotId=${s.snapshot_id || s.id}`)}
                        className="w-10 h-10 flex items-center justify-center bg-[rgb(var(--primary))] text-white rounded-xl transition-all shadow-md shadow-[rgba(46,79,210,0.2)] hover:scale-110 active:scale-95"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Progress Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-0">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="relative bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-[rgb(var(--bg-surface-2))]" />
                <div 
                  className="absolute inset-0 rounded-full border-4 border-[rgb(var(--primary))] border-t-transparent animate-spin" 
                  style={{ animationDuration: '3s' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileUp className="w-10 h-10 text-[rgb(var(--primary))]" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[rgb(var(--text-primary))] tracking-tighter">
                  {t('pages.imports.uploading_title')}
                </h3>
                <p className="text-[rgb(var(--text-muted))] text-sm font-medium">
                  {t('pages.imports.uploading_subtitle')}
                </p>
              </div>

              <div className="space-y-3">
                <div className="h-2 w-full bg-[rgb(var(--bg-surface-2))] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[rgb(var(--primary))] transition-all duration-300 ease-out shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">
                  <span>{t('auth.loading')}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center space-y-8">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>

              <div className="space-y-3">
                <h3 className="text-3xl font-black text-[rgb(var(--text-primary))] tracking-tighter uppercase">
                  {t('pages.imports.success_title')}
                </h3>
                <p className="text-[rgb(var(--text-secondary))] text-base font-bold leading-relaxed">
                  {t('pages.imports.success_subtitle')}
                </p>
              </div>

              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-[rgb(var(--text-primary))] text-[rgb(var(--bg-surface))] py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {snapshotToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-500/5">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-black text-[rgb(var(--text-primary))] tracking-tighter uppercase">
                  {t('pages.imports.delete_confirm_title')}
                </h3>
                <p className="text-[rgb(var(--text-secondary))] text-sm font-bold leading-relaxed">
                  {t('pages.imports.delete_confirm_subtitle')}
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setSnapshotToDelete(null)}
                  className="flex-1 bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-[rgb(var(--text-primary))] transition-all"
                >
                  {t('merit.cancel')}
                </button>
                <button 
                  onClick={handleDeleteSnapshot}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Trash2 className="w-4 h-4" />}
                  {t('pages.imports.delete_confirm_button')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preflight Warning */}
      {preflightWarning && !isUploading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-5 py-4 bg-amber-50 border border-amber-300 rounded-2xl shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom duration-300">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-bold">{preflightWarning}</p>
          </div>
          <button onClick={() => setPreflightWarning(null)} className="text-amber-400 hover:text-amber-600 text-lg font-bold">×</button>
        </div>
      )}

      {/* Data Quality Report Modal */}
      {reportSnapshotId && (
        <DataQualityReportModal
          isOpen={!!reportSnapshotId}
          onClose={() => setReportSnapshotId(null)}
          snapshotId={reportSnapshotId}
        />
      )}
    </div>
  );
};

export default ImportsPage;
