import React, { useEffect, useState } from 'react';
import { 
  UserPlus, Shield, Mail, Calendar, 
  MoreVertical, Search, ShieldCheck, ShieldAlert,
  ArrowUpRight, Filter, Download, Globe
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';

const UsersPage = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_roles (
            role_id
          )
        `);
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-10 bg-slate-950/20 min-h-screen">
      {/* Search and Filters Banner */}
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('pages.users.admin_console', { defaultValue: 'Administrative Console' })}</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">{t('sidebar.users')}</h1>
          <p className="text-slate-500 mt-2 text-lg max-w-xl leading-relaxed">
            {t('pages.users.subtitle', { defaultValue: "Control platform permissions and high-level governance for your organization's compensation strategists." })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-white/5 text-slate-400 transition-all">
            <Download className="w-5 h-5" />
          </button>
          <button className="btn-premium">
            <UserPlus className="w-5 h-5" />
            <span>{t('pages.users.invite', { defaultValue: 'Invite Collaborator' })}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 animate-in fade-in slide-in-from-top-8 duration-700 delay-100">
        <div className="glass-card p-6 border-l-4 border-l-blue-500 hover:translate-y-[-4px] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <Globe className="w-6 h-6" />
            </div>
            <span className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full text-[10px] font-bold">+12%</span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Global Coverage</p>
          <p className="text-3xl font-black text-white">100%</p>
        </div>
        
        <div className="glass-card p-6 border-l-4 border-l-indigo-500 hover:translate-y-[-4px] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Authenticated</p>
          <p className="text-3xl font-black text-white">{users.length} <span className="text-lg text-slate-600 ml-1">Nodes</span></p>
        </div>

        <div className="glass-card p-6 border-l-4 border-l-amber-500 hover:translate-y-[-4px] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Pending Sync</p>
          <p className="text-3xl font-black text-white">0 <span className="text-lg text-slate-600 ml-1">Tasks</span></p>
        </div>

        <div className="glass-card p-6 border-l-4 border-l-emerald-500 hover:translate-y-[-4px] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <UserPlus className="w-6 h-6" />
            </div>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">New Hires (Q1)</p>
          <p className="text-3xl font-black text-white">412</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden animate-in fade-in zoom-in-95 duration-700 delay-200">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Filter by name, email or department..." 
              className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all text-xs font-bold uppercase tracking-wider">
              <Filter className="w-4 h-4" /> Filters
            </button>
            <div className="w-px h-6 bg-white/5" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Displaying <span className="text-white">{users.length}</span> strategists
            </p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Strategist</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Role Assignment</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Identity Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
                      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Scanning encrypted directory...</p>
                    </div>
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-blue-500 border border-white/5 shadow-inner">
                        <span className="text-lg font-black uppercase">{user.full_name?.[0] || user.email[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{user.full_name || 'N/A'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="w-3 h-3 text-slate-600" />
                          <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      user.status === 'ACTIVE' 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      {user.status}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-2">
                      {user.user_roles?.map((ur: any) => (
                        <span key={ur.role_id} className="px-3 py-1 bg-slate-900 border border-white/5 rounded-lg text-[10px] font-bold text-slate-400 tracking-wider">
                          {ur.role_id}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-bold">{new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <button className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl border border-white/5 text-slate-500 hover:text-white transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Banner */}
      <div className="mt-12 p-8 glass-card border-none bg-gradient-to-r from-blue-600/10 to-indigo-600/10 flex items-center justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Security Reinforcement</h3>
            <p className="text-slate-400 text-sm font-medium">Multi-factor authentication is recommended for all Administrative nodes.</p>
          </div>
        </div>
        <button className="px-6 py-3 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/10 relative z-10">
          Enforce Governance
        </button>
      </div>
    </div>
  );
};

export default UsersPage;
