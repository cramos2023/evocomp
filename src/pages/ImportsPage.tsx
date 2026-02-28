import React, { useEffect, useState } from 'react';
import { 
  FileUp, Database, History, 
  CheckCircle2, Clock, AlertCircle, Search, 
  ArrowRight, Download, Trash2, Filter
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

const ImportsPage = () => {
  const { t } = useTranslation();
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error('Error fetching snapshots:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadTemplate() {
    const headers = [
      'employee_external_id',
      'full_name',
      'email',
      'country_code',
      'local_currency',
      'base_salary_local',
      'target_cash_local',
      'total_guaranteed_local',
      'pay_grade_internal',
      'performance_rating',
      'manager_external_id'
    ];
    
    const csvContent = [
      headers.join(','),
      ['EMP001', 'John Doe', 'john@example.com', 'US', 'USD', '85000', '95000', '95000', 'GRADE_1', 'FULLY_MEETS', 'MGR001'].join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'evocomp_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('imports.title')}</h1>
          <p className="text-slate-500 mt-1 max-w-xl">
            {t('imports.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDownloadTemplate}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all group"
          >
            <Download className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            Download Template
          </button>
          <button className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-slate-900/10 group">
            <FileUp className="w-5 h-5 text-blue-400 group-hover:-translate-y-1 transition-transform" />
            {t('imports.upload')}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-300" />
            {t('imports.history')}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-8 py-4">Snapshot Name</th>
                <th className="px-8 py-4">Records</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Identity ID</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400">Loading snapshots...</td>
                </tr>
              ) : snapshots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400">No snapshots found</td>
                </tr>
              ) : snapshots.map((s) => (
                <tr key={s.snapshot_id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{s.snapshot_name || s.name}</p>
                        <p className="text-[11px] text-slate-400">{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-medium text-slate-700">{(s.employee_count ?? 0).toLocaleString()} talent records</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ACTIVE
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <code className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg font-mono">
                      {(s.snapshot_id || s.id || '').slice(0, 8)}...
                    </code>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Download Source CSV">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Delete Snapshot">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ImportsPage;
