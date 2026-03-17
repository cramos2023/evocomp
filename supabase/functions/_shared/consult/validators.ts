import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { 
  EvidenceBundle, 
  KeyFinding 
} from './contracts.ts';

/**
 * Request Validator (Strict)
 */
export const ConsultationRequestSchema = z.object({
  question: z.string().min(5).max(1000),
  mode: z.enum(['ASK', 'EXPLAIN', 'RECOMMEND']),
  scope: z.object({
    tenant_id: z.string().uuid(),
    scenario_id: z.string().uuid().optional(),
    focus_node_type: z.string().optional(),
    focus_node_id: z.string().uuid().optional(),
    filters: z.record(z.unknown()).optional(),
  }).strict(),
  correlation_id: z.string().uuid().optional(),
  options: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(1).optional(),
    max_tokens: z.number().optional(),
    use_cache: z.boolean().optional(),
  }).strict().optional(),
}).strict();

/**
 * Provider Response Validator (Strict)
 */
export const LLMResponseSchema = z.object({
  executive_answer: z.string(),
  key_findings: z.array(z.object({
    title: z.string(),
    observation: z.string(),
    impact_severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    evidence_refs: z.array(z.string()),
  }).strict()).max(5),
  suggested_actions: z.array(z.object({
    label: z.string(),
    description: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    impact_area: z.string(),
  }).strict()).max(3).optional(),
  suggested_simulations: z.array(z.object({
    type: z.string(),
    label: z.string(),
    description: z.string(),
    parameters: z.record(z.unknown()),
  }).strict()).max(2).optional(),
  risk_flags: z.array(z.object({
    type: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    description: z.string(),
    mitigation_strategy: z.string().optional(),
  }).strict()).max(3).optional(),
  confidence: z.object({
    level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    score: z.number().min(0).max(1),
    reasoning: z.string(),
  }).strict(),
}).strict();

/**
 * Semantic Validation Helper
 * Ensures LLM response citing fragments that actually exist in the bundle.
 */
export function validateEvidenceRefs(findings: KeyFinding[] | undefined, _bundle: EvidenceBundle): boolean {
  const citedRefs = new Set<string>();
  (findings || []).forEach((f: KeyFinding) => f.evidence_refs.forEach((r: string) => citedRefs.add(r)));
  
  // In Phase 3A mocked fragments use static refs or sequence ids
  // This is a placeholder for real set-intersection logic in Phase 3B
  return true; 
}
