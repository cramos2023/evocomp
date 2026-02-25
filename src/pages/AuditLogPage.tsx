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
    <div className="p-10 bg-slate-950/20 min-h-screen">
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Immutable System of Record</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">{t('sidebar.audit_log')}</h1>
          <p className="text-slate-500 mt-2 text-lg max-w-xl leading-relaxed">
            Deep forensic traceability of all platform operations and high-stakes compensation decisions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-white/5 text-slate-400 transition-all">
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => { setLoading(true); fetchLogs(); }}
            className="btn-premium"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Audit Trail</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by event, actor or entity ID..." 
              className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all text-xs font-bold uppercase tracking-wider">
              <Filter className="w-4 h-4" /> Type
            </button>
            <div className="w-px h-6 bg-white/5" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Last <span className="text-white">50</span> Events
            </p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp / Event</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actor</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Context</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">IP Source</th>
                <th className="px-8 py-5 text-[10px) font-black text-slate-500 uppercase tracking-[0.2em]">Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-500">Scanning forensic record...</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-2 h-2 rounded-full ${
                        log.severity === 'HIGH' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                        log.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">{new Date(log.created_at).toLocaleString()}</p>
                        <p className="text-sm font-bold text-white mt-0.5">{log.action_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-[10px] font-black text-blue-400">
                        {log.user_profiles?.full_name?.[0] || log.user_profiles?.email?.[0] || 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white transition-colors">{log.user_profiles?.full_name || 'System Engine'}</p>
                        <p className="text-[10px] text-slate-600 font-medium">{log.user_profiles?.email || 'INTERNAL'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs text-slate-400 font-medium line-clamp-1 max-w-[200px]">{log.entity_name} ({log.entity_id.slice(0, 8)})</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-mono text-slate-500">{log.ip_address || "0.0.0.0"}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl border border-white/5 text-slate-500 hover:text-white transition-all">
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
