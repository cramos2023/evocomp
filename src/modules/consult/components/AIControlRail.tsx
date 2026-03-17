import React from 'react';
import { InteractionMode } from '../types/evidence';
import { MessageSquare, HelpCircle, Zap, History, Database, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AIControlRailProps {
  mode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
}

const AIControlRail: React.FC<AIControlRailProps> = ({ mode, onModeChange }) => {
  const { t } = useTranslation();
  const modes: { id: InteractionMode; label: string; icon: any; color: string }[] = [
    { id: 'ASK', label: t('consult.control_rail.modes.ask'), icon: MessageSquare, color: 'rgb(var(--accent-purple))' },
    { id: 'EXPLAIN', label: t('consult.control_rail.modes.explain'), icon: HelpCircle, color: 'rgb(var(--accent-blue))' },
    { id: 'RECOMMEND', label: t('consult.control_rail.modes.recommend'), icon: Zap, color: 'rgb(var(--accent-emerald))' },
  ];

  return (
    <div className="w-[280px] bg-[rgba(var(--surface-card),0.5)] border-r border-[rgba(255,255,255,0.05)] h-full flex flex-col shrink-0">
      {/* Mode Selector */}
      <div className="p-6 space-y-4">
        <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em]">
          {t('consult.control_rail.interaction_mode')}
        </label>
        <div className="flex flex-col gap-2">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                mode === m.id 
                  ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] shadow-lg' 
                  : 'hover:bg-[rgba(255,255,255,0.03)] opacity-60'
              }`}
            >
              <m.icon 
                className="w-4 h-4" 
                style={{ color: mode === m.id ? m.color : 'inherit' }} 
              />
              <span className={`text-sm font-semibold tracking-tight ${mode === m.id ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                {m.label}
              </span>
              {mode === m.id && (
                <div 
                  className="ml-auto w-1.5 h-1.5 rounded-full" 
                  style={{ backgroundColor: m.color }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence Scope */}
      <div className="px-6 py-4 space-y-4 border-t border-[rgba(255,255,255,0.05)]">
        <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em]">
          {t('consult.control_rail.evidence_scope')}
        </label>
        <div className="space-y-3">
          {[
            { id: 'Structure', label: t('consult.control_rail.scopes.structure') },
            { id: 'Diagnostics', label: t('consult.control_rail.scopes.diagnostics') },
            { id: 'Simulation', label: t('consult.control_rail.scopes.simulation') },
            { id: 'Market', label: t('consult.control_rail.scopes.market') }
          ].map((scope) => (
            <div key={scope.id} className="flex items-center gap-3 group cursor-pointer">
              <div className="w-4 h-4 border border-[rgba(255,255,255,0.2)] rounded flex items-center justify-center group-hover:border-[rgb(var(--accent-emerald))] transition-colors">
                <div className="w-2 h-2 bg-[rgb(var(--accent-emerald))] rounded-sm scale-100" />
              </div>
              <span className="text-xs text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))] transition-colors">
                {scope.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Consultations */}
      <div className="flex-1 overflow-y-auto px-6 py-6 border-t border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em]">
            {t('consult.control_rail.history')}
          </label>
          <History className="w-3 h-3 text-[rgba(var(--text-secondary),0.4)]" />
        </div>
        <div className="space-y-1">
          <p className="px-3 py-2 text-[11px] text-[rgba(var(--text-secondary),0.5)] italic">
            {t('consult.control_rail.no_history')}
          </p>
        </div>
      </div>

      {/* Suggested Prompts Footer */}
      <div className="p-4 mt-auto border-t border-[rgba(255,255,255,0.05)] bg-[rgba(var(--surface-main),0.2)]">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-3 h-3 text-[rgb(var(--accent-emerald))]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--accent-emerald))]">
            {t('consult.control_rail.suggested')}
          </span>
        </div>
        <div className="space-y-2">
          {[
            t('consult.control_rail.suggested_prompts.compression'),
             t('consult.control_rail.suggested_prompts.market_lag')
          ].map((p) => (
            <button key={p} className="w-full text-left text-[11px] text-[rgba(var(--text-secondary),0.7)] hover:text-[rgb(var(--accent-emerald))] hover:bg-[rgba(var(--accent-emerald),0.05)] px-2 py-1.5 rounded transition-all">
              • {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIControlRail;
