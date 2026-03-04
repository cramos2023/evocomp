import { useEffect, useState } from 'react';
import { 
  Database, Users, Calculator, 
  ArrowRight, RefreshCw, Search,
  Clock, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import SnapshotSidepanel from '../components/SnapshotSidepanel';

interface SnapshotMetric {
  snapshot_id: string;
  tenant_id: string;
  snapshot_name: string;
  snapshot_date: string;
  source: string;
  created_by: string;
  created_at: string;
  import_id: string | null;
  import_file_name: string | null;
  employee_count: number;
  total_salary_base: number;
  currencies: string[];
  currency_totals_local: Record<string, number>;
  currency_counts: Record<string, number>;
}

const SnapshotsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<SnapshotMetric[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isSidepanelOpen, setIsSidepanelOpen] = useState(false);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('snapshots_metrics_v')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSnapshots(data || []);
    } catch (err) {
      console.error('Error fetching snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSnapshots = snapshots.filter(s => 
    s.snapshot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.import_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.import_file_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleOpenSidepanel = (id: string) => {
    setSelectedSnapshotId(id);
    setIsSidepanelOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tighter leading-none mb-3 transition-colors">
            {t('sidebar.snapshots')}
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-lg font-bold transition-colors">
            {t('pages.imports.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => navigate('/app/data/imports')}
            className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] px-5 py-2.5 rounded-[var(--radius-btn)] font-black text-xs uppercase tracking-widest flex items-center gap-2.5 hover:bg-[rgb(var(--bg-surface-2))] transition-all shadow-sm"
          >
            <Database className="w-4 h-4" />
            {t('pages.imports.upload')}
          </button>
          <button 
            type="button"
            onClick={fetchSnapshots}
            className="p-3 bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] rounded-[var(--radius-btn)] border border-[rgb(var(--border))] hover:text-[rgb(var(--text-primary))] transition-all shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mb-8 relative group max-w-md">
        <Search className="w-5 h-5 text-[rgb(var(--text-muted))] absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[rgb(var(--primary))] transition-colors" />
        <input 
          type="text"
          placeholder={t('common.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-btn)] pl-12 pr-4 py-3 text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] outline-none focus:ring-[3px] focus:ring-[rgba(46,79,210,0.18)] focus:border-[rgb(var(--primary))] transition-all font-bold shadow-sm"
        />
      </div>

      <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] overflow-hidden min-h-[400px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {loading && snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-32 gap-6">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[rgb(var(--border))] border-b-[rgb(var(--primary))]"></div>
            <p className="text-[rgb(var(--text-muted))] font-black uppercase tracking-[0.2em] text-xs">{t('pages.snapshots.fetching', 'Fetching secure data stores...')}</p>
          </div>
        ) : filteredSnapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-32 text-center">
            <div className="w-20 h-20 bg-[rgb(var(--bg-surface-2))] rounded-3xl flex items-center justify-center mb-8 border border-[rgb(var(--border))]">
              <Database className="w-10 h-10 text-[rgb(var(--text-muted))]" />
            </div>
            <h3 className="text-2xl font-black text-[rgb(var(--text-primary))] mb-3 tracking-tight">
              {t('pages.scenarios.empty_title')}
            </h3>
              {t('pages.snapshots.empty_message', 'No snapshots have been published yet. Import your first talent dataset to start modeling.')}
            <button 
              type="button"
              onClick={() => navigate('/app/data/imports')}
              className="btn-premium px-8 py-3.5"
            >
              {t('pages.snapshots.go_to_imports', 'Go to Imports')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[rgb(var(--bg-surface-2))] border-b border-[rgb(var(--border))] uppercase text-[10px] font-black text-[rgb(var(--text-muted))] tracking-[0.25em]">
                  <th className="px-8 py-5">{t('pages.snapshots.col_id_date', 'Snapshot ID & Date')}</th>
                  <th className="px-8 py-5">{t('pages.snapshots.col_source', 'Source Import')}</th>
                  <th className="px-8 py-5">{t('pages.snapshots.col_headcount', 'Headcount')}</th>
                  <th className="px-8 py-5">{t('pages.snapshots.col_salary', 'Total Salary (Base)')}</th>
                  <th className="px-8 py-5">{t('pages.snapshots.col_currencies', 'Currencies')}</th>
                  <th className="px-8 py-5 text-right">{t('pages.snapshots.col_actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {filteredSnapshots.map((item) => (
                  <tr key={item.snapshot_id} className="group hover:bg-[rgb(var(--bg-surface-2))] transition-colors cursor-default">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-[rgb(var(--primary))] rounded-xl flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-all">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[rgb(var(--text-primary))] font-mono tracking-tight leading-none mb-1.5">
                            {item.snapshot_id.substring(0, 8)}...
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-[rgb(var(--text-muted))] font-bold uppercase tracking-tight">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm text-[rgb(var(--text-secondary))] font-bold truncate max-w-[200px]" title={item.import_file_name || item.source || item.snapshot_name}>
                        {item.import_file_name || item.source || item.snapshot_name}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                        <span className="text-sm font-black text-[rgb(var(--text-primary))]">{item.employee_count}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-[rgb(var(--text-primary))]">
                        {formatCurrency(item.total_salary_base)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {item.currencies.slice(0, 3).map(curr => (
                          <span key={curr} className="bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-secondary))] px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border border-[rgb(var(--border))]">
                            {curr}
                          </span>
                        ))}
                        {item.currencies.length > 3 && (
                          <span className="bg-blue-50 text-[rgb(var(--primary))] px-2 py-1 rounded text-[10px] font-black border border-blue-100">
                            +{item.currencies.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          type="button"
                          onClick={() => handleOpenSidepanel(item.snapshot_id)}
                          className="p-3 bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] rounded-[var(--radius-btn)] border border-[rgb(var(--border))] transition-all"
                          title={t('pages.snapshots.view_details', 'View Details')}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => navigate(`/app/comp/scenarios?fromSnapshot=${item.snapshot_id}`)}
                          className="flex items-center gap-2.5 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-white px-5 py-2.5 rounded-[var(--radius-btn)] text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                        >
                          <Calculator className="w-4 h-4" />
                          {t('pages.snapshots.run_scenario', 'Run Scenario')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SnapshotSidepanel 
        snapshotId={selectedSnapshotId}
        isOpen={isSidepanelOpen}
        onClose={() => setIsSidepanelOpen(false)}
      />
    </div>
  );
};

export default SnapshotsPage;
