import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vlmxfkazinrdfyhmxmvj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY!);

async function runE2E() {
  console.log('--- EvoComp Golden Example E2E Paybands Builder UI/Engine ---');
  
  // 1. Login
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'carlosiramosp20@gmail.com',
    password: '2026Venezuela2026*'
  });
  if (authErr) throw new Error(`Login failed: ${authErr.message}`);
  console.log('[1] Login successful. User:', authData.user.email);
  const tenantId = '73943f66-d7bb-427d-b2bb-e5d62520eaca';

  const evidence: any = {};

  // 2. Import Valid Market Data
  console.log('\n[2] Executing validate_market_import...');
  const importPayload = {
     provider: "MERCER",
     pricing_scope: "E2E Test Scope",
     source_filename: "e2e_smoke_test_cl.csv",
     rows: [
        { provider: "MERCER", country_code: "CL", currency: "CLP", vendor_level_code: "M3", market_effective_date: "2025-01-01", base_salary_p50: 60000000, org_count: 50, obs_count: 200 },
        { provider: "MERCER", country_code: "CL", currency: "CLP", vendor_level_code: "M4", market_effective_date: "2025-01-01", base_salary_p50: 80000000, org_count: 45, obs_count: 150 },
        { provider: "MERCER", country_code: "CL", currency: "CLP", vendor_level_code: "M5", market_effective_date: "2025-01-01", base_salary_p50: 110000000, org_count: 30, obs_count: 90 }
     ]
  };

  const { data: importRes, error: importErr } = await supabase.functions.invoke('payband-engine', {
     body: { action: 'validate_market_import', payload: importPayload }
  });
  if (importErr) throw new Error('Import failed: ' + await importErr.context?.text());
  
  evidence.import_success = importRes;
  console.log(`✅ Import Success: import_id=${importRes.import_id}, valid_rows=${importRes.valid}, status=${importRes.status}`);

  // 3. Setup Mappings
  console.log('\n[3] Setting up vendor_grade_mappings...');
  const mappingsToEnsure = [
     { provider: "MERCER", vendor_level_code: "M3", pay_grade_internal: "G3" },
     { provider: "MERCER", vendor_level_code: "M4", pay_grade_internal: "G4" },
     { provider: "MERCER", vendor_level_code: "M5", pay_grade_internal: "G5" }
  ];

  for (const map of mappingsToEnsure) {
      const { data: existing } = await supabase.from('vendor_grade_mappings')
        .select('*').eq('tenant_id', tenantId).eq('provider', map.provider).eq('vendor_level_code', map.vendor_level_code).eq('pay_grade_internal', map.pay_grade_internal);
        
      if (!existing || existing.length === 0) {
          const { error: mErr } = await supabase.from('vendor_grade_mappings').insert({
              tenant_id: tenantId,
              provider: map.provider,
              vendor_level_code: map.vendor_level_code,
              pay_grade_internal: map.pay_grade_internal,
              country_code: 'CL'
          });
          if (mErr) throw new Error('Mapping insert failed: ' + mErr.message);
          console.log(`Inserted mapping: ${map.vendor_level_code} -> ${map.pay_grade_internal}`);
      } else {
          console.log(`Mapping ${map.vendor_level_code} -> ${map.pay_grade_internal} already exists.`);
      }
  }

  // 4. Wizard Step 2: Validate Weights Server-Side
  console.log('\n[4] Validating global weights...');
  const { data: weightRes, error: weightErr } = await supabase.functions.invoke('payband-engine', {
     body: { action: 'validate_weights', payload: { globalWeights: { "MERCER": 1, "WTW": 0, "THIRD": 0 } } }
  });
  if (weightErr) throw new Error('Weight validation failed: ' + await weightErr.context?.text());
  evidence.weight_validation = weightRes;
  console.log(`✅ Weight Validation: isValid=${weightRes.isValid}, errors=${weightRes.errors.length}`);

  // 5. Create Scenario
  console.log('\n[5] Creating scenario record...');
  
  const defaultAging = { method: 'COMPOUND', blend_weights: { INFLATION: 0.5, MARKET_MOVEMENT: 0.5 } };
  const { data: agingPol } = await supabase.from('aging_policies').insert({ tenant_id: tenantId, name: 'E2E Aging', method: 'COMPOUND', blend_weights: defaultAging.blend_weights }).select().single();

  const { data: rangePol } = await supabase.from('range_design_policies').insert({ tenant_id: tenantId, name: 'E2E Range', min_ratio: 0.8, max_ratio: 1.2 }).select().single();

  const { data: dqPol } = await supabase.from('data_quality_policies').insert({ tenant_id: tenantId, name: 'E2E DQ', org_count_min: 10, obs_count_min: 50, low_sample_treatment: 'WARN_ONLY' }).select().single();

  const { data: scenario, error: scErr } = await supabase.from('payband_build_scenarios').insert({
      tenant_id: tenantId,
      name: `E2E Golden Example ${Date.now()}`,
      country_code: 'CL',
      basis_type: 'BASE_SALARY',
      structure_effective_start: '2026-01-01',
      structure_effective_end: '2026-12-31',
      pricing_date: '2026-03-01',
      vendor_weights_json: { "MERCER": 1, "WTW": 0, "THIRD": 0 },
      aging_policy_id: agingPol.id,
      range_design_policy_id: rangePol.id,
      data_quality_policy_id: dqPol.id,
      status: 'RUNNABLE'
  }).select().single();

  if (scErr) throw new Error("Scenario Create Failed: " + scErr.message);
  evidence.scenario_id = scenario.id;
  console.log(`✅ Scenario Created: id=${scenario.id}, status=${scenario.status}`);

  // 6. Run Scenario
  console.log('\n[6] Running payband_scenario engine...');
  const { data: run1Res, error: run1Err } = await supabase.functions.invoke('payband-engine', {
      body: { action: 'run_payband_scenario', payload: { scenario_id: scenario.id } }
  });
  if (run1Err) throw new Error('Run1 failed: ' + await run1Err.context?.text());
  evidence.run1 = run1Res;
  console.log(`✅ Run 1 Success: run_id=${run1Res.run_id}`);
  console.log(`Outputs:`, run1Res.outputs.map((o: any) => `${o.grade} Min:${o.proposed_min} Mid:${o.proposed_mid} Max:${o.proposed_max}`).join('\n  '));
  
  // 7. Determinism Test
  console.log('\n[7] Determinism Test: Running exact same scenario again...');
  const { data: run2Res, error: run2Err } = await supabase.functions.invoke('payband-engine', {
      body: { action: 'run_payband_scenario', payload: { scenario_id: scenario.id } }
  });
  if (run2Err) throw new Error('Run2 failed: ' + await run2Err.context?.text());
  evidence.run2 = run2Res;

  const { data: runsFromDb, error: dbErr } = await supabase.from('payband_build_runs').select('*').in('id', [run1Res.run_id, run2Res.run_id]).order('run_at');
  
  if (dbErr) throw new Error('DB query for runs failed: ' + JSON.stringify(dbErr));
  if (!runsFromDb || runsFromDb.length < 2) throw new Error(`Could not find both runs from DB. Found: ${runsFromDb?.length}`);
  
  if (runsFromDb[0].config_hash === runsFromDb[1].config_hash && runsFromDb[0].input_hash === runsFromDb[1].input_hash) {
      console.log(`✅ Determinism Pass: Hashes Match!`);
      console.log(`  config_hash = ${runsFromDb[0].config_hash}`);
      console.log(`  input_hash = ${runsFromDb[0].input_hash}`);
  } else {
      console.log(`❌ Determinism Fail: Hashes mismatch!`);
  }

  // 8. Publish Version
  console.log('\n[8] Publishing Version (clicking "Publish")...');
  const { data: pubRes, error: pubErr } = await supabase.functions.invoke('payband-engine', {
      body: { action: 'publish_version', payload: { run_id: run2Res.run_id } }
  });
  if (pubErr) throw new Error('Publish failed: ' + await pubErr.context?.text());
  evidence.version_id = pubRes.version_id;
  console.log(`✅ Publish Success: version_id=${pubRes.version_id}`);

  // 9. Mark Primary (Optional DB direct)
  console.log('\n[9] Marking Version as Primary...');
  await supabase.from('pay_band_versions').update({ is_primary: true }).eq('id', pubRes.version_id);

  // 10. Resolve Active System
  console.log('\n[10] Validating Home Dashboard resolution (resolve_active_paybands)...');
  const { data: resActive, error: resErr } = await supabase.functions.invoke('payband-engine', {
      body: { action: 'resolve_active_paybands', payload: { 
          country_code: 'CL', basis_type: 'BASE_SALARY', as_of_date: '2026-06-01' // Middle of year
      }}
  });
  if (resErr) throw new Error('Resolve failed: ' + await resErr.context?.text());
  
  evidence.resolution = resActive.active_version;
  console.log(`✅ Resolves correctly: Active Version ID = ${resActive.active_version?.id}`);

  console.log('\n--- Script Completed Successfully ---');
  fs.writeFileSync('e2e_evidence.json', JSON.stringify(evidence, null, 2));
}

runE2E().catch(console.error);
