import { supabase } from '@/lib/supabaseClient';
import { InteractionMode, ConsultationResponse, ReasoningLog } from '../types/evidence';

class ConsultOrchestrator {
  /**
   * Main entry point for a consultation.
   * Invokes the real consult-reasoning Edge Function.
   */
  async consult(
    tenantId: string,
    userId: string,
    question: string,
    mode: InteractionMode,
    scopeParams: {
      employeeId?: string;
      positionId?: string;
      scenarioId?: string;
      country?: string;
      filters?: Record<string, any>;
    },
    correlationId?: string,
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      use_cache?: boolean;
    }
  ): Promise<ConsultationResponse> {
    const scope = {
      tenant_id: tenantId,
      scenario_id: scopeParams.scenarioId,
      focus_node_type: scopeParams.employeeId
        ? 'EMPLOYEE'
        : scopeParams.positionId
          ? 'POSITION'
          : undefined,
      focus_node_id: scopeParams.employeeId || scopeParams.positionId,
      filters: scopeParams.filters,
    };

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl) {
        return {
          consultation_id: `err-${correlationId}`,
          status: 'FAILED',
          executive_answer: 'Configuration Error',
          error: {
            code: 'CONFIG_ERROR',
            message: 'Supabase URL is not configured. Please check your .env file.',
            context: { category: 'SETUP' }
          }
        };
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('consult-reasoning', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: {
          question,
          mode,
          scope,
          correlation_id: correlationId,
          options: {
            use_cache: true,
            ...options
          },
        },
      });

      if (error) {
        console.error('[ConsultOrchestrator] Transport Error:', error);

        // Extract structured backend error from the FunctionsHttpError response body.
        // The Supabase SDK sets error.context to the raw Response object for non-2xx responses.
        let backendErrorCode: string | null = null;
        let backendErrorMessage: string | null = null;
        if (error.context && typeof error.context.json === 'function') {
          try {
            const body = await error.context.json();
            // Handle both nested { error: { code } } and flat { code } structures
            if (body?.error?.code) {
              backendErrorCode = body.error.code;
              backendErrorMessage = body.error.message ?? null;
            } else if (body?.code) {
              backendErrorCode = body.code.toString();
              backendErrorMessage = body.message ?? null;
            }
          } catch (_) {
            // Response body not parseable or already consumed — fall through to generic path
          }
        }

        if (backendErrorCode) {
          return {
            consultation_id: `err-${correlationId}`,
            status: 'FAILED',
            error: {
              code: backendErrorCode,
              message: backendErrorMessage || 'The reasoning engine returned an error.',
              context: { category: 'BACKEND' }
            },
          };
        }

        // Specific diagnosis for fetch failures (network unreachable, CORS, not deployed)
        const isFetchError = error.message?.includes('Failed to send a request') ||
                            error.message?.includes('fetch') ||
                            !window.navigator.onLine;

        return {
          consultation_id: `err-${correlationId}`,
          status: 'FAILED',
          executive_answer: 'Connectivity Issue',
          error: {
            code: 'TRANSPORT_ERROR',
            message: isFetchError
              ? 'Failed to connect to reasoning engine. This is usually caused by missing CORS headers in the Edge Function or the function not being deployed.'
              : (error.message || 'Failed to reach reasoning engine.'),
            context: { category: 'NETWORK', originalError: error }
          },
        };
      }

      if (data?.error || data?.status === 'FAILED') {
        console.error('[ConsultOrchestrator] Backend Error:', data?.error);
        return {
          consultation_id: data?.consultation_id || 'err-' + Date.now(),
          status: 'FAILED',
          executive_answer: data?.executive_answer,
          error: data?.error || {
            code: data?.failure_category || 'BACKEND_ERROR',
            message: 'The reasoning engine encountered an issue.',
          },
          failure_category: data?.failure_category,
          metadata: data?.metadata,
        } as ConsultationResponse;
      }

      if (!data) {
        throw new Error('No data returned from consultation engine.');
      }

      return data as ConsultationResponse;
    } catch (err: any) {
      console.error('[ConsultOrchestrator] Unexpected Error:', err);
      return {
        consultation_id: 'err-' + Date.now(),
        status: 'FAILED',
        error: {
          code: 'UNEXPECTED_RUNTIME_ERROR',
          message: err.message || 'An unexpected error occurred during consultation.',
        },
      };
    }
  }

  /**
   * Fetches historical reasoning logs for a given consultation.
   * Used for the initial fetch during the realtime "Pivot" logic.
   * Throws on failure so the caller can enter degraded realtime mode.
   */
  async fetchReasoningLogs(consultationId: string): Promise<ReasoningLog[]> {
    const { data, error } = await supabase
      .from('ai_reasoning_logs')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('step_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ConsultOrchestrator] Failed to fetch logs:', error);
      throw new Error(error.message || 'Failed to fetch reasoning logs.');
    }

    return (data ?? []) as ReasoningLog[];
  }
}

export const consultOrchestrator = new ConsultOrchestrator();
