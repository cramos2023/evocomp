import React, { useEffect, useState } from "react";
import { 
  Shield, Search, Filter, RefreshCcw, 
  ExternalLink, Calendar, User, Info,
  CheckCircle2, AlertTriangle, ShieldAlert,
  ArrowRight, Download
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "react-i18next";

const AuditLogPage = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          user_profiles!audit_logs_user_id_fkey (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "HIGH": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "MEDIUM": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <div className="p-10 min-h-screen transition-colors duration-500">
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.audit.system_of_record', 'Immutable System of Record')}</span>
          </div>
          <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none mb-3 transition-colors">{t('sidebar.audit_log')}</h1>
          <p className="text-[rgb(var(--text-secondary))] text-lg font-bold max-w-xl leading-relaxed transition-colors">
            {t('pages.audit.subtitle', 'Deep forensic traceability of all platform operations and high-stakes compensation decisions.')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-3.5 bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] rounded-[var(--radius-btn)] border border-[rgb(var(--border))] hover:text-[rgb(var(--text-primary))] transition-all shadow-sm">
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => { setLoading(true); fetchLogs(); }}
            className="btn-premium px-6 py-3.5"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('pages.audit.refresh', 'Refresh Audit Trail')}</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
        <div className="p-8 border-b border-[rgb(var(--border))] flex flex-col md:flex-row md:items-center justify-between gap-8 bg-[rgb(var(--bg-surface-2))] transition-colors">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--text-muted))] group-focus-within:text-[rgb(var(--primary))] transition-colors" />
            <input 
              type="text" 
              placeholder={t('pages.audit.search_placeholder', 'Search by event, actor or entity ID...')}
              className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] pl-12 pr-4 py-3 text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all font-bold"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--bg-surface))] hover:bg-[rgb(var(--bg-surface-2))] rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-all text-[10px] font-black uppercase tracking-widest">
              <Filter className="w-4 h-4" /> Type
            </button>
            <div className="w-px h-6 bg-[rgb(var(--border))]" />
            <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em]">
              {t('pages.audit.last', 'Last')} <span className="text-[rgb(var(--text-primary))] transition-colors">50</span> {t('pages.audit.events', 'Events')}
            </p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[rgb(var(--bg-surface-2))] border-b border-[rgb(var(--border))] transition-colors">
                <th className="px-8 py-5 text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.audit.col_timestamp', 'Timestamp / Event')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.audit.col_actor', 'Actor')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.audit.col_context', 'Context')}</th>
                <th className="px-8 py-5 text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.audit.col_ip', 'IP Source')}</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.audit.col_trace', 'Trace')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))] bg-[rgb(var(--bg-surface))]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center text-[rgb(var(--text-muted))] font-bold italic uppercase tracking-widest text-[10px]">{t('pages.audit.scanning', 'Scanning forensic record...')}</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="group hover:bg-[rgb(var(--bg-surface-2))] transition-colors cursor-default">
                  <td className="px-8 py-6">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1.5 w-2 h-2 rounded-full shadow-sm ${
                        log.severity === 'HIGH' ? 'bg-rose-500 shadow-rose-500/20' : 
                        log.severity === 'MEDIUM' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-[rgb(var(--primary))] shadow-[rgb(var(--primary))]/20'
                      }`} />
                      <div>
                        <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-tight transition-colors">{new Date(log.created_at).toLocaleString()}</p>
                        <p className="text-sm font-black text-[rgb(var(--text-primary))] mt-0.5 tracking-tight transition-colors">{log.action_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] flex items-center justify-center text-[11px] font-black text-[rgb(var(--primary))] shadow-sm transition-colors group-hover:bg-[rgb(var(--bg-surface))]">
                        {log.user_profiles?.full_name?.[0] || log.user_profiles?.email?.[0] || 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-[rgb(var(--text-primary))] transition-colors tracking-tight">{log.user_profiles?.full_name || 'System Engine'}</p>
                        <p className="text-[10px] text-[rgb(var(--text-muted))] font-black tracking-tight transition-colors uppercase">{log.user_profiles?.email || 'INTERNAL'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs text-[rgb(var(--text-secondary))] font-black line-clamp-1 max-w-[220px] tracking-tight transition-colors uppercase">{log.entity_name} ({log.entity_id.slice(0, 8)})</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[11px] font-mono text-[rgb(var(--text-muted))] font-black transition-colors">{log.ip_address || "0.0.0.0"}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-3 bg-[rgb(var(--bg-surface-2))] hover:bg-[rgb(var(--bg-surface))] rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-all shadow-sm">
                      <ArrowRight className="w-4 h-4" />
                    </button>
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

export default AuditLogPage;
