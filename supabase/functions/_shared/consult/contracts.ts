/**
 * AI Consultation Runtime Contracts
 * Defines the strict JSON boundaries for EvoComp AI Reasoning layer.
 */

export type InteractionMode = 'ASK' | 'EXPLAIN' | 'RECOMMEND';

export type ConsultationStatus = 
  | 'RECEIVED'
  | 'VALIDATING'
  | 'PLANNING'
  | 'RUNNING_TOOLS'
  | 'ASSEMBLING_EVIDENCE'
  | 'CALLING_PROVIDER'
  | 'VALIDATING_RESPONSE'
  | 'PERSISTING'
  | 'COMPLETED'
  | 'FAILED';

export interface ConsultationScope {
  tenant_id: string;
  scenario_id?: string;
  focus_node_type?: string;
  focus_node_id?: string;
  filters?: Record<string, unknown>;
}

export interface ConsultationRequest {
  question: string;
  mode: InteractionMode;
  scope: ConsultationScope;
  correlation_id?: string;
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    use_cache?: boolean;
  };
}

export interface RateLimitSnapshot {
  requests_limit: string | null;
  requests_remaining: string | null;
  requests_reset: string | null;
  tokens_limit: string | null;
  tokens_remaining: string | null;
  tokens_reset: string | null;
}

export type ProviderFailureCategory = 
  | 'RATE_LIMIT' 
  | 'TIMEOUT' 
  | 'OVERLOAD' 
  | 'BUDGET_EXCEEDED' 
  | 'FEATURE_DISABLED' 
  | 'PROVIDER_MODE_DISABLED'
  | 'PAYLOAD_TOO_LARGE' 
  | 'CONTRACT_VIOLATION'
  | 'PROVIDER_INTERNAL_ERROR';

export interface ConsultationResponse {
  consultation_id: string;
  status: ConsultationStatus;
  executive_answer?: string;
  key_findings?: KeyFinding[];
  suggested_actions?: SuggestedAction[];
  suggested_simulations?: SuggestedSimulation[];
  risk_flags?: RiskFlag[];
  confidence?: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    reasoning: string;
  };
  evidence_bundle_id?: string;
  bundle_hash?: string;
  failure_category?: ProviderFailureCategory;
  metadata?: {
    latency_ms: number;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    provider: {
      name: string;
      model: string;
      request_id: string;
      latency_ms: number;
      execution_mode: 'real' | 'mock' | 'fallback';
      was_fallback: boolean;
      fallback_reason?: string;
    };
    bundle_id: string;
    tools_executed: string[];
    retry_count?: number;
    rate_limit_snapshot?: RateLimitSnapshot;
    budget_advisory?: boolean;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    message: string;
    context?: unknown;
  };
}

export interface ProviderResponse {
  answer: unknown;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  provider: {
    name: string;
    model: string;
    request_id: string;
    latency_ms: number;
    execution_mode: 'real' | 'mock' | 'fallback';
    was_fallback: boolean;
    fallback_reason?: string;
  };
  estimated_cost: number;
  retry_count?: number;
  rate_limit_snapshot?: RateLimitSnapshot;
}

export interface KeyFinding {
  title: string;
  observation: string;
  impact_severity: 'LOW' | 'MEDIUM' | 'HIGH';
  evidence_refs: string[];
}

export interface SuggestedAction {
  label: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  impact_area: string;
}

export interface SuggestedSimulation {
  type: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface RiskFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  mitigation_strategy?: string;
}

export interface ToolResult {
  tool_name: string;
  success: boolean;
  payload: unknown;
  source_id?: string;
  source_type?: string;
  source_event_id?: string | null; // Optional decision event linkage
  latency_ms: number;
  error?: string;
}

export interface EvidenceFragment {
  id: string;
  type: string;
  content: unknown;
  source_id: string;
  source_type: string;
  created_at: string;
}

export interface EvidenceBundle {
  id: string;
  hash: string;
  fragments: EvidenceFragment[];
  metadata: Record<string, unknown>;
}

export type StepType = 
  | 'planner' 
  | 'tool_request' 
  | 'tool_call' 
  | 'tool_result' 
  | 'bundle_build' 
  | 'llm_request' 
  | 'llm_response' 
  | 'response_validation' 
  | 'fallback' 
  | 'finalize' 
  | 'error';
