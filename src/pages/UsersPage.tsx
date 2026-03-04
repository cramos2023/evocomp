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
    <div className="p-10 min-h-screen transition-colors duration-500">
      {/* Search and Filters Banner */}
      {/* Search and Filters Banner */}
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2.5 h-2.5 bg-[rgb(var(--primary))] rounded-full shadow-[0_0_12px_rgba(46,79,210,0.4)] animate-pulse" />
            <span className="text-[11px] font-black text-[rgb(var(--primary))] uppercase tracking-[0.3em] transition-colors">
              {t('pages.users.admin_console', 'Security & Governance')}
            </span>
          </div>
          <h1 className="text-5xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none mb-3 transition-colors">
            {t('sidebar.users', 'Strategists')}
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-lg max-w-xl leading-relaxed font-bold transition-colors">
            {t('pages.users.subtitle', "Manage secure access and high-level platform governance for your organization's core strategists.")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-3.5 bg-[rgb(var(--bg-surface))] hover:bg-[rgb(var(--bg-surface-2))] rounded-[var(--radius-btn)] border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] transition-all hover:text-[rgb(var(--text-primary))] shadow-sm">
            <Download className="w-5 h-5" />
          </button>
          <button className="btn-premium py-4 px-8 text-xs font-black tracking-widest uppercase" onClick={() => alert("Phase 2 feature.")}>
            <UserPlus className="w-5 h-5" />
            <span>{t('pages.users.invite', 'Invite Collaborator')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16 animate-in fade-in slide-in-from-top-8 duration-1000 delay-100">
        {[
          { label: t('pages.users.global_coverage', 'Global Coverage'), value: '100%', icon: Globe, color: 'blue', trend: '+12%' },
          { label: t('pages.users.authenticated', 'Authenticated'), value: `${users.length} Nodes`, icon: ShieldCheck, color: 'indigo' },
          { label: t('pages.users.pending_sync', 'Pending Sync'), value: '0 Tasks', icon: ArrowUpRight, color: 'amber' },
          { label: t('pages.users.user_growth', 'User Growth'), value: '412', icon: UserPlus, color: 'emerald' }
        ].map((stat, i) => (
          <div key={i} className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-[rgb(var(--bg-surface-2))] rounded-2xl flex items-center justify-center text-[rgb(var(--primary))] border border-[rgb(var(--border))] group-hover:bg-[rgb(var(--primary))] group-hover:text-white transition-all duration-300">
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.trend && <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest border border-emerald-100">{stat.trend}</span>}
            </div>
            <p className="text-[rgb(var(--text-muted))] text-[10px] font-black uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <p className="text-3xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] overflow-hidden animate-in fade-in zoom-in-95 duration-1000 delay-300">
        <div className="p-8 bg-[rgb(var(--bg-surface-2))] border-b border-[rgb(var(--border))] flex flex-col md:flex-row md:items-center justify-between gap-8 transition-colors">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--text-muted))] group-focus-within:text-[rgb(var(--primary))] transition-all duration-300" />
            <input 
              type="text" 
              placeholder={t('pages.users.search_placeholder', 'Search strategists by name, email or node ID...')} 
              className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] pl-14 pr-6 py-4 text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all font-bold"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-3 px-6 py-3 bg-[rgb(var(--bg-surface))] hover:bg-[rgb(var(--bg-surface-2))] rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-all text-[11px] font-black uppercase tracking-[0.2em] shadow-sm">
              <Filter className="w-4 h-4" /> {t('pages.users.filters', 'Filters')}
            </button>
            <div className="w-px h-8 bg-[rgb(var(--border))]" />
            <p className="text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em]">
              {t('pages.users.strategic_nodes', 'Strategic Nodes:')} <span className="text-[rgb(var(--text-primary))] text-base font-black ml-1 font-mono">{users.length}</span>
            </p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[rgb(var(--bg-surface-2))] transition-colors">
                <th className="px-10 py-6 text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.users.col_identity', 'Strategist Identity')}</th>
                <th className="px-10 py-6 text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.users.col_status', 'Auth Status')}</th>
                <th className="px-10 py-6 text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.users.col_roles', 'Governance Roles')}</th>
                <th className="px-10 py-6 text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.users.col_date', 'Entry Date')}</th>
                <th className="px-10 py-6 text-right text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em]">{t('pages.users.col_control', 'Control')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center text-[rgb(var(--text-muted))] font-black text-xs uppercase tracking-widest animate-pulse">{t('pages.users.syncing', 'Syncing Encrypted Nodes...')}</td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="group hover:bg-[rgb(var(--bg-surface-2))] transition-colors cursor-default">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-[rgb(var(--bg-surface-2))] rounded-2xl flex items-center justify-center text-[rgb(var(--primary))] border border-[rgb(var(--border))] shadow-sm group-hover:bg-[rgb(var(--bg-surface))] transition-all duration-300">
                        <span className="text-xl font-black uppercase font-mono">{user.full_name?.[0] || user.email[0]}</span>
                      </div>
                      <div>
                        <p className="text-base font-black text-[rgb(var(--text-primary))] group-hover:text-[rgb(var(--primary))] transition-colors leading-tight mb-1">{user.full_name || 'Anonymous Node'}</p>
                        <div className="flex items-center gap-2 text-[rgb(var(--text-muted))] font-bold">
                          <Mail className="w-3 h-3" />
                          <p className="text-xs group-hover:text-[rgb(var(--text-secondary))]">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                      user.status === 'ACTIVE' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      {user.status}
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex flex-wrap gap-2">
                       {user.user_roles?.map((ur: any) => (
                        <span key={ur.role_id} className="px-3 py-1 bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] rounded-lg text-[10px] font-black text-[rgb(var(--text-muted))] tracking-widest uppercase transition-all">
                          {ur.role_id}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-3 text-[rgb(var(--text-muted))] font-bold">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">{new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <button className="p-3 bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] rounded-xl border border-[rgb(var(--border))] transition-all shadow-sm">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Banner */}
      <div className="mt-16 p-10 bg-[rgb(var(--bg-surface-2))] rounded-[var(--radius-card)] border border-[rgb(var(--border))] flex flex-col md:flex-row items-center justify-between relative overflow-hidden group shadow-[var(--shadow-sm)]">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[rgb(var(--primary))] opacity-[0.03] blur-[100px] rounded-full -mr-48 -mt-48" />
        
        <div className="flex items-center gap-8 relative z-10">
          <div className="p-5 bg-white rounded-3xl text-[rgb(var(--primary))] border border-[rgb(var(--border))] shadow-sm group-hover:scale-110 transition-transform duration-500">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-[rgb(var(--text-primary))] mb-2 tracking-tight transition-colors">{t('pages.users.security_lock', 'Enterprise Infrastructure Lock')}</h3>
            <p className="text-[rgb(var(--text-secondary))] text-lg font-bold max-w-xl transition-colors">{t('pages.users.security_desc', 'Enforce multi-factor authentication and advanced governance policies across all administrative strategic nodes.')}</p>
          </div>
        </div>
        <button className="mt-8 md:mt-0 px-8 py-4 bg-[rgb(var(--primary))] text-white rounded-[var(--radius-btn)] font-black text-xs uppercase tracking-widest hover:bg-[rgb(var(--primary-hover))] active:scale-95 transition-all shadow-lg relative z-10" onClick={() => alert("Phase 2 feature.")}>
          {t('pages.users.enforce', 'Enforce Governance')}
        </button>
      </div>
    </div>
  );
};

export default UsersPage;
