import React, { useEffect, useState } from 'react';
import { 
  Activity, Search, Filter, Calendar, 
  User, Database, Shield, ArrowRight,
  Info, Terminal
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const AuditLogPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          *,
          user_profiles!audit_log_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50 border-green-100';
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50 border-red-100';
    if (action.includes('PUBLISH') || action.includes('APPROVE')) return 'text-purple-600 bg-purple-50 border-purple-100';
    return 'text-slate-600 bg-slate-50 border-slate-100';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
               <Activity className="w-5 h-5" />
             </div>
             <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Audit Trail</h1>
          </div>
          <p className="text-slate-500 max-w-xl">
            Immutable chronological record of all administrative actions and system modifications within your tenant.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-12">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              placeholder="Search by user or entity ID..." 
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600">
            <Filter className="w-4 h-4" /> Filter Action Types
          </button>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            Retreiving secure audit data...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-24 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 border border-slate-100">
              <Terminal className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No activity recorded yet</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">
              Actions like imports, scenario creations, and approvals will appear here for full traceability.
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Action & Entity</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Trace ID</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-sm font-bold text-slate-900 capitalize">{log.entity_type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <User className="w-3.5 h-3.5 text-slate-400" />
                       <div>
                         <p className="text-sm font-medium text-slate-700">{log.user_profiles?.full_name || 'System Auto'}</p>
                         <p className="text-[10px] text-slate-400">{log.user_profiles?.email || 'N/A'}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600 font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">{log.entity_id}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-300 group-hover:text-slate-900 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-3xl p-8 text-white flex gap-6 items-start relative overflow-hidden">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Immutable Governance</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Audit logs are stored in a dedicated table with restricted delete permissions. 
              Even compensation admins cannot erase the trial of their own actions, 
              ensuring 100% compliance with external audit requirements.
            </p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 flex gap-6 items-start">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 border border-blue-100 text-blue-600">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Log Rotation</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              MVP Phase 1 retains logs for the last 90 days. For longer retention or SIEM integration, 
              please contact support for our Enterprise Tunnelling module.
            </p>
            <button className="mt-4 text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
              View Data Retention Policy <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
