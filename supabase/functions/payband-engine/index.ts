// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * EVOCOMP PHASE 2: PAY BAND BUILDER ENGINE
 * Deterministic math algorithm and policy evaluator.
 */

async function generateHash(data: any): Promise<string> {
  const msgUint8 = new TextEncoder().encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function roundValue(value: number, meth: string, dec: number): number {
  if (!value) return 0;
  const multiplier = Math.pow(10, dec);
  if (meth === 'HALF_UP') return Math.round(value * multiplier) / multiplier;
  if (meth === 'ROUND_UP') return Math.ceil(value * multiplier) / multiplier;
  if (meth === 'ROUND_DOWN') return Math.floor(value * multiplier) / multiplier;
  return Math.round(value * multiplier) / multiplier;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
       console.error('Auth Error:', userError);
       throw new Error('Unauthorized: ' + (userError?.message || 'No user found'));
    }

    const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) throw new Error('Tenant missing')
    const tenantId = profile.tenant_id

    const body = await req.json()
    const { action, payload } = body

    if (action === 'validate_weights') {
      const { weightsByGrade, globalWeights } = payload
      const ALLOWED_PROVIDERS = ['MERCER', 'WTW', 'THIRD']
      const errors: string[] = []

      // Validate global weights
      if (globalWeights && typeof globalWeights === 'object') {
         let sum = 0
         for (const [provider, value] of Object.entries(globalWeights)) {
           if (!ALLOWED_PROVIDERS.includes(provider)) { errors.push(`Global: Invalid provider ${provider}`); continue; }
           const num = Number(value)
           if (!Number.isFinite(num) || num < 0) { errors.push(`Global: Invalid weight for ${provider}`); continue; }
           sum += num
         }
         if (Math.abs(sum - 1.0) > 0.0001) errors.push(`Global: Weights sum to ${sum}, must equal exactly 1.0`)
      }

      // Validate grade specific weights
      if (weightsByGrade && typeof weightsByGrade === 'object') {
        for (const [grade, weights] of Object.entries(weightsByGrade)) {
          let sum = 0
          for (const [provider, value] of Object.entries(weights as Record<string, number>)) {
            if (!ALLOWED_PROVIDERS.includes(provider)) { errors.push(`Grade ${grade}: Invalid provider ${provider}`); continue; }
            const num = Number(value)
            if (!Number.isFinite(num) || num < 0) { errors.push(`Grade ${grade}: Invalid weight for ${provider}`); continue; }
            sum += num
          }
          if (Math.abs(sum - 1.0) > 0.0001) errors.push(`Grade ${grade}: Weights sum to ${sum}, must equal exactly 1.0`)
        }
      }

      if (!globalWeights && !weightsByGrade) {
        errors.push("Must provide either globalWeights or weightsByGrade")
      }

      return new Response(JSON.stringify({ isValid: errors.length === 0, errors }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'validate_market_import') {
      const { rows, provider, pricing_scope, source_filename, uploaded_by } = payload
      let valid = 0, invalid = 0
      const errors: string[] = []
      const ALLOWED_PROVIDERS = ['MERCER', 'WTW', 'THIRD']

      if (!provider || !ALLOWED_PROVIDERS.includes(provider.toUpperCase())) {
         throw new Error('Invalid or missing import provider')
      }

      rows.forEach((r: any, i: number) => {
        if (!r.provider || r.provider.toUpperCase() !== provider.toUpperCase()) { invalid++; errors.push(`Row ${i+1}: Provider mismatch ${r.provider}`) }
        else if (!r.country_code || r.country_code.length !== 2) { invalid++; errors.push(`Row ${i+1}: Invalid ISO country_code`) }
        else if (!r.currency || r.currency.length !== 3) { invalid++; errors.push(`Row ${i+1}: Invalid ISO currency`) }
        else if (!r.vendor_level_code || r.vendor_level_code.toString().trim() === '') { invalid++; errors.push(`Row ${i+1}: Missing vendor_level_code`) }
        else if (!r.market_effective_date) { invalid++; errors.push(`Row ${i+1}: Missing market_effective_date`) }
        else { valid++ }
      })

      const status = invalid > 0 ? (valid === 0 ? 'FAILED' : 'PARTIAL_SUCCESS') : 'COMPLETED'
      
      const { data: importHeader, error: headErr } = await supabase.from('market_data_imports').insert({
         tenant_id: tenantId,
         provider: provider.toUpperCase(),
         pricing_scope: pricing_scope || 'General',
         uploaded_by: uploaded_by || user.id,
         source_filename: source_filename || 'Unknown',
         row_count: rows.length,
         status: status,
         error_report: invalid > 0 ? { invalid_count: invalid, errors: errors.slice(0, 50) } : null
      }).select().single()

      if (headErr) throw new Error('Failed to create import header: ' + headErr.message)

      if (valid > 0) {
        const validRows = rows.filter((r: any) => 
           r.provider?.toUpperCase() === provider.toUpperCase() && 
           r.country_code?.length === 2 && 
           r.market_effective_date
        ).map((r: any) => ({
           tenant_id: tenantId,
           import_id: importHeader.id,
           provider: provider.toUpperCase(),
           country_code: r.country_code.toUpperCase(),
           currency: r.currency.toUpperCase(),
           vendor_level_code: r.vendor_level_code.toString().trim(),
           market_effective_date: r.market_effective_date,
           org_count: Number(r.org_count) || null,
           obs_count: Number(r.obs_count) || null,
           base_salary_p50: Number(r.base_salary_p50) || null,
           target_cash_p50: Number(r.target_cash_p50) || null,
           total_guaranteed_p50: Number(r.total_guaranteed_p50) || null,
           vendor_job_code: r.vendor_job_code,
           vendor_job_title: r.vendor_job_title,
           industry_cut: r.industry_cut,
           size_cut: r.size_cut,
           geo_cut: r.geo_cut,
           notes: r.notes
        }))

        const { error: insErr } = await supabase.from('market_pay_data').insert(validRows)
        if (insErr) {
           await supabase.from('market_data_imports').update({ status: 'FAILED', error_report: { error: insErr.message } }).eq('id', importHeader.id)
           throw new Error('Failed inserting line items: ' + insErr.message)
        }
      }

      return new Response(JSON.stringify({ 
         success: true, 
         import_id: importHeader.id, 
         valid, 
         invalid, 
         errors: errors.slice(0, 50),
         status
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'resolve_active_paybands') {
      const { country_code, basis_type, as_of_date } = payload
      if (!country_code || !basis_type || !as_of_date) throw new Error('Missing exact resolution parameters')

      // Strategy: Primary first, fallback to most recently published if no primary exists
      const { data: primaryData, error: primaryError } = await supabase
        .from('pay_band_versions')
        .select(`id, version_number, published_at, is_primary, pay_bands ( id, grade, min_salary, midpoint, max_salary, spread )`)
        .eq('tenant_id', tenantId).eq('country_code', country_code).eq('basis_type', basis_type)
        .eq('status', 'PUBLISHED').eq('is_primary', true)
        .lte('structure_effective_start', as_of_date).gte('structure_effective_end', as_of_date)
        .maybeSingle()

      if (primaryError) throw primaryError;
      
      if (primaryData) {
         return new Response(JSON.stringify({ active_version: primaryData }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Fallback
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('pay_band_versions')
        .select(`id, version_number, published_at, is_primary, pay_bands ( id, grade, min_salary, midpoint, max_salary, spread )`)
        .eq('tenant_id', tenantId).eq('country_code', country_code).eq('basis_type', basis_type)
        .eq('status', 'PUBLISHED')
        .lte('structure_effective_start', as_of_date).gte('structure_effective_end', as_of_date)
        .order('published_at', { ascending: false }).order('version_number', { ascending: false }).order('id', { ascending: false })
        .limit(1).maybeSingle()
        
      if (fallbackError) throw fallbackError;
      if (!fallbackData) return new Response(JSON.stringify({ active_version: null, explanation: 'No active published version found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      return new Response(JSON.stringify({ active_version: fallbackData }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'publish_version') {
      const { run_id } = payload
      const { data: run, error: runError } = await supabase.from('payband_build_runs').select('*, scenario:payband_build_scenarios(*)').eq('id', run_id).eq('tenant_id', tenantId).single()
      if (runError) throw new Error('Failed to find run')
      
      const scenario = run.scenario;
      if (!scenario) throw new Error('Missing attached scenario');

      // 1. Get next version number
      const { data: maxVers } = await supabase.from('pay_band_versions')
        .select('version_number').eq('tenant_id', tenantId).eq('country_code', scenario.country_code).eq('basis_type', scenario.basis_type)
        .order('version_number', { ascending: false }).limit(1).single();
      const currentHighestVersion = maxVers?.version_number || 0;
      const nextVersion = currentHighestVersion + 1;

      // 2. Insert Version Header
      const { data: newVersion, error: vErr } = await supabase.from('pay_band_versions').insert({
        tenant_id: tenantId,
        country_code: scenario.country_code,
        basis_type: scenario.basis_type,
        structure_effective_start: scenario.structure_effective_start,
        structure_effective_end: scenario.structure_effective_end,
        pricing_date: scenario.pricing_date,
        published_by: user.id,
        version_number: nextVersion,
        source_scenario_id: scenario.id,
        config_hash: run.config_hash,
        is_primary: false, // Defaulting to false, admin must mark explicitly if uniqueness is enforced.
        status: 'PUBLISHED'
      }).select().single();
      if (vErr) throw vErr;

      // 3. Insert specific pay bands lines
      const outputs = run.diagnostics_json?.outputs || [];
      const bandsToInsert = outputs.map((out: any) => ({
        tenant_id: tenantId,
        version_id: newVersion.id,
        grade: out.grade,
        min_salary: out.proposed_min,
        midpoint: out.proposed_mid,
        max_salary: out.proposed_max,
        spread: out.range_spread,
        basis_type: scenario.basis_type,
        country_code: scenario.country_code,
        currency: out.currency || 'USD',
        effective_year: parseInt(scenario.structure_effective_start.substring(0,4)),
        effective_month: parseInt(scenario.structure_effective_start.substring(5,7))
      }));

      if (bandsToInsert.length > 0) {
        const { error: bandErr } = await supabase.from('pay_bands').insert(bandsToInsert);
        if (bandErr) throw bandErr;
      }

      // Update scenario status
      await supabase.from('payband_build_scenarios').update({ status: 'PUBLISHED' }).eq('id', scenario.id);

      return new Response(JSON.stringify({ success: true, version_id: newVersion.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'run_payband_scenario') {
      const { scenario_id } = payload
      
      const { data: scenario, error: scError } = await supabase
        .from('payband_build_scenarios')
        .select(`*, aging_policies(*), guidelines_policies(*), range_design_policies(*), data_quality_policies(*)`)
        .eq('id', scenario_id).eq('tenant_id', tenantId).single()
      if (scError) throw new Error('Scenario not found')

      const { data: mappings } = await supabase.from('vendor_grade_mappings')
        .select('*').eq('tenant_id', tenantId).or(`country_code.eq.${scenario.country_code},country_code.is.null`)
      const { data: rawMarketParams } = await supabase.from('market_pay_data').select('*').eq('tenant_id', tenantId).eq('country_code', scenario.country_code)
      const { data: factors } = await supabase.from('aging_factors').select('*').eq('tenant_id', tenantId).eq('country_code', scenario.country_code)
      const { data: roundingRules } = await supabase.from('currency_rounding_rules').select('*').eq('tenant_id', tenantId)
      
      const pricingDate = new Date(scenario.pricing_date)

      // 3. Deterministic Market Data Resolution (Phase 2.2)
      // For each provider, find the single most recent Import ID that has data for this country, then only use rows from that import
      const marketData: any[] = []
      if (rawMarketParams && rawMarketParams.length > 0) {
        const importsByProvider = new Map<string, any[]>()
        
        // Group by provider
        for (const row of rawMarketParams) {
          if (!importsByProvider.has(row.provider)) importsByProvider.set(row.provider, [])
          importsByProvider.get(row.provider)!.push(row)
        }

        for (const [_provider, providerRows] of Array.from(importsByProvider.entries())) {
          // Find unique import_ids for this provider
          const imports = Array.from(new Set(providerRows.map(r => r.import_id)))
          
          if (imports.length === 1) {
            marketData.push(...providerRows)
          } else if (imports.length > 1) {
            // Need the latest import definition from headers
            const { data: header } = await supabase.from('market_data_imports')
               .select('id').in('id', imports).order('uploaded_at', { ascending: false }).limit(1).single()
               
            if (header) {
               // Only take rows from the most recent import
               const latestImportRows = providerRows.filter(r => r.import_id === header.id)
               
               // Resolve date collision deterministically: max(market_effective_date <= pricing_date) fallback to max(market_effective_date)
               const codeGroups = new Map<string, any[]>()
               for (const row of latestImportRows) {
                 if (!codeGroups.has(row.vendor_level_code)) codeGroups.set(row.vendor_level_code, [])
                 codeGroups.get(row.vendor_level_code)!.push(row)
               }

               for (const rows of Array.from(codeGroups.values())) {
                  if (rows.length === 1) {
                     marketData.push(rows[0])
                  } else {
                     let bestRow = null
                     const pastOrCurrentRows = rows.filter((r: any) => new Date(r.market_effective_date) <= pricingDate)
                     if (pastOrCurrentRows.length > 0) {
                        bestRow = pastOrCurrentRows.reduce((a: any, b: any) => new Date(a.market_effective_date) > new Date(b.market_effective_date) ? a : b)
                     } else {
                        bestRow = rows.reduce((a: any, b: any) => new Date(a.market_effective_date) > new Date(b.market_effective_date) ? a : b)
                     }
                     if (bestRow) marketData.push(bestRow)
                  }
               }
            }
          }
        }
      }

      // Extract config
      const qualityPol: any = scenario.data_quality_policies || { org_count_min: 10, obs_count_min: 100, low_sample_treatment: 'WARN_ONLY' }
      const agingPol: any = scenario.aging_policies || { method: 'COMPOUND', blend_weights: { INFLATION: 0.7, MARKET_MOVEMENT: 0.3 } }
      const guidelinesPol: any = scenario.guidelines_policies || { tiers_json: [], cap_to_market: true }
      const rangePol: any = scenario.range_design_policies || { min_ratio: 0.75, max_ratio: 1.25 }
      
      const targetYear = pricingDate.getFullYear()
      const agingFactorRow = factors?.find(f => f.year === targetYear) || { inflation_rate: 0.05, market_movement_rate: 0.03 }

      // Blend rate
      const blendParams = agingPol.blend_weights || {}
      const infWeight = blendParams.INFLATION || 0;
      const mmWeight = blendParams.MARKET_MOVEMENT || 0;
      const annualRate = ((agingFactorRow.inflation_rate || 0) * infWeight) + ((agingFactorRow.market_movement_rate || 0) * mmWeight)

      const qualityReport: any = { warnings: [], exclusions: [], missing_basis_field: false }
      const outputs: any[] = []

      // Resolve Grades to act on
      const uniqueGradesRecord = mappings ? Array.from(new Set(mappings.map(m => m.pay_grade_internal))) : []
      if (uniqueGradesRecord.length === 0) throw new Error("No mapped grades found for country")

      // Get appropriate basis field mapping
      const snapshotFieldMap: Record<string, string> = {
        'BASE_SALARY': 'base_salary_p50',
        'ANNUAL_TARGET_CASH': 'target_cash_p50',
        'TOTAL_GUARANTEED': 'total_guaranteed_p50'
      }
      const dataCol = snapshotFieldMap[scenario.basis_type]

      // Get Current Primary Pay Bands (to act as the basis for Guidelines if replacing)
      const { data: currentPrimaryVersion } = await supabase
        .from('pay_band_versions')
        .select(`id, pay_bands(grade, midpoint)`)
        .eq('tenant_id', tenantId).eq('country_code', scenario.country_code).eq('basis_type', scenario.basis_type)
        .eq('status', 'PUBLISHED').eq('is_primary', true)
        .lte('structure_effective_start', scenario.pricing_date).gte('structure_effective_end', scenario.pricing_date)
        .maybeSingle();
      
      const currentMidMap = new Map<string, number>();
      if (currentPrimaryVersion && currentPrimaryVersion.pay_bands) {
         currentPrimaryVersion.pay_bands.forEach((b: any) => currentMidMap.set(b.grade, Number(b.midpoint)));
      }

      const marketDataIdx = new Map<string, any>()
      marketData.sort((a, b) => a.provider.localeCompare(b.provider) || a.vendor_level_code.localeCompare(b.vendor_level_code))
      for (const r of marketData) {
         marketDataIdx.set(`${r.provider}|${r.vendor_level_code}`, r)
      }

      for (const grade of uniqueGradesRecord) {
        // Find mapped mappings
        const gradeMappings = mappings!.filter(m => m.pay_grade_internal === grade);
        let targetCurrency = 'USD' // Fallback
        
        let compositeValue = 0
        const _currentMid = currentMidMap.get(grade) || 0;

        for (const provider of ['MERCER', 'WTW', 'THIRD']) {
          // Weight logic
          let weight = 0
          if (scenario.vendor_weights_by_grade_json && scenario.vendor_weights_by_grade_json[grade]) {
            weight = scenario.vendor_weights_by_grade_json[grade][provider] || 0
          } else if (scenario.vendor_weights_json) {
            weight = (scenario.vendor_weights_json as any)[provider] || 0
          }
           
          if (weight === 0) continue

          // Global Mapping Resolution (Phase 2.2): Prefer exact country over null global
          const mappedGrades = gradeMappings.filter(m => m.provider === provider)
          let pMap = mappedGrades.find(m => m.country_code === scenario.country_code)
          if (!pMap) pMap = mappedGrades.find(m => m.country_code === null)

          if (!pMap) {
            qualityReport.warnings.push(`Missing mapping for Provider ${provider} on Grade ${grade}`);
            continue;
          }

          // Market data lookup deterministic Phase 2.4
          const mRow = marketDataIdx.get(`${provider}|${pMap.vendor_level_code}`)
          if (!mRow) {
            qualityReport.warnings.push(`Missing market data for mapped level ${pMap.vendor_level_code} (${provider})`);
            continue;
          }

          targetCurrency = mRow.currency;

          // Quality Check
          if ((mRow.org_count && mRow.org_count < qualityPol.org_count_min) || (mRow.obs_count && mRow.obs_count < qualityPol.obs_count_min)) {
            if (qualityPol.low_sample_treatment === 'AUTO_EXCLUDE') {
              qualityReport.exclusions.push(`Excluded ${provider} / ${pMap.vendor_level_code} due to low sample.`);
              continue;
            } else {
              qualityReport.warnings.push(`Low sample warning for ${provider} / ${pMap.vendor_level_code}.`);
            }
          }

          // Data field check
          const rawValue = (mRow as any)[dataCol]
          if (rawValue === null || rawValue === undefined) {
             qualityReport.missing_basis_field = true;
             qualityReport.warnings.push(`Provider ${provider} is missing data mapped to ${scenario.basis_type}.`);
             continue; // Skip multiplying undefined by weight
          }

          // Aging
          const effDate = new Date(mRow.market_effective_date)
          const monthsDiff = (pricingDate.getFullYear() - effDate.getFullYear()) * 12 + pricingDate.getMonth() - effDate.getMonth()
          
          let agedVal = rawValue
          if (agingPol.method === 'COMPOUND') {
            agedVal = rawValue * Math.pow(1 + annualRate, monthsDiff / 12)
          }

          compositeValue += (agedVal * weight)
        }

        // Guidelines logic
        let proposedMid = compositeValue; // Baseline market pricing default 
        let appliedGuideline = "MARKET_P50";

        if (_currentMid > 0 && compositeValue > 0) {
           const _gap = (compositeValue - _currentMid) / _currentMid
           
           if (guidelinesPol.tiers_json && Array.isArray(guidelinesPol.tiers_json)) {
              // Assumes tiers_json is sorted or evaluates strictly between min and max bounds
              const tier = guidelinesPol.tiers_json.find((t: any) => _gap >= t.min_gap && _gap < t.max_gap)
              if (tier) {
                 if (tier.action === 'KEEP') {
                    proposedMid = _currentMid;
                    appliedGuideline = "TIER_KEEP";
                 } else if (tier.action === 'MOVE_PLUS_FRACTION' && tier.fraction !== undefined) {
                    proposedMid = _currentMid + (_currentMid * _gap * tier.fraction);
                    appliedGuideline = `TIER_MOVE_${tier.fraction}`;
                 } else if (tier.action === 'CATCH_UP') {
                    proposedMid = compositeValue; // Same as default
                    appliedGuideline = "TIER_CATCH_UP";
                 }
              }
           }
        }

        if (guidelinesPol.cap_to_market && proposedMid > compositeValue) {
          proposedMid = compositeValue;
          appliedGuideline += "_CAPPED";
        }

        // Apply Range Design Rules
        let propMin = proposedMid * parseFloat(rangePol.min_ratio);
        let propMax = proposedMid * parseFloat(rangePol.max_ratio);

        // Rounding Rules
        const cRule = roundingRules?.find(r => r.currency === targetCurrency);
        if (cRule) {
          proposedMid = roundValue(proposedMid, cRule.rounding_method, cRule.decimal_places);
          propMin = roundValue(propMin, cRule.rounding_method, cRule.decimal_places);
          propMax = roundValue(propMax, cRule.rounding_method, cRule.decimal_places);
        }

        outputs.push({
           grade,
           aged_market_mid: compositeValue,
           proposed_mid: proposedMid,
           proposed_min: propMin,
           proposed_max: propMax,
           range_spread: propMin > 0 ? Number(((propMax - propMin) / propMin * 100).toFixed(2)) : 0,
           currency: targetCurrency,
           explainability_json: { applied_guideline: appliedGuideline, previous_midpoint: _currentMid }
        })
      }
      
      const configHash = await generateHash({ 
         scenario_id, pricing_date: scenario.pricing_date, basis_type: scenario.basis_type, structure_effective_start: scenario.structure_effective_start, 
         agingPol, guidelinesPol, rangePol, qualityPol, 
         vendor_weights_json: scenario.vendor_weights_json, vendor_weights_by_grade_json: scenario.vendor_weights_by_grade_json
      });
      
      const usedImports = Array.from(new Set(marketData.map((d: any) => d.import_id))).sort();
      const mappedRows = marketData.map((d: any) => d.id).sort();
      const sortedGrades = [...uniqueGradesRecord].sort();
      const inputHash = await generateHash({ usedImports, mapped_rows: mappedRows, uniqueGradesRecord: sortedGrades });

      const { data: runRecord, error: runError } = await supabase
        .from('payband_build_runs')
        .insert({
          tenant_id: tenantId,
          scenario_id: scenario_id,
          quality_report_json: qualityReport,
          diagnostics_json: { outputs },
          config_hash: configHash,
          input_hash: inputHash,
          run_by: user.id
        })
        .select()
        .single()
        
      if (runError) throw runError
      
      return new Response(JSON.stringify({ success: true, run_id: runRecord.id, outputs, quality_report: qualityReport }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error('Unknown action: ' + action)

  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
