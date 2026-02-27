import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calculator, Calendar, ArrowRight, Shield, Play, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import MeritScenarioBuilderModal from './MeritScenarioBuilderModal';

const TYPE_BADGE: Record<string, string> = { MERIT_REVIEW: 'bg-blue-100 text-blue-700', GENERAL: 'bg-slate-100 text-slate-600' };
const STATUS_BADGE: Record<string, string> = { COMPLETE: 'bg-green-100 text-green-700', RUNNING: 'bg-amber-100 text-amber-700', DRAFT: 'bg-slate-100 text-slate-500', LOCKED: 'bg-purple-100 text-purple-700' };

const ScenariosPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [scenarios, setScenarios]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => { fetchScenarios(); }, []);

  async function fetchScenarios() {
    try {
      const { data, error } = await supabase.from('scenarios').select('*, snapshot:snapshots(name)').order('created_at', { ascending: false });
      if (error) throw error;
      setScenarios(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('pages.scenarios.title')}</h1>
          <p className="text-slate-500 mt-1">{t('pages.scenarios.subtitle')}</p>
        </div>
        <button data-testid="new-scenario-btn" onClick={() => setShowBuilder(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4" />{t('pages.scenarios.new')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse"></div>)}</div>
      ) : scenarios.length === 0 ? (
        <div data-testid="scenarios-empty" className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6"><Calculator className="w-8 h-8 text-slate-300" /></div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{t('pages.scenarios.empty_title')}</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-8">{t('pages.scenarios.empty_subtitle')}</p>
          <button data-testid="create-first-scenario-btn" onClick={() => setShowBuilder(true)} className="text-blue-600 font-bold hover:text-blue-700 flex items-center gap-2 mx-auto">
            {t('pages.scenarios.learn_more')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {scenarios.map(scenario => {
            const isMerit  = scenario.scenario_type === 'MERIT_REVIEW';
            const typeKey  = scenario.scenario_type ?? 'GENERAL';
            const statusKey = scenario.status ?? 'DRAFT';
            return (
              <div key={scenario.id} data-testid={`scenario-row-${scenario.id}`}
                onClick={() => isMerit && navigate(`/app/comp/scenarios/${scenario.id}/results`)}
                className={`bg-white border border-slate-200 p-6 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all group flex items-center justify-between ${isMerit ? 'cursor-pointer' : ''}`}>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                    {isMerit ? <BarChart3 className="w-6 h-6" /> : <Calculator className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-lg font-bold text-slate-900">{scenario.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${TYPE_BADGE[typeKey] ?? TYPE_BADGE.GENERAL}`}>
                        {t(`merit.type_${typeKey.toLowerCase()}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {scenario.snapshot?.name || t('pages.scenarios.no_snapshot', 'Sin captura')}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(scenario.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">{t('pages.scenarios.budget')}</p>
                    <p className="font-bold text-slate-900">
                      {scenario.rules_json?.approved_budget_pct ? `${(scenario.rules_json.approved_budget_pct * 100).toFixed(1)}%` : scenario.budget_total ? `$${Number(scenario.budget_total).toLocaleString()}` : t('pages.scenarios.no_limit')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_BADGE[statusKey] ?? STATUS_BADGE.DRAFT}`}>{statusKey}</span>
                    {isMerit ? (
                      <button data-testid={`view-results-btn-${scenario.id}`} className="p-2 text-blue-500 hover:text-blue-700 transition-colors" onClick={e => { e.stopPropagation(); navigate(`/app/comp/scenarios/${scenario.id}/results`); }}>
                        <Play className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="p-2 text-slate-400 hover:text-slate-900"><ArrowRight className="w-5 h-5" /></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MeritScenarioBuilderModal isOpen={showBuilder} onClose={() => setShowBuilder(false)} onCreated={fetchScenarios} />
    </div>
  );
};

export default ScenariosPage;
