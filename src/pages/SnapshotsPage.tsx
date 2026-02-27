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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {t('sidebar.snapshots')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('pages.imports.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => navigate('/app/data/imports')}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Database className="w-4 h-4" />
            {t('pages.imports.upload')}
          </button>
          <button 
            type="button"
            onClick={fetchSnapshots}
            className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:text-slate-900 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mb-6 relative group max-w-md">
        <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
        <input 
          type="text"
          placeholder={t('common.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
        {loading && snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-slate-400 font-medium tracking-wide">Fetching secure data stores...</p>
          </div>
        ) : filteredSnapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Database className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {t('pages.scenarios.empty_title')}
            </h3>
            <p className="text-slate-500 max-w-sm mb-8">
              No snapshots have been published yet. Import your first talent dataset to start modeling.
            </p>
            <button 
              type="button"
              onClick={() => navigate('/app/data/imports')}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:shadow-lg hover:shadow-blue-600/20 transition-all active:scale-95"
            >
              Go to Imports
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-bold text-slate-400 tracking-widest">
                  <th className="px-6 py-5">Snapshot ID & Date</th>
                  <th className="px-6 py-5">Source Import</th>
                  <th className="px-6 py-5">Headcount</th>
                  <th className="px-6 py-5">Total Salary (Base)</th>
                  <th className="px-6 py-5">Currencies</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSnapshots.map((item) => (
                  <tr key={item.snapshot_id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 font-mono">
                            {item.snapshot_id.substring(0, 8)}...
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 truncate max-w-[200px]" title={item.import_file_name || item.source || item.snapshot_name}>
                          {item.import_file_name || item.source || item.snapshot_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-300" />
                        <span className="text-sm font-bold text-slate-900">{item.employee_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                         <Shield className="w-4 h-4 text-blue-400 opacity-50" />
                         <span className="text-sm font-bold text-slate-900">
                           {formatCurrency(item.total_salary_base)}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5">
                        {item.currencies.slice(0, 3).map(curr => (
                          <span key={curr} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-slate-200">
                            {curr}
                          </span>
                        ))}
                        {item.currencies.length > 3 && (
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">
                            +{item.currencies.length - 3}
                          </span>
                        )}
                        {item.currencies.length === 0 && (
                          <span className="text-[10px] text-slate-300 italic">None detected</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => handleOpenSidepanel(item.snapshot_id)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="View Details"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => navigate(`/app/comp/scenarios?fromSnapshot=${item.snapshot_id}`)}
                          className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-3 py-2 rounded-xl text-[11px] font-bold transition-all shadow-md active:scale-95"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          Run Scenario
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
