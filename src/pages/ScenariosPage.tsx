import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Calculator, Calendar, ArrowRight, Shield, Play, BarChart3, Trash2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import MeritScenarioBuilderModal from './MeritScenarioBuilderModal';

const TYPE_BADGE: Record<string, string> = { MERIT_REVIEW: 'bg-blue-100 text-blue-700', GENERAL: 'bg-slate-100 text-slate-600' };
const STATUS_BADGE: Record<string, string> = { COMPLETE: 'bg-green-100 text-green-700', RUNNING: 'bg-amber-100 text-amber-700', DRAFT: 'bg-slate-100 text-slate-500', LOCKED: 'bg-purple-100 text-purple-700' };

const ScenariosPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const snapshotIdFromUrl = searchParams.get('snapshotId');
  
  const [scenarios, setScenarios]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showBuilder, setShowBuilder] = useState(!!snapshotIdFromUrl);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { fetchScenarios(); }, []);

  async function fetchScenarios() {
    try {
      const { data, error } = await supabase.from('scenarios').select('*, snapshot:snapshots(name)').order('created_at', { ascending: false });
      if (error) throw error;
      setScenarios(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleDeleteScenario() {
    if (!scenarioToDelete) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('scenarios').delete().eq('id', scenarioToDelete);
      if (error) throw error;
      setScenarioToDelete(null);
      await fetchScenarios();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting scenario');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="p-8 transition-colors duration-500">
      <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
        <Link 
          to="/workspace" 
          className="inline-flex items-center gap-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] transition-colors font-bold text-xs uppercase tracking-widest group"
        >
          <div className="w-8 h-8 rounded-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] flex items-center justify-center group-hover:border-[rgb(var(--primary))] transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          {t('nav.back_to_workspace')}
        </Link>
      </div>

      <div className="flex justify-between items-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-tight leading-none mb-2 transition-colors">
            {t('pages.scenarios.title')}
          </h1>
          <p className="text-[rgb(var(--text-secondary))] font-medium transition-colors">
            {t('pages.scenarios.subtitle')}
          </p>
        </div>
        <button 
          id="new-scenario-btn"
          data-testid="new-scenario-btn" 
          onClick={() => setShowBuilder(true)} 
          className="btn-premium py-3 px-6 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t('pages.scenarios.new')}</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-[var(--radius-card)] animate-pulse shadow-sm" />
          ))}
        </div>
      ) : scenarios.length === 0 ? (
        <div data-testid="scenarios-empty" className="bg-[rgb(var(--bg-surface-2))] p-24 text-center border-dashed border-2 border-[rgb(var(--border))] rounded-[var(--radius-card)]">
          <div className="w-16 h-16 bg-[rgb(var(--bg-surface))] rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-8 border border-[rgb(var(--border))] transition-colors">
            <Calculator className="w-8 h-8 text-[rgb(var(--text-muted))]" />
          </div>
          <h3 className="text-2xl font-black text-[rgb(var(--text-primary))] mb-3 tracking-tight transition-colors">{t('pages.scenarios.empty_title')}</h3>
          <p className="text-[rgb(var(--text-secondary))] max-w-sm mx-auto mb-10 font-bold transition-colors">{t('pages.scenarios.empty_subtitle')}</p>
          <button data-testid="create-first-scenario-btn" onClick={() => setShowBuilder(true)} className="text-[rgb(var(--primary))] font-black hover:scale-110 transition-transform flex items-center gap-2 mx-auto uppercase tracking-widest text-xs">
            {t('pages.scenarios.learn_more')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div id="scenario-list" className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
          {scenarios.map(scenario => {
            const isMerit  = scenario.scenario_type === 'MERIT_REVIEW';
            const typeKey  = scenario.scenario_type ?? 'GENERAL';
            const statusKey = scenario.status ?? 'DRAFT';
            return (
              <div key={scenario.id} data-testid={`scenario-row-${scenario.id}`}
                onClick={() => isMerit && navigate(`/app/comp/scenarios/${scenario.id}/results`)}
                className={`bg-[rgb(var(--bg-surface))] p-8 rounded-[var(--radius-card)] border border-[rgb(var(--border))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 group flex items-center justify-between ${isMerit ? 'cursor-pointer' : ''}`}>
                <div className="flex gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                    isMerit 
                      ? 'bg-blue-50 text-[rgb(var(--primary))] border-blue-100' 
                      : 'bg-slate-50 text-[rgb(var(--text-muted))] border-slate-100'
                  }`}>
                    {isMerit ? <BarChart3 className="w-7 h-7" /> : <Calculator className="w-7 h-7" />}
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-xl font-black text-[rgb(var(--text-primary))] tracking-tight group-hover:text-[rgb(var(--primary))] transition-colors leading-none">
                        {scenario.name}
                      </h3>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        typeKey === 'MERIT_REVIEW' 
                          ? 'bg-[rgba(46,79,210,0.08)] text-[rgb(var(--primary))] border-[rgb(var(--primary-soft))]' 
                          : 'bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))]'
                      }`}>
                        {t(`merit.type_${typeKey.toLowerCase()}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-[11px] text-[rgb(var(--text-muted))] font-bold uppercase tracking-tight">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-[rgb(var(--primary))]" /> 
                        {scenario.snapshot?.name || t('pages.scenarios.no_snapshot', 'Sin captura')}
                      </span>
                      <span className="flex items-center gap-1.5 font-bold">
                        <Calendar className="w-3.5 h-3.5" /> 
                        {new Date(scenario.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-10">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-[rgb(var(--text-muted))] tracking-[0.2em] mb-1 leading-none">
                      {t('pages.scenarios.budget')}
                    </p>
                    <p className="font-black text-xl text-[rgb(var(--text-primary))] leading-none transition-colors">
                      {scenario.rules_json?.approved_budget_pct ? `${(scenario.rules_json.approved_budget_pct * 100).toFixed(1)}%` : scenario.budget_total ? `$${Number(scenario.budget_total).toLocaleString()}` : t('pages.scenarios.no_limit')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                      statusKey === 'COMPLETE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      statusKey === 'RUNNING'  ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      statusKey === 'LOCKED'   ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                      'bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))]'
                    }`}>
                      {statusKey}
                    </span>
                    {isMerit ? (
                      <button 
                        id="scenario-results-btn"
                        data-testid={`view-results-btn-${scenario.id}`} 
                        className="w-12 h-12 bg-[rgb(var(--primary))] text-white rounded-[var(--radius-btn)] hover:bg-[rgb(var(--primary-hover))] active:scale-95 transition-all shadow-lg flex items-center justify-center"
                        onClick={e => { e.stopPropagation(); navigate(`/app/comp/scenarios/${scenario.id}/results`); }}
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    ) : (
                      <button className="w-12 h-12 bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] rounded-[var(--radius-btn)] border border-[rgb(var(--border))] hover:text-[rgb(var(--text-primary))] transition-all flex items-center justify-center">
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      data-testid={`delete-scenario-btn-${scenario.id}`}
                      onClick={e => { e.stopPropagation(); setScenarioToDelete(scenario.id); }}
                      className="w-12 h-12 flex items-center justify-center bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-[var(--radius-btn)] transition-all shadow-sm" 
                      title="Eliminar Escenario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MeritScenarioBuilderModal 
        isOpen={showBuilder} 
        onClose={() => setShowBuilder(false)} 
        onCreated={fetchScenarios} 
        initialSnapshotId={snapshotIdFromUrl || undefined}
      />

      {/* Confirmation Modal */}
      {scenarioToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center space-y-8">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-500/5">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-black text-[rgb(var(--text-primary))] tracking-tighter uppercase">
                  {t('pages.scenarios.delete_confirm_title')}
                </h3>
                <p className="text-[rgb(var(--text-secondary))] text-sm font-bold leading-relaxed">
                  {t('pages.scenarios.delete_confirm_subtitle')}
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setScenarioToDelete(null)}
                  className="flex-1 bg-[rgb(var(--bg-surface-2))] text-[rgb(var(--text-muted))] py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-[rgb(var(--text-primary))] transition-all"
                >
                  {t('merit.cancel')}
                </button>
                <button 
                  onClick={handleDeleteScenario}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {deleteLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Trash2 className="w-4 h-4" />}
                  {t('pages.scenarios.delete_confirm_button')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenariosPage;
