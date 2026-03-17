import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, ChevronLeft } from 'lucide-react';
import { jdService } from '../services/jdService';
import { useJDCatalogs } from '../hooks/useJDCatalogs';
import type { JDProfile, JDStatus, JDFilters } from '../types/jd';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700 text-zinc-300',
  active: 'bg-emerald-900/60 text-emerald-300',
  archived: 'bg-zinc-800 text-zinc-500',
};

export default function JDRepositoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { functions, careerLevels } = useJDCatalogs();
  const p = 'pages.job_description.repository';

  const [profiles, setProfiles] = useState<JDProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<JDFilters>({});

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      console.log('--- fetching profiles ---');
      const data = await jdService.getProfiles({ ...filters, search: search || undefined });
      console.log('Profiles returned data:', data);
      setProfiles(data);
    } catch (e: any) {
      console.error('Error fetching profiles:', e);
      alert(`Debug Error: ${e.message}`);
    }
    setLoading(false);
  }, [search, filters]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const getLatestVersion = (profile: JDProfile) => {
    if (!profile.versions || profile.versions.length === 0) return null;
    return profile.versions[profile.versions.length - 1];
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg-app))] text-[rgb(var(--text-primary))] noise-bg selection:bg-[#CC5833] selection:text-white" data-testid="jd-repository-page">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/workspace/job-description')}
              className="p-2 bg-[rgb(var(--surface-card))] dark:bg-white/5 border border-[rgb(var(--border-primary))] dark:border-white/10 rounded-xl text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] dark:hover:text-white hover:bg-[rgb(var(--surface-main))] dark:hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 data-testid="repo-title" className="text-3xl font-bold tracking-tight text-[rgb(var(--text-primary))] dark:text-white">{t(`${p}.title`)}</h1>
              <p className="text-sm text-[rgb(var(--text-muted))] mt-1 font-medium">{t(`${p}.subtitle`)}</p>
            </div>
            <button 
              onClick={fetchProfiles} 
              className="ml-2 p-2 bg-[rgb(var(--surface-card))] dark:bg-white/5 border border-[rgb(var(--border-primary))] dark:border-white/10 text-[rgb(var(--text-muted))] dark:text-white/40 hover:text-[rgb(var(--text-primary))] dark:hover:text-white hover:bg-[rgb(var(--surface-main))] dark:hover:bg-white/10 rounded-xl transition-all" 
              title="Force Refresh"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
            </button>
          </div>
          
          <button
            data-testid="new-profile-btn"
            onClick={() => navigate('/workspace/job-description/profiles/new')}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {t(`${p}.new_profile`)}
          </button>
        </div>

        {/* Functional Area */}
        <div className="bg-[rgb(var(--surface-card))] dark:bg-white/[0.02] border border-[rgb(var(--border-primary))] dark:border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-2xl">
          
          {/* Filters Bar */}
          <div className="p-6 border-b border-[rgb(var(--border-primary))] dark:border-white/5 bg-[rgb(var(--bg-surface-2))] dark:bg-white/[0.02] flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))] dark:text-white/30" />
              <input
                data-testid="search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t(`${p}.search_placeholder`)}
                className="w-full pl-11 pr-4 py-3 bg-[rgb(var(--bg-surface))] dark:bg-black/40 border border-[rgb(var(--border-primary))] dark:border-white/10 rounded-xl text-sm text-[rgb(var(--text-primary))] dark:text-white placeholder:text-[rgb(var(--text-muted))] dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <select
                data-testid="filter-function"
                value={filters.career_function || ''}
                onChange={e => setFilters(f => ({ ...f, career_function: e.target.value || undefined }))}
                className="px-4 py-3 bg-[rgb(var(--bg-surface))] dark:bg-black/40 border border-[rgb(var(--border-primary))] dark:border-white/10 rounded-xl text-sm text-[rgb(var(--text-primary))] dark:text-white/70 focus:outline-none focus:border-emerald-500/50 transition-all appearance-none min-w-[160px]"
              >
                <option value="">{t(`${p}.filter_function`)}</option>
                {functions.map((fn: string) => <option key={fn} value={fn}>{fn}</option>)}
              </select>

              <select
                data-testid="filter-level"
                value={filters.career_level || ''}
                onChange={e => setFilters(f => ({ ...f, career_level: e.target.value || undefined }))}
                className="px-4 py-3 bg-[rgb(var(--bg-surface))] dark:bg-black/40 border border-[rgb(var(--border-primary))] dark:border-white/10 rounded-xl text-sm text-[rgb(var(--text-primary))] dark:text-white/70 focus:outline-none focus:border-emerald-500/50 transition-all appearance-none min-w-[160px]"
              >
                <option value="">{t(`${p}.filter_level`)}</option>
                {careerLevels.map((lv: string) => <option key={lv} value={lv}>{lv}</option>)}
              </select>

              <select
                data-testid="filter-status"
                value={filters.status || ''}
                onChange={e => setFilters(f => ({ ...f, status: (e.target.value as JDStatus) || undefined }))}
                className="px-4 py-3 bg-[rgb(var(--bg-surface))] dark:bg-black/40 border border-[rgb(var(--border-primary))] dark:border-white/10 rounded-xl text-sm text-[rgb(var(--text-primary))] dark:text-white/70 focus:outline-none focus:border-emerald-500/50 transition-all appearance-none min-w-[140px]"
              >
                <option value="">{t(`${p}.filter_status`)}</option>
                {(['draft', 'active', 'archived'] as JDStatus[]).map(s => (
                  <option key={s} value={s}>{t(`pages.job_description.statuses.${s}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Content */}
          <div className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-white/40 font-medium animate-pulse">{t('common.loading', 'Loading...')}</p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-32" data-testid="empty-state">
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-white/20" />
                </div>
                <p className="text-white font-bold text-lg">{t(`${p}.no_profiles`)}</p>
                <p className="text-white/40 text-sm mt-2 max-w-sm mx-auto">{t(`${p}.no_profiles_desc`)}</p>
                <button
                  onClick={() => navigate('/workspace/job-description/profiles/new')}
                  className="mt-8 px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white hover:bg-white/10 transition-all"
                >
                  {t(`${p}.new_profile`)}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="profiles-table">
                  <thead className="bg-[rgb(var(--bg-surface-2))] dark:bg-black/20">
                    <tr className="border-b border-[rgb(var(--border-primary))] dark:border-white/5">
                      <th className="px-6 py-4 text-left text-[10px] text-[rgb(var(--text-muted))] dark:text-white/30 uppercase font-black tracking-[0.2em]">{t(`${p}.columns.title`)}</th>
                      <th className="px-6 py-4 text-left text-[10px] text-[rgb(var(--text-muted))] dark:text-white/30 uppercase font-black tracking-[0.2em]">{t(`${p}.columns.reference`)}</th>
                      <th className="px-6 py-4 text-left text-[10px] text-[rgb(var(--text-muted))] dark:text-white/30 uppercase font-black tracking-[0.2em]">{t(`${p}.columns.career_function`)}</th>
                      <th className="px-6 py-4 text-left text-[10px] text-[rgb(var(--text-muted))] dark:text-white/30 uppercase font-black tracking-[0.2em]">{t(`${p}.columns.career_level`)}</th>
                      <th className="px-6 py-4 text-left text-[10px] text-[rgb(var(--text-muted))] dark:text-white/30 uppercase font-black tracking-[0.2em]">{t(`${p}.columns.status`)}</th>
                      <th className="px-6 py-4 text-left text-[10px] text-[rgb(var(--text-muted))] dark:text-white/30 uppercase font-black tracking-[0.2em] text-right">{t(`${p}.columns.updated`)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border-primary))] dark:divide-white/5">
                    {profiles.map(profile => {
                      const v = getLatestVersion(profile);
                      const title = v?.title || profile.reference_job_code;
                      const st = v?.status || 'draft';
                      return (
                        <tr
                          key={profile.id}
                          data-testid={`profile-row-${profile.id}`}
                          onClick={() => navigate(`/workspace/job-description/profiles/${profile.id}`)}
                          className="group cursor-pointer hover:bg-[rgb(var(--bg-surface-2))] dark:hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-5 px-8">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-[rgb(var(--surface-main))] dark:bg-white/5 border border-[rgb(var(--border-primary))] dark:border-white/10 text-[rgb(var(--text-muted))] group-hover:bg-emerald-500/10 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-all">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-[rgb(var(--text-primary))] dark:text-white/90 group-hover:text-emerald-400 transition-colors">{title}</div>
                                <div className="text-[10px] text-[rgb(var(--text-muted))] dark:text-white/20 font-mono mt-0.5">{profile.reference_job_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-8 text-xs text-[rgb(var(--text-muted))] dark:text-white/30 font-mono tracking-wider">{profile.reference_job_code}</td>
                          <td className="py-5 px-8 text-sm text-[rgb(var(--text-muted))] dark:text-white/50">{v?.career_function || '-'}</td>
                          <td className="py-5 px-8 text-sm text-[rgb(var(--text-muted))] dark:text-white/50">{v?.career_level || '-'}</td>
                          <td className="py-5 px-8">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                              st === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              st === 'draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-[rgb(var(--bg-surface))] dark:bg-white/5 text-[rgb(var(--text-muted))] dark:text-white/30 border-[rgb(var(--border-primary))] dark:border-white/10'
                            }`}>
                              {t(`pages.job_description.statuses.${st}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-[rgb(var(--text-muted))] dark:text-white/30 font-medium">
                            {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Footer Stats */}
            <div className="p-6 bg-[rgb(var(--bg-surface-2))] dark:bg-black/20 border-t border-[rgb(var(--border-primary))] dark:border-white/5 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-muted))] dark:text-white/20">
                {t(`${p}.total_count`, { count: profiles.length })}
              </span>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-bold text-[rgb(var(--text-muted))] dark:text-white/40 uppercase tracking-wider">{t('pages.job_description.repository.legend_active', 'Activo')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-bold text-[rgb(var(--text-muted))] dark:text-white/40 uppercase tracking-wider">{t('pages.job_description.repository.legend_draft', 'Borrador')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
