import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Target, AlertTriangle, Search, Filter, ArrowUpRight, ArrowDownRight, Minus, Briefcase } from 'lucide-react';
import { compService } from '../services/compService';
import { JDCompAnalysis } from '../types';
import BandAlignmentChart from '../components/BandAlignmentChart';

const CompDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<JDCompAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const p = 'compensation.dashboard';
  const asOfDate = compService.getAsOfDate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await compService.getCompensationAnalysis();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch comp analysis:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = data.filter(item => 
    item.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.job_family.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: data.length,
    noData: data.filter(i => i.alignment_status === 'NO_DATA').length,
    notMapped: data.filter(i => i.alignment_status === 'NOT_MAPPED').length,
    mapped: data.filter(i => i.alignment_status === 'MAPPED').length,
    resolved: data.filter(i => i.alignment_status === 'BAND_RESOLVED').length,
  };

  if (loading) {
    return (
      <div className="p-10 max-w-7xl mx-auto space-y-10 animate-pulse">
        <div className="h-20 bg-[rgb(var(--bg-surface-2))] rounded-3xl w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-[rgb(var(--bg-surface-2))] rounded-3xl" />)}
        </div>
        <div className="h-[400px] bg-[rgb(var(--bg-surface-2))] rounded-3xl w-full" />
      </div>
    );
  }

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none mb-3 uppercase italic">
            {t(`${p}.title`, 'Comp Intelligence')}
          </h1>
          <div className="flex items-center gap-3">
             <p className="text-[rgb(var(--text-secondary))] text-lg font-bold">{t(`${p}.subtitle`, 'Market Alignment Analysis')}</p>
             <span className="px-3 py-1 bg-[rgba(var(--primary-rgb),0.1)] text-[rgb(var(--primary))] text-[10px] font-black uppercase tracking-widest rounded-full border border-[rgba(var(--primary-rgb),0.2)]">
               Phase 2.2 Stable
             </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">{t(`${p}.as_of`, 'Data as of')}</p>
          <p className="text-sm font-black text-[rgb(var(--text-primary))]">{asOfDate}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">No Active JD</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{stats.noData}</h3>
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <Search className="w-6 h-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-3">Not Mapped</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{stats.notMapped}</h3>
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-black text-[rgb(var(--primary))] uppercase tracking-[0.2em] mb-3">Grade Mapped</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{stats.mapped}</h3>
            <div className="w-12 h-12 bg-[rgba(var(--primary-rgb),0.1)] rounded-2xl flex items-center justify-center text-[rgb(var(--primary))]">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-3">Band Resolved</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter">{stats.resolved}</h3>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Target className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Table */}
      <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-6 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-surface-2))] flex items-center justify-between gap-6">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 text-[rgb(var(--text-muted))] absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder={t(`${p}.search`, 'Search by title or family...')}
              className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl pl-12 pr-6 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] flex items-center gap-2 border border-[rgb(var(--border))] rounded-xl hover:bg-[rgb(var(--bg-surface))] transition-all">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] text-[11px] font-black text-[rgb(var(--text-muted))] uppercase tracking-[0.2em] bg-[rgb(var(--bg-surface-2))]">
                <th className="px-8 py-5">Profile / JD Title</th>
                <th className="px-8 py-5">Internal Level</th>
                <th className="px-8 py-5">Pay Grade (Market)</th>
                <th className="px-8 py-5">Market Coverage</th>
                <th className="px-8 py-5 text-right">Structural Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {filteredData.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-24 text-center text-[rgb(var(--text-muted))] italic font-bold">No profiles match your criteria.</td></tr>
              ) : filteredData.map(item => (
                <tr key={item.profile_id} className="hover:bg-[rgb(var(--bg-surface-2))] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-[rgb(var(--text-primary))]">{item.job_title}</span>
                      <span className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase">{item.job_family}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-black text-[rgb(var(--text-muted))] bg-slate-100 px-2 py-1 rounded">{item.career_level}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-black text-[rgb(var(--primary))] bg-[rgba(var(--primary-rgb),0.08)] px-2 py-1 rounded border border-[rgba(var(--primary-rgb),0.1)]">
                      {item.market_grade || '-'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <BandAlignmentChart band={item.band} alignmentStatus={item.alignment_status} />
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {item.alignment_status === 'BAND_RESOLVED' && <Target className="w-4 h-4 text-emerald-500" />}
                       {item.alignment_status === 'MAPPED' && <Target className="w-4 h-4 text-[rgb(var(--primary))]" />}
                       {item.alignment_status === 'NOT_MAPPED' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                       {item.alignment_status === 'NO_DATA' && <Search className="w-4 h-4 text-slate-300" />}
                       <span className={`text-[10px] font-black uppercase tracking-widest ${
                         item.alignment_status === 'BAND_RESOLVED' ? 'text-emerald-600' :
                         item.alignment_status === 'MAPPED' ? 'text-[rgb(var(--primary))]' :
                         item.alignment_status === 'NOT_MAPPED' ? 'text-amber-600' : 'text-slate-400'
                       }`}>
                         {item.alignment_status.replace('_', ' ')}
                       </span>
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

export default CompDashboard;
