import React, { useState } from 'react';
import { 
  FileBarChart, Download, FileText, 
  Sparkles, Calendar, ArrowRight, ShieldCheck, 
  Loader2, ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ReportsPage = () => {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);

  // Demo data for reports
  const reports = [
    {
      id: 'rpt-001',
      name: 'Q1 Merit Distribution Analysis',
      date: '2026-02-15',
      type: 'EXECUTIVE_SUMMARY',
      status: 'AVAILABLE',
      size: '2.4 MB'
    },
    {
      id: 'rpt-002',
      name: 'Global Pay Equity Audit - 2025',
      date: '2026-01-20',
      type: 'EQUITY_AUDIT',
      status: 'AVAILABLE',
      size: '4.1 MB'
    },
    {
      id: 'rpt-003',
      name: 'Budget Utilization Forecast',
      date: '2026-02-01',
      type: 'FINANCIAL_IMPACT',
      status: 'ARCHIVED',
      size: '1.8 MB'
    }
  ];

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      alert("Executive report generation triggered!");
    }, 2000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('pages.reports.title')}</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            {t('pages.reports.subtitle')}
          </p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={generating}
          className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-slate-900/10 group"
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />}
          {t('pages.reports.generate')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-3xl text-white shadow-lg shadow-blue-600/20">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4 border border-white/30 text-white">
            <FileBarChart className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold">{t('pages.reports.exec_summary')}</h3>
          <p className="text-blue-100 text-xs mt-1 leading-relaxed">
            {t('pages.reports.exec_summary_desc')}
          </p>
          <button className="mt-6 flex items-center gap-2 text-sm font-bold bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
            Configure <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{t('pages.reports.audit_pack')}</h3>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            {t('pages.reports.audit_pack_desc')}
          </p>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
          <p className="text-sm font-bold text-slate-400">{t('pages.reports.custom_template')}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[180px]">{t('pages.reports.custom_template_desc')}</p>
          <button className="mt-4 text-[10px] font-bold uppercase text-slate-300 tracking-widest cursor-not-allowed">{t('pages.reports.coming_soon')}</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-300" />
            {t('pages.reports.history')}
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {reports.map((rpt) => (
            <div key={rpt.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border ${
                  rpt.status === 'ARCHIVED' ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-blue-500 border-blue-100'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{rpt.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {rpt.date}</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500">{rpt.type}</span>
                    <span>{rpt.size}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const History = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

export default ReportsPage;
