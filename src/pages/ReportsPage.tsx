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
  const [reports, setReports] = useState<any[]>([]);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      alert("Executive report generation triggered!");
    }, 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto transition-colors duration-500">
      <div className="flex justify-between items-start mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-3 transition-colors">
            {t('pages.reports.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl transition-colors">
            {t('pages.reports.subtitle')}
          </p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={generating}
          className="btn-premium py-4 px-8"
        >
          {generating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
          )}
          <span>{t('pages.reports.generate')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
        {/* Active Card - Executive Summary */}
        <div className="bg-[rgb(var(--primary))] p-10 rounded-[var(--radius-card)] shadow-[var(--shadow-md)] group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] cursor-pointer">
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
              <FileBarChart className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 leading-none tracking-tight">{t('pages.reports.exec_summary')}</h3>
            <p className="text-white/80 text-sm font-medium leading-relaxed mb-10">
              {t('pages.reports.exec_summary_desc')}
            </p>
            <button className="flex items-center gap-3 text-[10px] font-black bg-white text-[rgb(var(--primary))] px-8 py-3.5 rounded-[var(--radius-btn)] hover:bg-slate-50 active:scale-95 transition-all uppercase tracking-[0.2em] shadow-lg">
              {t('common.configure', 'Configure')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audit Pack Card */}
        <div className="bg-[rgb(var(--bg-surface))] p-10 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] group transition-all duration-500 hover:scale-[1.02] hover:shadow-[var(--shadow-md)]">
          <div className="w-14 h-14 bg-[rgb(var(--bg-surface-2))] rounded-2xl flex items-center justify-center mb-8 border border-[rgb(var(--border))] text-[rgb(var(--primary))] group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-[rgb(var(--text-primary))] mb-4 tracking-tight leading-none">{t('pages.reports.audit_pack')}</h3>
          <p className="text-[rgb(var(--text-secondary))] text-sm font-medium leading-relaxed mb-10">
            {t('pages.reports.audit_pack_desc')}
          </p>
          <button className="flex items-center gap-3 text-[10px] font-black text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--primary))] transition-colors uppercase tracking-[0.2em]">
            {t('common.details', 'Details')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Custom Template Card (Coming Soon) */}
        <div className="bg-[rgb(var(--bg-surface-2))] p-10 rounded-[var(--radius-card)] border-dashed border-2 border-[rgb(var(--border))] flex flex-col items-center justify-center text-center opacity-70">
          <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em] mb-3">{t('pages.reports.custom_template')}</p>
          <p className="text-xs text-[rgb(var(--text-muted))] font-bold max-w-[200px] leading-relaxed mb-8">{t('pages.reports.custom_template_desc')}</p>
          <span className="px-5 py-2 bg-[rgb(var(--bg-surface))] text-[10px] font-black text-[rgb(var(--text-muted))] rounded-[var(--radius-btn)] uppercase tracking-[0.2em] border border-[rgb(var(--border))]">
            {t('pages.reports.coming_soon')}
          </span>
        </div>
      </div>

      {/* History List */}
      <div className="bg-[rgb(var(--bg-surface))] rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
        <div className="px-8 py-6 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-surface-2))] flex items-center justify-between">
          <h2 className="font-black text-[rgb(var(--text-primary))] flex items-center gap-3 uppercase tracking-[0.2em] text-xs">
            <History className="w-5 h-5 text-[rgb(var(--primary))]" />
            {t('pages.reports.history')}
          </h2>
          <span className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em]">
            {reports.length} {t('common.records', 'Records')}
          </span>
        </div>
        <div className="divide-y divide-[rgb(var(--border))]">
          {reports.length === 0 ? (
            <div className="px-8 py-20 text-center text-[rgb(var(--text-muted))] font-bold italic">
              {t('pages.reports.no_reports', 'No hay informes generados recientemente.')}
            </div>
          ) : (
            reports.map((rpt) => (
              <div key={rpt.id} className="px-8 py-6 hover:bg-[rgb(var(--bg-surface-2))] transition-all duration-300 flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                    rpt.status === 'ARCHIVED' 
                      ? 'bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))]' 
                      : 'bg-blue-50 text-[rgb(var(--primary))] border-blue-100 group-hover:scale-110'
                  }`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-base font-black text-[rgb(var(--text-primary))] tracking-tight leading-none mb-1.5">{rpt.name}</p>
                    <div className="flex items-center gap-5 text-[11px] text-[rgb(var(--text-muted))] font-bold uppercase tracking-tight">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {rpt.date}</span>
                      <span className="w-1 h-1 rounded-full bg-[rgb(var(--border))]" />
                      <span>{rpt.type}</span>
                      <span className="w-1 h-1 rounded-full bg-[rgb(var(--border))]" />
                      <span className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> {rpt.size}</span>
                    </div>
                  </div>
                </div>
                <button className="p-3 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
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
