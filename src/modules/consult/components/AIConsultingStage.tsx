import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { InteractionMode, ConsultationResponse, ReasoningLog } from '../types/evidence';
import AIPromptComposer from './AIPromptComposer';
import AIResponseCard from './AIResponseCard';
import ConsultationStream from './ConsultationStream';
import { consultOrchestrator } from '../services/consultOrchestrator';
import { useTranslation } from 'react-i18next';

interface AIConsultingStageProps {
  mode: InteractionMode;
  profile: any;
}

const AIConsultingStage: React.FC<AIConsultingStageProps> = ({ mode, profile }) => {
  const [thread, setThread] = useState<{ question: string; response: ConsultationResponse }[]>([]);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Realtime State
  const [currentLogs, setCurrentLogs] = useState<ReasoningLog[]>([]);
  const [isRealtimeUnavailable, setIsRealtimeUnavailable] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const activeChannelRef = useRef<RealtimeChannel | null>(null);
  
  // Lifecycle Guards
  const activeCorrelationIdRef = useRef<string | null>(null);
  const hasPivotedRef = useRef<string | null>(null);
  const responseCommittedRef = useRef<boolean>(false);
  const quietWindowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupLoggedRef = useRef<string | null>(null);

  /**
   * Internal helper to remove channels and clear timers without closing the stream.
   */
  const disposeActiveChannel = useCallback(() => {
    if (activeChannelRef.current) {
      supabase.removeChannel(activeChannelRef.current);
      activeChannelRef.current = null;
    }
    
    if (quietWindowTimeoutRef.current) {
      clearTimeout(quietWindowTimeoutRef.current);
      quietWindowTimeoutRef.current = null;
    }
  }, []);

  /**
   * Terminal closer for the request lifecycle.
   */
  const terminalCleanup = useCallback((targetCorrelationId?: string | null, reason?: string) => {
    const correlationId = targetCorrelationId || activeCorrelationIdRef.current;
    
    disposeActiveChannel();

    if (correlationId && cleanupLoggedRef.current !== correlationId) {
      console.info(`[AIConsultingStage] cleanup executed${reason ? ` (${reason})` : ''} for ${correlationId}`);
      cleanupLoggedRef.current = correlationId;
    }
    
    setIsStreamActive(false);
  }, [disposeActiveChannel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => terminalCleanup(null, 'unmount');
  }, [terminalCleanup]);

  /**
   * Deterministic matching and subscription readiness helper.
   */
  const subscribeAndWait = (channel: RealtimeChannel, timeoutMs = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        supabase.removeChannel(channel);
        reject(new Error('REALTIME_TIMEOUT: Subscription reached timeout limit.'));
      }, timeoutMs);

      channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout);
          supabase.removeChannel(channel);
          reject(err || new Error('REALTIME_CHANNEL_ERROR: Failed to connect.'));
        } else if (status === 'TIMED_OUT') {
          clearTimeout(timeout);
          supabase.removeChannel(channel);
          reject(new Error('REALTIME_TIMED_OUT: Connection lost or unreachable.'));
        }
      });
    });
  };

  /**
   * Evaluates if the stream is complete based on response commitment and log status.
   */
  const checkCompletion = useCallback((logs: ReasoningLog[]) => {
    const correlationId = activeCorrelationIdRef.current;
    if (!correlationId || !responseCommittedRef.current) return;

    const latestLog = logs[logs.length - 1];
    const isTerminalStep = latestLog?.step_type === 'finalize' || latestLog?.step_type === 'error';

    if (isTerminalStep) {
      console.info('[AIConsultingStage] stream completed (terminal step)');
      terminalCleanup(correlationId, 'completion');
    } else {
      // Post-response quiet window (reset on every check if response is already committed)
      if (quietWindowTimeoutRef.current) clearTimeout(quietWindowTimeoutRef.current);
      quietWindowTimeoutRef.current = setTimeout(() => {
        if (activeCorrelationIdRef.current === correlationId) {
          console.info('[AIConsultingStage] stream completed (quiet window)');
          terminalCleanup(correlationId, 'timeout');
        }
      }, 3000);
    }
  }, [terminalCleanup]);

  /**
   * Deduplicates and sorts logs by step_order and created_at.
   */
  const processLogs = (prev: ReasoningLog[], next: ReasoningLog[]) => {
    const combined = [...prev, ...next];
    const uniqueMap = new Map();
    combined.forEach(log => uniqueMap.set(log.id, log));
    
    const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
      if (a.step_order !== b.step_order) return a.step_order - b.step_order;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // Check for completion whenever logs are updated post-response
    checkCompletion(sorted);
    return sorted;
  };

  /**
   * Pivots subscription from ai_consultations to ai_reasoning_logs.
   * Gap-safe: Subscribes FIRST, then fetches history.
   */
  const pivotToLogs = async (consultationId: string, correlationId: string) => {
    // Stale check
    if (activeCorrelationIdRef.current !== correlationId) return;
    // Double pivot check
    if (hasPivotedRef.current === correlationId) return;
    
    console.info('[AIConsultingStage] pivot started');
    hasPivotedRef.current = correlationId;
    
    // 1. Unsubscribe from consultation discovery (Non-terminal)
    disposeActiveChannel();

    // 2. Prepared targeted reasoning log subscription (FIRST to be gap-safe)
    const channel = supabase
      .channel(`logs:${consultationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_reasoning_logs',
          filter: `consultation_id=eq.${consultationId}`
        },
        (payload) => {
          // Stale check
          if (activeCorrelationIdRef.current !== correlationId) return;
          console.log('[AIConsultingStage] New log received:', payload.new);
          setCurrentLogs(prev => processLogs(prev, [payload.new as ReasoningLog]));
        }
      );

    try {
      // 3. Wait for log subscription to be live
      await subscribeAndWait(channel);
      console.info('[AIConsultingStage] log stream subscribed');
      activeChannelRef.current = channel;

      // Stale check after await
      if (activeCorrelationIdRef.current !== correlationId) return;

      // 4. Fetch historical logs (Dedupe will handle any overlaps from realtime)
      try {
        const existingLogs = await consultOrchestrator.fetchReasoningLogs(consultationId);
        
        // Final stale check before updating state
        if (activeCorrelationIdRef.current === correlationId) {
          setCurrentLogs(prev => processLogs(prev, existingLogs));
        }
      } catch (logErr) {
        console.warn('[AIConsultingStage] degraded realtime path entered (fetch logs failure)');
        setIsRealtimeUnavailable(true);
      }
    } catch (err) {
      console.warn('[AIConsultingStage] degraded realtime path entered (pivot failure)');
      setIsRealtimeUnavailable(true);
    }
  };

  const handleSend = async (question: string) => {
    if (!question.trim()) return;
    if (!profile?.tenant_id || !profile?.id) return;
    
    // 0. Cleanup previous cycle BEFORE starting new one
    const oldCorrelationId = activeCorrelationIdRef.current;
    if (oldCorrelationId) {
      terminalCleanup(oldCorrelationId, 'new_request_interruption');
    }

    const correlationId = crypto.randomUUID();
    console.info('[AIConsultingStage] correlation id generated:', correlationId);
    activeCorrelationIdRef.current = correlationId;
    hasPivotedRef.current = null;
    responseCommittedRef.current = false;
    
    // Reset state for new consultation lifecycle
    setCurrentLogs([]);
    setIsRealtimeUnavailable(false);
    setIsStreamActive(true);
    setIsLoading(true);

    console.log('[AIConsultingStage] Starting consultation with correlation_id:', correlationId);

    try {
      // 1. Pre-listen for the consultation creation
      const discoveryChannel = supabase
        .channel(`discovery:${correlationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ai_consultations',
            filter: `correlation_id=eq.${correlationId}`
          },
          (payload) => {
            // Matching discipline: validate tenant_id
            if (payload.new.tenant_id !== profile.tenant_id) {
              return;
            }
            console.info('[AIConsultingStage] discovery row matched');
            pivotToLogs(payload.new.id, correlationId);
          }
        );

      // 2. Wait until delivery channel is strictly live
      try {
        await subscribeAndWait(discoveryChannel);
        console.info('[AIConsultingStage] discovery subscribed');
        activeChannelRef.current = discoveryChannel;
      } catch (subErr) {
        console.warn('[AIConsultingStage] degraded realtime path entered (discovery failure)');
        setIsRealtimeUnavailable(true);
      }

      // 3. Invoke the engine
      const response = await consultOrchestrator.consult(
        profile.tenant_id,
        profile.id,
        question,
        mode,
        {}, // Scope params
        correlationId
      );
      console.info('[AIConsultingStage] edge response returned');

      // 4. Pivot if not already happened via subscription (safety fallback)
      // Guarded by correlationId and hasPivotedRef inside pivotToLogs
      if (response.consultation_id && !response.consultation_id.startsWith('err-')) {
        await pivotToLogs(response.consultation_id, correlationId);
      }

      // Final stale check before committing to thread
      if (activeCorrelationIdRef.current === correlationId) {
        setThread(prev => [...prev, { question, response }]);
        responseCommittedRef.current = true;
        
        // Trigger completion check now that response is committed
        setCurrentLogs(prev => {
          const sorted = [...prev];
          checkCompletion(sorted);
          return sorted;
        });
      }
    } catch (err: any) {
      console.error('Consultation critical failure:', err);
      if (activeCorrelationIdRef.current === correlationId) {
        const errorResponse: ConsultationResponse = {
          consultation_id: 'err-' + Date.now(),
          status: 'FAILED',
          error: {
            code: 'ORCHESTRATOR_FAULT',
            message: err.message || 'Consultation failed to initiate.'
          }
        };
        setThread(prev => [...prev, { question, response: errorResponse }]);
        responseCommittedRef.current = true;
        terminalCleanup(correlationId, 'orchestrator_failure');
      }
    } finally {
      if (activeCorrelationIdRef.current === correlationId) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[rgba(var(--surface-main),0.4)] relative">
      {/* Consulting Thread */}
      <div className="flex-1 overflow-y-auto p-8 space-y-12 max-w-4xl mx-auto w-full pb-48">
        {thread.length > 0 ? (
          thread.map((item, idx) => (
            <div key={idx} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Question Bubble */}
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-[rgba(var(--accent-emerald),0.1)] border border-[rgba(var(--accent-emerald),0.2)] px-6 py-4 rounded-2xl rounded-tr-none">
                  <p className="text-sm font-semibold text-[rgb(var(--accent-emerald))] tracking-tight">
                    {item.question}
                  </p>
                </div>
              </div>

              {/* AI Response Block */}
              <AIResponseCard response={item.response} />
            </div>
          ))
        ) : (
          /* Empty State */
          !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
              <div className="w-16 h-16 rounded-full bg-[rgba(var(--accent-emerald),0.1)] flex items-center justify-center border border-[rgba(var(--accent-emerald),0.2)]">
                <div className="w-8 h-8 rounded-full bg-[rgb(var(--accent-emerald))] opacity-20 animate-ping" />
                <div className="absolute w-6 h-6 rounded-full bg-[rgb(var(--accent-emerald))]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  {t('consult.stage.greeting')}
                </h2>
                <p className="text-sm text-[rgb(var(--text-secondary))] max-w-md mx-auto">
                  {t('consult.stage.subtitle')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                {[
                  t('consult.stage.suggested_prompts.compression'),
                  t('consult.stage.suggested_prompts.alignment'),
                  t('consult.stage.suggested_prompts.simulations'),
                  t('consult.stage.suggested_prompts.actions')
                ].map((p) => (
                  <button 
                    key={p} 
                    onClick={() => handleSend(p)}
                    className="p-4 text-left bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-2xl hover:bg-[rgba(var(--accent-emerald),0.05)] hover:border-[rgba(var(--accent-emerald),0.2)] transition-all group"
                  >
                    <p className="text-sm font-medium group-hover:text-[rgb(var(--accent-emerald))] transition-colors">
                      {p}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {/* Realtime Reasoning Stream */}
        {isStreamActive && (
          <div className="py-12 animate-in fade-in duration-1000">
            <ConsultationStream 
              logs={currentLogs} 
              status="RUNNING" 
              isUnavailable={isRealtimeUnavailable}
            />
          </div>
        )}
      </div>

      {/* Prompt Composer */}
      <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-[rgb(var(--surface-main))] to-transparent">
        <AIPromptComposer 
          mode={mode} 
          onSend={handleSend} 
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default AIConsultingStage;