import React from 'react';
import { ConsultationResponse } from '../types/evidence';
import { 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  BarChart3, 
  ShieldCheck,
  Cpu,
  Clock,
  Layers,
  XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AIResponseCardProps {
  response: ConsultationResponse;
}

const AIResponseCard: React.FC<AIResponseCardProps> = ({ response }) => {
  const { t } = useTranslation();
  // 1. Error State Rendering
  if (response.status === 'FAILED' || response.error) {
    const code = response.error?.code || response.failure_category || 'UNKNOWN_ERROR';
    const message = response.error?.message || t('consult.response.default_error');
    
    // User-Friendly Categorization
    let displayTitle = t('consult.response.failure_title');
    let statusHint = 'SYSTEM_ERROR';
    
    if (code === 'BUDGET_EXCEEDED') {
      displayTitle = t('consult.response.budget_exceeded_title');
      statusHint = 'QUOTA_LIMIT';
    } else if (code === 'PROVIDER_TIMEOUT' || code === 'TIMEOUT') {
      displayTitle = t('consult.response.timeout_title');
      statusHint = 'LATENCY_CEILING_REACHED';
    } else if (code === 'PROVIDER_OVERLOAD' || code === 'OVERLOAD') {
      displayTitle = t('consult.response.overload_title');
      statusHint = 'HIGH_TRAFFIC_PRESSURE';
    } else if (code === 'AUTH_REQUIRED' || code.includes('AUTH')) {
      displayTitle = t('consult.response.auth_error_title');
      statusHint = 'SESSION_EXPIRED';
    }

    return (
      <div className="bg-[rgba(var(--accent-red),0.05)] border border-[rgba(var(--accent-red),0.2)] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl p-8 space-y-4">
        <div className="flex items-center gap-3 text-[rgb(var(--accent-red))]">
          <XCircle className="w-6 h-6" />
          <h3 className="text-xl font-bold tracking-tight">{displayTitle}</h3>
          <div className="px-2 py-0.5 bg-[rgba(var(--accent-red),0.1)] border border-[rgba(var(--accent-red),0.2)] rounded text-[8px] font-mono font-bold uppercase tracking-widest ml-auto">
            {statusHint}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-mono text-[rgb(var(--accent-red))] opacity-80 uppercase tracking-widest">
            {t('consult.response.diagnostic_id')}: {response.consultation_id}
          </p>
          <p className="text-base text-[rgb(var(--text-primary))] leading-relaxed">
            {message}
          </p>
          <div className="bg-[rgba(var(--accent-red),0.08)] p-3 rounded-xl text-[11px] text-[rgb(var(--text-secondary))] leading-relaxed">
            <strong>{t('consult.response.engine_insight')}:</strong> {t('consult.response.insight_general')} 
            {code === 'TIMEOUT' ? ` ${t('consult.response.insight_timeout')}` : 
             code === 'OVERLOAD' ? ` ${t('consult.response.insight_overload')}` :
             ` ${t('consult.response.insight_retry')}`}
          </div>
        </div>
        {response.metadata?.provider && (
           <div className="pt-4 border-t border-[rgba(var(--accent-red),0.1)] text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] flex justify-between">
             <span>{t('consult.response.provider')}: {response.metadata.provider.name} ({response.metadata.provider.model})</span>
             {response.metadata.latency_ms && <span>{t('consult.response.latency')}: {response.metadata.latency_ms}ms</span>}
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[rgba(var(--surface-card),0.8)] border border-[rgba(255,255,255,0.08)] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
      {/* 2. Executive Answer */}
      <div className="p-8 border-b border-[rgba(255,255,255,0.05)] bg-gradient-to-br from-[rgba(var(--accent-emerald),0.05)] to-transparent relative overflow-hidden">
        {/* Execution Mode Badge */}
        {response.metadata?.provider?.execution_mode && (
          <div className={`absolute top-0 right-0 px-6 py-1.5 flex items-center gap-2 rounded-bl-2xl font-mono text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg backdrop-blur-md z-10 ${
            response.metadata.provider.execution_mode === 'real' 
              ? 'bg-[rgba(var(--accent-emerald),0.2)] text-[rgb(var(--accent-emerald))] border-l border-b border-[rgba(var(--accent-emerald),0.3)]'
              : response.metadata.provider.execution_mode === 'mock' 
              ? 'bg-[rgba(var(--accent-blue),0.2)] text-[rgb(var(--accent-blue))] border-l border-b border-[rgba(var(--accent-blue),0.3)]' 
              : 'bg-[rgba(var(--accent-amber),0.2)] text-[rgb(var(--accent-amber))] border-l border-b border-[rgba(var(--accent-amber),0.3)]'
          }`}>
            <Layers className="w-3 h-3" />
            {response.metadata.provider.execution_mode === 'real' ? t('consult.response.real_ai_analysis') :
             response.metadata.provider.execution_mode === 'mock' ? t('consult.response.mock_simulation') : 
             t('consult.response.automatic_fallback')}
          </div>
        )}

        <h3 className="text-2xl font-bold tracking-tight text-[rgb(var(--text-primary))] leading-snug">
          {response.executive_answer}
        </h3>
        
        {(response.metadata?.provider?.execution_mode === 'mock' || response.metadata?.provider?.execution_mode === 'fallback') && (
          <p className="mt-4 text-[11px] font-medium text-[rgba(var(--text-secondary),0.6)] flex items-center gap-2 bg-[rgba(var(--accent-blue),0.05)] border border-[rgba(var(--accent-blue),0.1)] px-3 py-1.5 rounded-lg w-fit">
            <Cpu className="w-3.5 h-3.5 text-[rgb(var(--accent-blue))]" />
            {t('consult.response.mock_note')}
          </p>
        )}
      </div>

      <div className="p-8 space-y-10">
        {/* 3. Key Findings */}
        {response.key_findings && response.key_findings.length > 0 && (
          <div className="space-y-4">
            <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em] flex items-center gap-2">
              <BarChart3 className="w-3 h-3" /> {t('consult.response.key_findings')}
            </label>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {response.key_findings.map((finding, idx) => (
                <li key={idx} className="flex flex-col gap-1 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl relative transition-all hover:bg-[rgba(255,255,255,0.04)]">
                   <div className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-[rgb(var(--accent-emerald))] shrink-0" />
                      <span className="text-xs font-bold text-[rgb(var(--text-primary))] uppercase tracking-tight">{finding.title}</span>
                   </div>
                   <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed pl-5">{finding.observation}</p>
                   {finding.impact_severity && (
                     <div className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full ${
                       finding.impact_severity === 'HIGH' ? 'bg-[rgb(var(--accent-red))]' :
                       finding.impact_severity === 'MEDIUM' ? 'bg-[rgb(var(--accent-amber))]' :
                       'bg-[rgb(var(--accent-emerald))]'
                     }`} />
                   )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 4. Risk Flags */}
        {response.risk_flags && response.risk_flags.length > 0 && (
          <div className="space-y-4">
            <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> {t('consult.response.risk_assessment')}
            </label>
            <div className="flex flex-wrap gap-3">
              {response.risk_flags.map((risk, idx) => (
                <div key={idx} className={`px-4 py-2 rounded-full border flex items-center gap-2 ${
                  risk.severity === 'CRITICAL' || risk.severity === 'HIGH' ? 'bg-[rgba(var(--accent-red),0.1)] border-[rgba(var(--accent-red),0.2)] text-[rgb(var(--accent-red))]' :
                  risk.severity === 'MEDIUM' ? 'bg-[rgba(var(--accent-amber),0.1)] border-[rgba(var(--accent-amber),0.2)] text-[rgb(var(--accent-amber))]' :
                  'bg-[rgba(var(--accent-blue),0.1)] border-[rgba(var(--accent-blue),0.2)] text-[rgb(var(--accent-blue))]'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    risk.severity === 'CRITICAL' || risk.severity === 'HIGH' ? 'bg-[rgb(var(--accent-red))]' :
                    risk.severity === 'MEDIUM' ? 'bg-[rgb(var(--accent-amber))]' :
                    'bg-[rgb(var(--accent-blue))]'
                  }`} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">{risk.type}: {risk.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-[rgba(255,255,255,0.05)]">
          {/* 5. Recommended Actions */}
          {response.suggested_actions && response.suggested_actions.length > 0 && (
            <div className="space-y-4">
              <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em] flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-[rgb(var(--accent-emerald))]" /> {t('consult.response.recommended_actions')}
              </label>
              <div className="space-y-2">
                {response.suggested_actions.map((action, idx) => (
                  <div key={idx} className="p-3 bg-[rgba(var(--accent-emerald),0.03)] border border-[rgba(var(--accent-emerald),0.08)] rounded-xl group hover:bg-[rgba(var(--accent-emerald),0.06)] transition-all cursor-pointer">
                    <p className="text-xs font-bold text-[rgb(var(--text-primary))] mb-1 group-hover:text-[rgb(var(--accent-emerald))] transition-colors">{action.label}</p>
                    <p className="text-[11px] text-[rgb(var(--text-secondary))] leading-relaxed">{action.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Suggested Simulations */}
          {response.suggested_simulations && response.suggested_simulations.length > 0 && (
            <div className="space-y-4">
              <label className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.6)] uppercase tracking-[0.2em] flex items-center gap-2">
                <Play className="w-3 h-3 text-[rgb(var(--accent-purple))]" /> {t('consult.response.test_scenarios')}
              </label>
              <div className="space-y-2">
                {response.suggested_simulations.map((sim, idx) => (
                  <button key={idx} className="w-full text-left p-3 bg-[rgba(var(--accent-purple),0.03)] border border-[rgba(var(--accent-purple),0.08)] rounded-xl group hover:bg-[rgba(var(--accent-purple),0.06)] transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[rgb(var(--accent-purple))]">{sim.label}</span>
                      <ChevronRight className="w-4 h-4 text-[rgb(var(--accent-purple))] group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-[rgb(var(--text-secondary))] leading-relaxed">{sim.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 7. Observability Footer (Provider, Tokens, Latency, Bundle) */}
        <div className="pt-6 border-t border-[rgba(255,255,255,0.05)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-[9px] font-mono text-[rgba(var(--text-secondary),0.4)] uppercase tracking-wider">
              {response.metadata?.provider && (
                <div className="flex items-center gap-2">
                  <Cpu className="w-3 h-3" />
                  <span>{response.metadata.provider.execution_mode === 'real' ? t('consult.response.production_grade') : t('consult.response.validation_only')} • {response.metadata.provider.model}</span>
                </div>
              )}
              {response.metadata?.latency_ms && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{response.metadata.latency_ms}ms</span>
                </div>
              )}
              {response.metadata?.tokens && (
                <div className="flex items-center gap-2">
                  <Layers className="w-3 h-3" />
                  <span>{response.metadata.tokens.total} TKN</span>
                </div>
              )}
            </div>

            {response.confidence && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.5)] uppercase tracking-widest">{t('consult.response.confidence')}</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[rgba(var(--accent-emerald),0.1)] border border-[rgba(var(--accent-emerald),0.2)] rounded" title={response.confidence.reasoning}>
                   <span className="text-[10px] font-bold text-[rgb(var(--accent-emerald))] tracking-tighter">{Math.round(response.confidence.score * 100)}%</span>
                   <span className="text-[8px] font-bold text-[rgb(var(--accent-emerald))] uppercase tracking-tighter">
                     {t(`consult.response.confidence_levels.${response.confidence.level.toLowerCase()}`)}
                   </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[9px] font-mono text-[rgba(var(--text-secondary),0.3)]">
            <ShieldCheck className="w-3 h-3" />
            <span>{t('consult.response.bundle')}: {response.evidence_bundle_id || 'N/A'}</span>
            {response.metadata?.bundle_id && response.metadata.bundle_id !== response.evidence_bundle_id && (
              <span> • {t('consult.response.ref')}: {response.metadata.bundle_id}</span>
            )}
            {response.metadata?.tools_executed && response.metadata.tools_executed.length > 0 && (
              <span> • {t('consult.response.evidence_via')}: {response.metadata.tools_executed.join(', ')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIResponseCard;
