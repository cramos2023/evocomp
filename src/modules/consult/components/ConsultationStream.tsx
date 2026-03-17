import React, { useEffect, useRef } from 'react';
import { ReasoningLog, StepType } from '../types/evidence';
import { 
  Search, 
  Activity, 
  Check, 
  Layers, 
  MessageSquare, 
  Cpu, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

interface ConsultationStreamProps {
  logs: ReasoningLog[];
  status: string;
  isUnavailable?: boolean;
}

const getStepIcon = (type: StepType) => {
  switch (type) {
    case 'planner': return Search;
    case 'tool_request': return Activity;
    case 'tool_result': return Check;
    case 'bundle_build': return Layers;
    case 'llm_request': return MessageSquare;
    case 'llm_response': return Cpu;
    case 'response_validation': return ShieldCheck;
    case 'finalize': return CheckCircle2;
    case 'error': return AlertTriangle;
    default: return Activity;
  }
};

const getStepLabel = (type: StepType, input: any, t: TFunction) => {
  switch (type) {
    case 'planner': return t('consult.stream.steps.planner');
    case 'tool_request': return t('consult.stream.steps.tool_request', { tool: input?.tool || t('consult.stream.steps.tool_request_default') });
    case 'tool_result': return t('consult.stream.steps.tool_result', { tool: input?.tool || t('consult.stream.steps.tool_result_default') });
    case 'bundle_build': return t('consult.stream.steps.bundle_build');
    case 'llm_request': return t('consult.stream.steps.llm_request');
    case 'llm_response': return t('consult.stream.steps.llm_response');
    case 'response_validation': return t('consult.stream.steps.response_validation');
    case 'finalize': return t('consult.stream.steps.finalize');
    case 'error': return t('consult.stream.steps.error');
    default: return t('consult.stream.steps.default');
  }
};

const ConsultationStream: React.FC<ConsultationStreamProps> = ({ logs, status, isUnavailable }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Auto-scroll to bottom of stream
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[rgb(var(--accent-emerald))] animate-pulse" />
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] text-[rgba(var(--text-primary),0.6)]">
            {t('consult.stream.title')}
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-mono text-[rgba(var(--text-secondary),0.4)] uppercase">
          {isUnavailable ? (
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-[rgba(var(--accent-emerald),0.05)] border border-[rgba(var(--accent-emerald),0.1)] text-[rgb(var(--accent-emerald))]">
              <Activity className="w-2 h-2 animate-pulse" />
              <span>{t('consult.stream.connectivity_limited')}</span>
            </div>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              <span>{t('consult.stream.realtime_enabled')}</span>
            </>
          )}
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="relative border-l border-[rgba(255,255,255,0.05)] ml-8 pl-8 space-y-8 max-h-[400px] overflow-y-auto no-scrollbar scroll-smooth"
      >
        {logs.map((log, idx) => {
          const Icon = getStepIcon(log.step_type);
          const isLast = idx === logs.length - 1;
          const isError = log.step_type === 'error' || !log.success;

          return (
            <div 
              key={log.id} 
              className={`relative group animate-in zoom-in-95 fade-in duration-300 ${isLast ? '' : 'opacity-60 hover:opacity-100 transition-opacity'}`}
            >
              {/* Timeline Connector Dot */}
              <div className={`absolute -left-[45px] top-1 w-8 h-8 rounded-full flex items-center justify-center border backdrop-blur-md z-10 transition-all ${
                isError ? 'bg-[rgba(var(--accent-red),0.1)] border-[rgba(var(--accent-red),0.3)] text-[rgb(var(--accent-red))]' :
                isLast ? 'bg-[rgba(var(--accent-emerald),0.1)] border-[rgba(var(--accent-emerald),0.4)] text-[rgb(var(--accent-emerald))] scale-110 shadow-[0_0_15px_rgba(var(--accent-emerald),0.2)]' :
                'bg-[rgba(var(--surface-card),0.8)] border-[rgba(255,255,255,0.1)] text-[rgba(var(--text-secondary),0.6)]'
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Step Content */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-bold tracking-tight ${isError ? 'text-[rgb(var(--accent-red))]' : 'text-[rgb(var(--text-primary))]'}`}>
                    {getStepLabel(log.step_type, log.input_json, t)}
                  </p>
                  <span className="text-[10px] font-mono text-[rgba(var(--text-secondary),0.4)]">
                    {log.latency_ms > 0 ? `${log.latency_ms}ms` : ''}
                  </span>
                </div>
                
                {isLast && status === 'RUNNING' && log.step_type !== 'finalize' && log.step_type !== 'error' && (
                  <div className="flex items-center gap-2 pt-1">
                    <Loader2 className="w-3 h-3 text-[rgb(var(--accent-emerald))] animate-spin" />
                    <span className="text-[10px] text-[rgba(var(--text-secondary),0.5)] italic">{t('consult.stream.moving_to_next')}</span>
                  </div>
                )}

                {log.error_message && (
                  <p className="text-[11px] text-[rgb(var(--accent-red))] opacity-80 font-medium bg-[rgba(var(--accent-red),0.05)] p-2 rounded-lg border border-[rgba(var(--accent-red),0.1)]">
                    {log.error_message}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state while waiting for first log */}
        {logs.length === 0 && (
          <div className="relative animate-pulse">
             <div className="absolute -left-[45px] top-1 w-8 h-8 rounded-full flex items-center justify-center border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.2)]">
                <Search className="w-4 h-4" />
             </div>
             <p className="text-sm font-medium text-[rgba(var(--text-secondary),0.4)] italic">
               {t('consult.stream.initializing')}
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultationStream;
