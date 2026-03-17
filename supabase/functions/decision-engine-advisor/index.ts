// @ts-nocheck: Deno-based Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createSupabaseAdmin, getAuthedUserId, getTenantIdForUser } from "../_shared/auth.ts"

const ENGINE_VERSION = "v1.0-7dim-structural"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

interface AdvisoryRequest {
  action?: 'run' | 'ping'
  versionId: string
}

interface DimensionScores {
  S: number  // Role Scope
  D: number  // Decision Authority
  L: number  // Leadership Load
  B: number  // Business Impact
  G: number  // Geographic Breadth
  P: number  // Problem-Solving Complexity
  E: number  // Experience Depth
}

interface AdvisoryResult {
  job_size_score: number
  classification_level: string
  band_reference: string
  confidence_score: number
  confidence_label: string
  dimensions: DimensionScores
  adjustments: { leadership: number; specialist: number; coherence: number }
  warnings: string[]
}

// ════════════════════════════════════════════════════════════════════
// DIMENSION WEIGHTS (approved formula)
// Base = 0.22S + 0.18D + 0.18L + 0.17B + 0.10G + 0.10P + 0.05E
// ════════════════════════════════════════════════════════════════════
const WEIGHTS = { S: 0.22, D: 0.18, L: 0.18, B: 0.17, G: 0.10, P: 0.10, E: 0.05 }

// ════════════════════════════════════════════════════════════════════
// LEVEL MAPPING (tenant-configurable in Phase 2)
// ════════════════════════════════════════════════════════════════════
const LEVEL_MAP: Array<{ max: number; level: string; archetype: string }> = [
  { max: 15,  level: 'L1', archetype: 'Entry Professional' },
  { max: 30,  level: 'L2', archetype: 'Experienced Professional' },
  { max: 45,  level: 'L3', archetype: 'Senior Professional / Specialist' },
  { max: 60,  level: 'L4', archetype: 'Manager / Lead' },
  { max: 75,  level: 'L5', archetype: 'Senior Manager / Senior Specialist' },
  { max: 88,  level: 'L6', archetype: 'Director / Expert' },
  { max: 100, level: 'L7', archetype: 'Executive / VP' },
]

// ════════════════════════════════════════════════════════════════════
// ROLE SCOPE INFERENCE (S)
// ════════════════════════════════════════════════════════════════════
function inferRoleScope(careerLevel: string): number {
  const cl = (careerLevel || '').toUpperCase().trim()
  if (['SC1', 'SC2'].includes(cl)) return 1
  if (['SC3', 'P1'].includes(cl)) return 1.5
  if (cl === 'P2') return 2
  if (cl === 'P3') return 2.5
  if (['P4', 'M2.1', 'M2.2'].includes(cl)) return 3
  if (['M2.3', 'M2.4'].includes(cl)) return 3.5
  if (cl === 'M2.5') return 4
  if (cl === 'M1.4') return 5
  // Fallback: try to parse numeric levels
  if (cl.startsWith('SC')) return 1
  if (cl.startsWith('P')) return 2
  if (cl.startsWith('M2')) return 3.5
  if (cl.startsWith('M1')) return 5
  return 2 // safe default
}

// ════════════════════════════════════════════════════════════════════
// DECISION AUTHORITY INFERENCE (D)
// Multi-signal: career_level base + career_function modifier + resp signal
// ════════════════════════════════════════════════════════════════════
const FUNCTION_MODIFIERS: Record<string, number> = {
  'general_management': 0.5,
  'finance': 0.5,
  'operations': 0.5,
  'sales': 0.5,
  'customer_services': 0,
  'hr': 0,
  'it': 0,
  'marketing': 0,
}

function inferDecisionAuthority(
  careerLevel: string,
  careerFunction: string,
  essentialResponsibilities: Array<{ proficiency_level?: string }>,
): number {
  const cl = (careerLevel || '').toUpperCase().trim()
  
  // Base from level
  let base = 2
  if (['SC1', 'SC2'].includes(cl)) base = 1.25
  else if (['SC3', 'P1'].includes(cl)) base = 1.5
  else if (cl === 'P2') base = 2
  else if (['P3', 'P4'].includes(cl)) base = 2.5
  else if (['M2.1', 'M2.2', 'M2.3'].includes(cl)) base = 3
  else if (['M2.4', 'M2.5'].includes(cl)) base = 4
  else if (cl === 'M1.4') base = 5
  else if (cl.startsWith('SC')) base = 1
  else if (cl.startsWith('P')) base = 2
  else if (cl.startsWith('M2')) base = 3
  else if (cl.startsWith('M1')) base = 5

  // Function modifier
  const fn = (careerFunction || '').toLowerCase().replace(/\s+/g, '_').trim()
  const funcMod = FUNCTION_MODIFIERS[fn] ?? 0

  // Responsibility proficiency signal
  let respSignal = 0
  if (essentialResponsibilities.length >= 3) {
    const advancedCount = essentialResponsibilities.filter(
      r => r.proficiency_level === 'expert' || r.proficiency_level === 'advanced'
    ).length
    if (advancedCount / essentialResponsibilities.length >= 0.5) {
      respSignal = 0.5
    }
  }

  return Math.min(5, Math.max(1, base + funcMod + respSignal))
}

// ════════════════════════════════════════════════════════════════════
// LEADERSHIP LOAD INFERENCE (L)
// ════════════════════════════════════════════════════════════════════
function inferLeadershipLoad(teamSize: string | null): number {
  if (!teamSize) return 1
  const ts = teamSize.toLowerCase().trim()
  if (['none', 'individual', '0'].includes(ts)) return 1
  if (ts === 'small' || ts === '1-5') return 2
  if (ts === 'medium' || ts === '6-15') return 3
  if (ts === 'large' || ts === '16-30') return 4
  if (ts === 'very_large' || ts === '30+' || ts === '31+') return 5
  
  // Try parse as number
  const n = parseInt(ts)
  if (!isNaN(n)) {
    if (n === 0) return 1
    if (n <= 5) return 2
    if (n <= 15) return 3
    if (n <= 30) return 4
    return 5
  }
  return 1 // default
}

// ════════════════════════════════════════════════════════════════════
// BUSINESS IMPACT INFERENCE (B)
// ════════════════════════════════════════════════════════════════════
const HIGH_IMPACT_FUNCTIONS = ['sales', 'operations', 'finance', 'general_management']

function inferBusinessImpact(careerLevel: string, careerFunction: string): number {
  const cl = (careerLevel || '').toUpperCase().trim()
  const fn = (careerFunction || '').toLowerCase().replace(/\s+/g, '_').trim()
  
  let base = 2
  if (['SC1', 'SC2'].includes(cl)) base = 1
  else if (['SC3', 'P1', 'P2'].includes(cl)) base = 2
  else if (['P3', 'P4', 'M2.1', 'M2.2', 'M2.3'].includes(cl)) base = 3
  else if (['M2.4', 'M2.5'].includes(cl)) base = 4
  else if (cl === 'M1.4') base = 5
  else if (cl.startsWith('SC')) base = 1
  else if (cl.startsWith('P')) base = 2
  else if (cl.startsWith('M2')) base = 3.5
  else if (cl.startsWith('M1')) base = 5

  // Uplift for high-impact functions at M2.4+ level
  if (HIGH_IMPACT_FUNCTIONS.includes(fn) && base >= 3.5) {
    base = Math.min(5, base + 0.5)
  }

  return base
}

// ════════════════════════════════════════════════════════════════════
// GEOGRAPHIC BREADTH INFERENCE (G)
// ════════════════════════════════════════════════════════════════════
function inferGeographicBreadth(geoResp: string | null): { value: number; defaulted: boolean } {
  if (!geoResp) return { value: 2, defaulted: true }
  const g = geoResp.toLowerCase().trim()
  const map: Record<string, number> = {
    'local': 1, 'national': 2, 'regional': 3,
    'multi_region': 4, 'multi-region': 4, 'global': 5,
  }
  return { value: map[g] ?? 2, defaulted: !(g in map) }
}

// ════════════════════════════════════════════════════════════════════
// PROBLEM-SOLVING COMPLEXITY INFERENCE (P)
// ════════════════════════════════════════════════════════════════════
function inferComplexity(
  essentialResponsibilities: Array<{ proficiency_level?: string }>
): { value: number; defaulted: boolean } {
  if (essentialResponsibilities.length < 3) return { value: 2, defaulted: true }
  
  const profMap: Record<string, number> = {
    'beginner': 1, 'intermediate': 2, 'advanced': 3, 'expert': 4.5,
  }
  
  const values = essentialResponsibilities
    .map(r => profMap[(r.proficiency_level || '').toLowerCase()] ?? 2)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return { value: Math.round(avg * 10) / 10, defaulted: false }
}

// ════════════════════════════════════════════════════════════════════
// EXPERIENCE DEPTH INFERENCE (E)
// ════════════════════════════════════════════════════════════════════
function inferExperienceDepth(expYears: string | null): { value: number; defaulted: boolean } {
  if (!expYears) return { value: 2, defaulted: true }
  const e = expYears.toLowerCase().trim()
  if (['0-2', '0–2', '0-1', '1-2'].includes(e)) return { value: 1, defaulted: false }
  if (['2-4', '2–4', '3-4', '3-5', '2-5'].includes(e)) return { value: 2, defaulted: false }
  if (['5-8', '5–8', '5-7', '6-8'].includes(e)) return { value: 3, defaulted: false }
  if (['8-12', '8–12', '9-12', '10-12'].includes(e)) return { value: 4, defaulted: false }
  if (['12+', '12–15', '15+', '20+'].includes(e)) return { value: 5, defaulted: false }
  
  // Try parse
  const n = parseInt(e)
  if (!isNaN(n)) {
    if (n <= 2) return { value: 1, defaulted: false }
    if (n <= 4) return { value: 2, defaulted: false }
    if (n <= 8) return { value: 3, defaulted: false }
    if (n <= 12) return { value: 4, defaulted: false }
    return { value: 5, defaulted: false }
  }
  return { value: 2, defaulted: true }
}

// ════════════════════════════════════════════════════════════════════
// SCORING ENGINE
// ════════════════════════════════════════════════════════════════════
function calculateAdvisory(dims: DimensionScores): AdvisoryResult {
  const warnings: string[] = []

  // 1. Base Weighted Score (1.0 – 5.0)
  const baseWeighted =
    WEIGHTS.S * dims.S +
    WEIGHTS.D * dims.D +
    WEIGHTS.L * dims.L +
    WEIGHTS.B * dims.B +
    WEIGHTS.G * dims.G +
    WEIGHTS.P * dims.P +
    WEIGHTS.E * dims.E

  // 2. Normalize to 0–100
  const normalized = ((baseWeighted - 1) / 4) * 100

  // 3. Leadership Adjustment
  let leadershipAdj = 0
  if (dims.L >= 5) leadershipAdj = 8
  else if (dims.L >= 4) leadershipAdj = 6
  else if (dims.L >= 3) leadershipAdj = 3

  // 4. Specialist Uplift
  let specialistUplift = 0
  if (dims.L <= 2 && dims.P >= 4 && dims.B >= 3 && dims.S >= 3) {
    specialistUplift = 4
  }

  // 5. Coherence Penalty
  let coherencePenalty = 0
  if (dims.G >= 4 && dims.B <= 2) {
    coherencePenalty += 5
    warnings.push('INCOHERENT_GEO_IMPACT')
  }
  if (dims.L >= 4 && dims.S <= 2) {
    coherencePenalty += 5
    warnings.push('INCOHERENT_LEADERSHIP_SCOPE')
  }
  if (dims.D >= 4 && dims.S <= 2) {
    coherencePenalty += 4
    warnings.push('INCOHERENT_AUTHORITY_SCOPE')
  }

  // 6. Final Score
  const totalAdj = leadershipAdj + specialistUplift - coherencePenalty
  let finalScore = normalized + totalAdj
  finalScore = Math.max(0, Math.min(100, Math.round(finalScore * 100) / 100))

  // 7. Map to level
  const levelEntry = LEVEL_MAP.find(l => finalScore <= l.max)
    || LEVEL_MAP[LEVEL_MAP.length - 1]

  return {
    job_size_score: finalScore,
    classification_level: levelEntry.level,
    band_reference: levelEntry.archetype,
    confidence_score: 0, // filled externally
    confidence_label: '',
    dimensions: dims,
    scoring: {
      base_weighted: baseWeighted,
      normalization: normalized,
      adjustments: totalAdj,
      final_score: finalScore
    },
    adjustments_details: {
      leadership: leadershipAdj,
      specialist: specialistUplift,
      coherence: coherencePenalty,
    },
    warnings,
  }
}

// ════════════════════════════════════════════════════════════════════
// CONFIDENCE MODEL (Phase 1.2 Hardening)
// confidence = base_confidence - missing_input_penalty - inference_penalty + structural_consistency_bonus
// ════════════════════════════════════════════════════════════════════
function calculateConfidence(
  version: Record<string, unknown>,
  profile: Record<string, unknown> | undefined,
  geoDefaulted: boolean,
  expDefaulted: boolean,
  complexityDefaulted: boolean,
  coherenceWarningsCount: number,
  hasPlaceholderSupervisor: boolean
): { score: number; label: string } {
  // If career_level missing → BLOCKED
  if (!version.career_level) {
    return { score: 0, label: 'BLOCKED' }
  }

  // Base confidence based on pattern familiarity and reliable mapping
  const cl = ((version.career_level as string) || '').toUpperCase().trim();
  let base_confidence = 85; 
  if (['M2.4', 'M2.5', 'P3', 'P4'].includes(cl)) base_confidence = 95;
  else if (['M2.3', 'P2'].includes(cl)) base_confidence = 90;
  else if (['SC2', 'SC3', 'P1'].includes(cl)) base_confidence = 85;
  else if (cl === 'M1.4') base_confidence = 80;

  // Missing Input Penalty
  let missing_input_penalty = 0;
  if (!profile?.managerial_scope) missing_input_penalty += 10;
  if (!profile?.geographic_scope) missing_input_penalty += 10;
  if (!profile?.team_size_range) missing_input_penalty += 10;
  if (hasPlaceholderSupervisor) missing_input_penalty += 15;

  // Inference Penalty
  let inference_penalty = 0;
  if (geoDefaulted) inference_penalty += 5;
  if (complexityDefaulted) inference_penalty += 15;
  if (expDefaulted) inference_penalty += 5;

  // Structural Consistency Bonus
  // Deduct for incoherence, add for perfect coherence
  let structural_consistency_bonus = 0;
  if (coherenceWarningsCount === 0) {
    structural_consistency_bonus += 10;
  } else {
    structural_consistency_bonus -= (coherenceWarningsCount * 10);
  }

  let final_score = base_confidence - missing_input_penalty - inference_penalty + structural_consistency_bonus;
  final_score = Math.max(0, Math.min(100, final_score));
  
  const rounded = Math.round(final_score * 100) / 100;

  let label = 'LOW';
  if (rounded >= 70) label = 'HIGH';
  else if (rounded >= 50) label = 'MEDIUM';

  return { score: rounded, label };
}

// ════════════════════════════════════════════════════════════════════
// SERVE ENTRY POINT
// ════════════════════════════════════════════════════════════════════
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log(`[decision-engine-advisor] ${ENGINE_VERSION} Start`)
  let currentStep = 'init'

  try {
    currentStep = 'auth_validation'
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authHeader) throw new Error('Authorization header missing')

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const adminClient = createSupabaseAdmin()
    const userId = await getAuthedUserId(token)
    currentStep = 'resolve_tenant'
    const tenantId = await getTenantIdForUser(adminClient, userId)

    const rawBody = await req.text()
    const body: AdvisoryRequest = rawBody ? JSON.parse(rawBody) : {}

    if (body.action === 'ping') {
      return new Response(JSON.stringify({ pong: ENGINE_VERSION }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!body.versionId) throw new Error('versionId is required')

    console.log(`[decision-engine-advisor] User=${userId}, Tenant=${tenantId}, Version=${body.versionId}`)

    currentStep = 'fetch_version'
    // ── 1. Fetch the JD version with responsibilities ──
    const { data: version, error: vErr } = await adminClient
      .from('jd_profile_versions')
      .select(`
        *,
        profile:jd_profiles!inner(tenant_id, managerial_scope, team_size_range, geographic_scope, budget_responsibility),
        responsibilities:jd_profile_responsibilities(*)
      `)
      .eq('id', body.versionId)
      .single()

    if (vErr) throw new Error(`Version fetch failed: ${vErr.message}`)
    if (!version) throw new Error(`Version ${body.versionId} not found`)

    currentStep = 'tenant_isolation_check'
    // Tenant isolation check
    if (version.profile?.tenant_id !== tenantId) {
      throw new Error('Forbidden: version does not belong to your tenant')
    }

    // ── 2. Check required field ──
    if (!version.career_level) {
      // Return BLOCKED advisory
      const blockedResult = {
        status: 'BLOCKED',
        reason: 'career_level is required to run the advisory engine',
        engine_version: ENGINE_VERSION,
      }
      return new Response(JSON.stringify(blockedResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    currentStep = 'infer_dimensions'
    // ── 3. Infer all 7 dimensions ──
    const resps = (version.responsibilities || []) as Array<Record<string, unknown>>
    const essentialResps = resps.filter((r: Record<string, unknown>) => r.is_essential !== false)

    const S = inferRoleScope(version.career_level)
    const D = inferDecisionAuthority(version.career_level, version.career_function || '', essentialResps as Array<{ proficiency_level?: string }>)
    const L = inferLeadershipLoad(version.team_size)
    const B = inferBusinessImpact(version.career_level, version.career_function || '')
    const geo = inferGeographicBreadth(version.geographic_responsibility)
    const complexity = inferComplexity(essentialResps as Array<{ proficiency_level?: string }>)
    const experience = inferExperienceDepth(version.experience_years)

    const dims: DimensionScores = {
      S, D, L, B,
      G: geo.value,
      P: complexity.value,
      E: experience.value,
    }

    currentStep = 'calculate_advisory'
    // ── 4. Calculate advisory ──
    const result = calculateAdvisory(dims)

    // Add defaulted warnings
    if (geo.defaulted) result.warnings.push('GEO_DEFAULTED')
    if (complexity.defaulted) result.warnings.push('COMPLEXITY_DEFAULTED')
    if (experience.defaulted) result.warnings.push('EXPERIENCE_DEFAULTED')

    const coherenceWarningsCount = result.warnings.filter(w => w.startsWith('INCOHERENT')).length
    const hasPlaceholderSupervisor = !!body.hasPlaceholderSupervisor

    currentStep = 'calculate_confidence'
    // ── 5. Calculate confidence (Phase 1.2 Hardening) ──
    const confidence = calculateConfidence(
      version,
      version.profile,
      geo.defaulted, experience.defaulted, complexity.defaulted,
      coherenceWarningsCount,
      hasPlaceholderSupervisor
    )
    result.confidence_score = confidence.score
    result.confidence_label = confidence.label

    currentStep = 'persist_advisory'
    // ── 6. Write advisory fields to jd_profile_versions ──
    const { error: updateErr } = await adminClient
      .from('jd_profile_versions')
      .update({
        advisory_classification_level: result.classification_level,
        advisory_band_reference: result.band_reference,
        advisory_job_size_score: result.job_size_score,
        advisory_confidence_score: result.confidence_score,
        advisory_confidence_label: result.confidence_label,
        advisory_run_at: new Date().toISOString(),
        advisory_engine_version: ENGINE_VERSION,
      })
      .eq('id', body.versionId)

    if (updateErr) {
      throw new Error(`Failed to update advisory fields: ${updateErr.message}`)
    }

    currentStep = 'write_audit_log'
    // ── 7. Write audit log ──
    const inputSnapshot = {
      career_level: version.career_level,
      career_function: version.career_function,
      job_family: version.job_family,
      team_size: version.team_size,
      geographic_responsibility: version.geographic_responsibility,
      experience_years: version.experience_years,
      essential_responsibilities_count: essentialResps.length,
    }

    const { error: logErr } = await adminClient
      .from('de_advisory_log')
      .insert({
        tenant_id: tenantId,
        entity_type: 'jd_version',
        entity_id: body.versionId,
        engine_version: ENGINE_VERSION,
        input_snapshot: inputSnapshot,
        output_json: {
          job_size_score: result.job_size_score,
          classification_level: result.classification_level,
          band_reference: result.band_reference,
          confidence_score: result.confidence_score,
          confidence_label: result.confidence_label,
          dimensions: result.dimensions,
          scoring: result.scoring,
          adjustments: result.adjustments_details,
          warnings: result.warnings,
        },
        created_by: userId,
      })

    if (logErr) {
      throw new Error(`Failed to write audit log: ${logErr.message}`)
    }

    currentStep = 'complete'
    // ── 8. Return result ──
    console.log(`[decision-engine-advisor] Score=${result.job_size_score}, Level=${result.classification_level}, Confidence=${result.confidence_label}`)

    return new Response(JSON.stringify({
      success: true,
      engine_version: ENGINE_VERSION,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const error = err as Error
    console.error(`[decision-engine-advisor] ERROR at step ${currentStep}: ${error.message}`)
    return new Response(JSON.stringify({
      error: error.message,
      step: currentStep,
      details: "A runtime exception occurred in the Edge Function.",
      engine_version: ENGINE_VERSION,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
