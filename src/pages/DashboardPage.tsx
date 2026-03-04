import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Database, ArrowRight, Calculator, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { dashboardApi, DashboardStats } from '../services/dashboardApi';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentSnapshots, setRecentSnapshots] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profile?.tenant_id) {
        const dashboardStats = await dashboardApi.getDashboardStats(profile.tenant_id);
        setStats(dashboardStats);

        // Fetch 3 recent snapshots
        const { data: snapshots } = await supabase
          .from('snapshots_metrics_v')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        setRecentSnapshots(snapshots || []);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1
    }).format(amount / 1000000) + 'M';
  };

  return (
    <div className="p-10 space-y-12 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <Sparkles className="w-5 h-5 text-[rgb(var(--primary))] animate-pulse" />
            <span className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.3em] transition-colors">{t('dashboard.intelligence_active')}</span>
          </div>
          <h1 className="text-5xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none mb-3 transition-colors">{t('dashboard.title')}</h1>
          <p className="text-[rgb(var(--text-secondary))] text-lg font-bold transition-colors">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <span className="block text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1 transition-colors">{t('dashboard.system_status')}</span>
            <span className="block text-sm font-black text-[rgb(var(--text-primary))] items-center gap-2 transition-colors tracking-tight uppercase">{t('dashboard.ready')}</span>
          </div>
          <div className="w-14 h-14 bg-[rgb(var(--bg-surface))] rounded-[20px] border border-[rgb(var(--border))] flex items-center justify-center shadow-sm transition-colors">
            <div className={`w-2.5 h-2.5 ${loading ? 'bg-amber-500' : 'bg-emerald-500'} rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { 
            label: t('dashboard.active_scenarios'), 
            value: stats?.scenariosCount.toString() || '0', 
            color: 'rgb(var(--primary))',
            sub: stats?.activeCycles ? `${stats.activeCycles} ${t('cycles.active_count')}` : t('cycles.no_active_cycle')
          },
          { 
            label: t('dashboard.cycle_progress'), 
            value: `${stats?.approvalProgress.percentage || 0}%`, 
            color: '#10b981',
            sub: stats?.activeCycleName || t('cycles.no_active_cycle')
          },
          { 
            label: t('dashboard.budget_utilization'), 
            value: `${Math.round(stats?.budgetUtilization || 0)}%`, 
            color: '#6366f1',
            sub: `HC: ${stats?.latestSnapshotHeadcount || 0}`
          }
        ].map((stat, i) => (
          <div key={i} className="bg-[rgb(var(--bg-surface))] p-10 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] group hover:scale-[1.02] transition-all duration-500">
            <span className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.25em] block mb-4 transition-colors">{stat.label}</span>
            <div className="text-4xl font-black text-[rgb(var(--text-primary))] transition-colors tracking-tighter mb-2">{stat.value}</div>
            <div className="text-[10px] font-bold text-[rgb(var(--text-secondary))] uppercase tracking-widest mb-6">{stat.sub}</div>
            <div className="h-1.5 w-full bg-[rgb(var(--bg-surface-2))] rounded-full overflow-hidden border border-[rgb(var(--border))] transition-colors">
              <div 
                className="h-full transition-all duration-1000 delay-300" 
                style={{ 
                  width: i === 0 ? '60%' : i === 1 ? `${stats?.approvalProgress.percentage || 0}%` : `${stats?.budgetUtilization || 0}%`, 
                  backgroundColor: stat.color 
                }} 
              />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[rgb(var(--bg-surface))] rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-10 border-b border-[rgb(var(--border))] flex justify-between items-center bg-[rgb(var(--bg-surface-2))] transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/50 backdrop-blur-md border border-[rgb(var(--border))] rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <h2 className="font-black text-xs uppercase tracking-[0.25em] text-[rgb(var(--text-primary))] transition-colors">{t('dashboard.recent_snapshots')}</h2>
          </div>
          <Link to="/app/data/snapshots" className="text-[rgb(var(--primary))] font-black text-[10px] uppercase tracking-widest hover:translate-x-1 transition-transform flex items-center gap-2">
            {t('dashboard.explore_all')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {recentSnapshots.length === 0 ? (
          <div className="p-32 text-center transition-colors">
            <div className="w-20 h-20 bg-[rgb(var(--bg-surface-2))] rounded-[32px] flex items-center justify-center mx-auto mb-8 text-[rgb(var(--text-muted))] border border-[rgb(var(--border))] shadow-sm transition-all group hover:scale-110">
              <Sparkles className="w-10 h-10" />
            </div>
            <p className="text-[rgb(var(--text-primary))] font-bold mb-1 transition-colors">{t('dashboard.sync_msg')}</p>
            <p className="text-[rgb(var(--text-secondary))] text-xs font-medium uppercase tracking-widest transition-colors">{t('dashboard.sync_sub')}</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgb(var(--border))]">
            {recentSnapshots.map((snapshot) => (
              <div key={snapshot.snapshot_id} className="p-8 hover:bg-[rgb(var(--bg-surface-2))] transition-all flex items-center justify-between group">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-[rgb(var(--bg-surface-2))] border border-[rgb(var(--border))] rounded-xl flex items-center justify-center text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--primary))] transition-all">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-[rgb(var(--text-primary))] uppercase tracking-tight mb-1">{snapshot.snapshot_id.substring(0, 8)}...</h4>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(snapshot.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> HC: {snapshot.employee_count}</span>
                    </div>
                  </div>
                </div>
                <Link to={`/app/data/snapshots`} className="w-10 h-10 rounded-full border border-[rgb(var(--border))] flex items-center justify-center text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--primary))] hover:text-white hover:border-transparent transition-all">
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
