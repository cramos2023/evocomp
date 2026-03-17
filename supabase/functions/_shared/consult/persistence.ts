import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { ConsultationStatus, StepType, ConsultationRequest } from './contracts.ts';
import { ProviderInternalError } from './errors.ts';

export class PersistenceService {
  constructor(private supabase: SupabaseClient, private tenantId: string) {}

  async createConsultation(payload: ConsultationRequest, initialStatus: ConsultationStatus = 'RECEIVED', failureCategory?: string, userId?: string, correlationId?: string) {
    const { data, error } = await this.supabase
      .from('ai_consultations')
      .insert({
        tenant_id: this.tenantId,
        user_id: userId,
        correlation_id: correlationId,
        interaction_mode: payload.mode,
        normalized_question: payload.question,
        question: payload.question,
        scope_json: payload.scope,
        consultation_status: initialStatus,
        failure_category: failureCategory || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new ProviderInternalError(`Failed to create consultation: ${error.message}`);
    return data;
  }

  async updateStatus(consultationId: string, status: ConsultationStatus, extra: Record<string, unknown> = {}) {
    const updatePayload: Record<string, unknown> = {
      consultation_status: status,
      updated_at: new Date().toISOString(),
      ...extra,
    };

    if (status === 'COMPLETED' || status === 'FAILED') {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('ai_consultations')
      .update(updatePayload)
      .eq('id', consultationId);

    if (error) throw new ProviderInternalError(`Failed to update consultation status to ${status}: ${error.message}`);
  }

  async logStep(consultationId: string, stepOrder: number, type: StepType, payload: { status?: string; input?: unknown; output?: unknown; latency?: number; success?: boolean; error_code?: string; error_message?: string; started_at?: string; failure_category?: string | null; retry_count?: number; rate_limit_snapshot?: unknown, tool_name?: string } = {}) {
    const { error } = await this.supabase
      .from('ai_reasoning_logs')
      .insert({
        tenant_id: this.tenantId,
        consultation_id: consultationId,
        step_order: stepOrder,
        step_type: type,
        step_status: payload.status || 'completed',
        tool_name: payload.tool_name || 'internal',
        input_json: payload.input || null,
        output_json: payload.output || null,
        latency_ms: payload.latency || 0,
        success: payload.success ?? true,
        error_code: payload.error_code || null,
        error_message: payload.error_message || null,
        started_at: payload.started_at || new Date().toISOString(),
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

    if (error) throw new ProviderInternalError(`Failed to log reasoning step ${stepOrder} (${type}): ${error.message}`);
  }
}
