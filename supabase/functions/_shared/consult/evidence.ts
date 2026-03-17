import { ToolResult, EvidenceFragment, EvidenceBundle } from './contracts.ts';
import { ProviderInternalError } from './errors.ts';

/**
 * Deterministic Evidence Bundle Assembler for Phase 3A Remediation.
 */
export async function assembleEvidenceBundle(
  supabase: any,
  tenantId: string,
  consultationId: string,
  toolResults: ToolResult[]
): Promise<EvidenceBundle> {
  const fragments: EvidenceFragment[] = toolResults.map((res) => ({
    id: crypto.randomUUID(),
    type: res.source_type || 'TOOL_OUTPUT',
    content: res.payload,
    source_id: res.source_id || 'manual',
    source_type: res.source_type || 'TOOL',
    created_at: new Date().toISOString(),
  }));

  // Deterministic Hash: Hash ONLY stable content and lineage references
  // Exclude random IDs and timestamps
  const stableContent = toolResults.map(res => ({
    tool: res.tool_name,
    payload: res.payload, 
    source_type: res.source_type,
    source_id: res.source_id
  })).sort((a, b) => a.tool.localeCompare(b.tool) || a.source_id!.localeCompare(b.source_id!));

  const bundleHash = await computeHash(JSON.stringify(stableContent));

  // 1. Persist Evidence Bundle (with consultation_id linkage)
  const { data: bundle, error: bundleError } = await supabase
    .from('evidence_bundles')
    .insert({
      tenant_id: tenantId,
      consultation_id: consultationId,
      bundle_hash: bundleHash,
      bundle_type: 'CONSULTATION',
      payload_json: { fragments },
      created_at: new Date().toISOString(),
      stale_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h default
    })
    .select()
    .single();

  if (bundleError) {
    throw new ProviderInternalError(`Failed to persist evidence bundle: ${bundleError.message}`);
  }

  // 2. Persist Source References (including source_event_id for audit lineage)
  const sourceInserts = toolResults.map((res) => ({
    tenant_id: tenantId,
    bundle_id: bundle.id,
    source_type: res.source_type,
    source_id: res.source_id,
    source_event_id: res.source_event_id || null, // Populated whenever available (e.g. from ToolResult)
    metadata_json: { tool: res.tool_name },
  }));

  const { error: sourceError } = await supabase
    .from('evidence_bundle_sources')
    .insert(sourceInserts);

  if (sourceError) {
    throw new ProviderInternalError(`Failed to persist evidence bundle sources: ${sourceError.message}`);
  }

  return {
    id: bundle.id,
    hash: bundleHash,
    fragments,
    metadata: { consultation_id: consultationId },
  };
}

async function computeHash(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
