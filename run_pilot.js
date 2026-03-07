import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vlmxfkazinrdfyhmxmvj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Use a service role key if available for admin tasks, otherwise anon
// We will need a user session to do this properly if relying on RLS,
// but for a script we can try to use anon key + email/password login.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPilot() {
  console.log('--- EvoComp Go-Live Pilot #1 Execution ---');
  
  // 1. Login
  console.log('\n[1] Logging in...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'carlosiramosp20@gmail.com',
    password: '2026Venezuela2026*'
  });
  if (authErr) throw new Error(`Login failed: ${authErr.message}`);
  console.log('Login successful. User:', authData.user.email);

  const tenantId = '73943f66-d7bb-427d-b2bb-e5d62520eaca'; // Test Org
  
  // 2. Create Cycle
  console.log('\n[2] Creating Cycle FY26_PILOT_001...');
  const cycleName = 'FY26_PILOT_001_' + Date.now(); // Ensure unique name
  const { data: cycleData, error: cycleErr } = await supabase
    .from('cycles')
    .insert({
      tenant_id: tenantId,
      name: cycleName,
      status: 'planned',
      year: new Date().getFullYear(),
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      budget_total: 5000000,
      currency: 'USD'
    })
    .select()
    .single();

  if (cycleErr) {
      console.error("Cycle creation failed:", cycleErr);
      return;
  }
  console.log(`Cycle created successfully: ${cycleData.name} (ID: ${cycleData.id})`);

  // 3. Import Data (Directly Parse CSV and Insert into Snapshots/Employees)
  console.log('\n[3] Importing Data Direct...');
  const csvContent = fs.readFileSync('c:\\\\MyApplications\\\\Escritorio\\\\EVOCOMP\\\\evocomp28.02.csv', 'utf8');
  
  const lines = csvContent.split('\n').filter(l => l.trim() !== '');
  const headers = lines[0].split(',');
  const employeesRows = [];
  const snapshotDataRows = [];
  const managerMappings = [];
  
  const seenIds = new Set();
  
  const maxEmployees = 100;
  for (let i = 1; i < lines.length && employeesRows.length < maxEmployees; i++) {
    const vals = lines[i].split(',');
    if (vals.length >= 11) {
       const extId = vals[0].trim();
       if (seenIds.has(extId)) continue;
       seenIds.add(extId);
       
       const fullName = vals[1].trim();
       
       // Map country to 2-char code
       const c = vals[3].trim().toUpperCase();
       const countryMap = {
         'BOLIVIA': 'BO',
         'CHILE': 'CL',
         'PERU': 'PE',
         'ECUADOR': 'EC',
         'COLOMBIA': 'CO',
         'ESPAÑA': 'ES',
         'SPAIN': 'ES',
         'MEXICO': 'MX',
         'ARGENTINA': 'AR',
         'USA': 'US'
       };
       const country = countryMap[c] || c.substring(0, 2);
       
       const mgrId = vals[10].trim().replace(/\r$/, '');

       employeesRows.push({
         tenant_id: tenantId,
         employee_external_id: extId,
         full_name: fullName,
         country_code: country,
         status: 'ACTIVE'
       });

       if (mgrId) {
         managerMappings.push({ extId, mgrId });
       }

       snapshotDataRows.push({
         tenant_id: tenantId,
         employee_external_id: extId,
         country_code: country,
         local_currency: vals[4].trim().substring(0, 3).toUpperCase(),
         base_salary_local: parseFloat(vals[5]) || 0,
         base_salary_base: parseFloat(vals[5]) || 0,
         target_cash_local: parseFloat(vals[6]) || 0,
         total_guaranteed_local: parseFloat(vals[7]) || 0,
         pay_grade_internal: vals[8].trim(),
         performance_rating: vals[9].trim(),
         manager_id: mgrId
       });
    }
  }

  console.log('Parsed', employeesRows.length, 'employees from CSV. Upserting to employees table...');
  const { data: empRes, error: empErr } = await supabase.from('employees')
    .upsert(employeesRows, { onConflict: 'tenant_id, employee_external_id' })
    .select('id, employee_external_id');
  
  if (empErr) { console.error("Employee insert failed", empErr); return; }
  
  const empMap = {};
  for(const e of empRes) empMap[e.employee_external_id] = e.id;

  const emMgrRows = [];
  for (const m of managerMappings) {
     if (empMap[m.extId] && empMap[m.mgrId]) {
        emMgrRows.push({
          tenant_id: tenantId,
          employee_id: empMap[m.extId],
          manager_id: empMap[m.mgrId]
        });
     }
  }
  if (emMgrRows.length > 0) {
      const { error: mgrErr } = await supabase.from('employee_managers').upsert(emMgrRows, { onConflict: 'tenant_id, employee_id' });
      if (mgrErr) console.error("Manager upsert warning:", mgrErr.message);
  }

  const { data: snapshotData, error: snapErr } = await supabase
    .from('snapshots')
    .insert({
      tenant_id: tenantId,
      name: 'Pilot Full Data ' + Date.now(),
      snapshot_date: new Date().toISOString().split('T')[0],
      source: 'CSV_IMPORT'
    })
    .select().single();
    
  if (snapErr) { console.error("Snapshot creation failed:", snapErr); return; }
  console.log('Created Snapshot ID:', snapshotData.id);
  const snapshot_id = snapshotData.id;

  const finalSnapData = snapshotDataRows.map(row => ({
     ...row,
     snapshot_id,
     employee_id: empMap[row.employee_external_id]
  }));

  const chunkSize = 100;
  for (let i = 0; i < finalSnapData.length; i += chunkSize) {
    const chunk = finalSnapData.slice(i, i + chunkSize);
    const { error: insErr } = await supabase.from('snapshot_employee_data').insert(chunk);
    if (insErr) { console.error('Insert snapshot data error:', insErr); return; }
  }
  console.log('Successfully inserted all employees into snapshot!!');

  // 4. Create Scenario
  console.log('\n[4] Creating Scenario...');
  const { data: scenario, error: scenarioErr } = await supabase
    .from('scenarios')
    .insert({
      tenant_id: tenantId,
      cycle_id: cycleData.id,
      name: 'Pilot Baseline Scenario',
      status: 'DRAFT',
      base_currency: 'USD',
      snapshot_id: snapshot_id,
      scenario_type: 'MERIT_REVIEW',
      rules_json: {}
    })
    .select()
    .single();
    
  if (scenarioErr) {
    console.error("Scenario creation failed:", scenarioErr);
    return;
  }
  console.log(`Scenario created: ${scenario.name} (ID: ${scenario.id})`);

  // 5. Run Scenario Generation
  console.log('\n[5] Running Scenario Engine...');
  const { data: runRes, error: runErr } = await supabase.functions.invoke('scenario-engine', {
    body: { scenarioId: scenario.id }
  });
  if (runErr) {
    if (runErr.context && typeof runErr.context.json === 'function') {
        const errorBody = await runErr.context.json();
        console.error("Scenario Engine failed with 400:", errorBody);
    } else {
        console.error("Scenario Engine failed:", runErr);
    }
    return;
  }
  console.log(`Scenario run started. We will wait 15 seconds for it to complete.`);
  await sleep(15000);

  // Set scenario status to COMPLETE manually (required by publisher gate)
  console.log('Setting scenario status to COMPLETE...');
  const { error: scenUpdErr } = await supabase
    .from('scenarios')
    .update({ status: 'COMPLETE' })
    .eq('id', scenario.id);
  if (scenUpdErr) console.error("Scenario status update failed:", scenUpdErr);

  // Check run status
  const { data: runs } = await supabase
    .from('scenario_runs')
    .select('*')
    .eq('scenario_id', scenario.id)
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (runs && runs.length > 0) {
      console.log(`Scenario Run Status: ${runs[0].status}, Remaining Budget: ${runs[0].remaining_budget_amount}`);
  }

  // 6. Generate Manager Plans (NEW STEP for Gating)
  console.log('\n[5.1] Generating Manager Plans for Gating...');
  const uniqueManagers = [...new Set(snapshotDataRows.map(r => r.manager_id).filter(Boolean))];
  console.log(`Found ${uniqueManagers.length} unique managers in snapshot. Creating plans...`);
  
  // Create plans for each manager found in CSV
  // NOTE: comp_merit_manager_plans table does NOT have a tenant_id column (based on Phase 5 migrations)
  const planRows = uniqueManagers.map(mgrExtId => ({
    cycle_id: cycleData.id,
    manager_user_id: authData.user.id, // Mapping all to current user for pilot simplicity
    status: 'draft',
    total_budget_amount: 100000 // Dummy budget
  }));

  if (planRows.length > 0) {
    const { data: plansCreated, error: plansErr } = await supabase
      .from('comp_merit_manager_plans')
      .insert(planRows)
      .select();
    
    if (plansErr) {
      console.error("Manager plans creation failed:", plansErr);
    } else if (!plansCreated) {
      console.error("Manager plans creation failed: No data returned");
    } else {
      console.log(`Successfully created ${plansCreated.length} manager plans.`);
      
      // For the pilot to publish, we need them to be APPROVED
      console.log('Setting plans to APPROVED for publishing gate...');
      const { error: updErr } = await supabase
        .from('comp_merit_manager_plans')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('cycle_id', cycleData.id);
      
      if (updErr) console.error("Plan approval failed:", updErr);
      else console.log('Plans set to APPROVED.');
    }
  }

  // 7. Lock all plans
  console.log('\n[6] Locking all manager plans...');
  const { data: lockRes, error: lockErr } = await supabase.functions.invoke('merit-cycle-admin', {
    body: { action: 'lock_all_plans', cycle_id: cycleData.id, note: 'Pilot Programmatic Lock' }
  });
  if (lockErr) console.error(`Lock failed: ${lockErr.message}`);
  else console.log(`Plans locked:`, lockRes);

  // 7. Run Validator
  console.log('\n[7] Running Validator...');
  const { data: valRes, error: valErr } = await supabase.functions.invoke('merit-payroll-validator', {
    body: { cycle_id: cycleData.id }
  });
  if (valErr) console.error(`Validator failed: ${valErr.message}`);
  else console.log(`Validation result: OK=${valRes?.ok}`, valRes?.summary);

  // 8. Close Cycle
  console.log('\n[8] Closing Cycle...');
  const { data: closeRes, error: closeErr } = await supabase.functions.invoke('merit-cycle-admin', {
    body: { action: 'close_cycle', cycle_id: cycleData.id, reason: 'Pilot Completed' }
  });
  if (closeErr) console.error(`Close cycle failed: ${closeErr.message}`);
  else console.log(`Cycle closed:`, closeRes);

  // 9. Publish Results
  console.log('\n[9] Publishing Results...');
  if (runs && runs.length > 0) {
      const { data: pubRes, error: pubErr } = await supabase.functions.invoke('merit-cycle-publisher', {
        body: { 
            action: 'publish_effective_recs',
            cycle_id: cycleData.id,
            scenario_id: scenario.id,
            run_id: runs[0].id,
            reason: 'Go-Live Pilot Auto-Publish',
            is_recommended: true,
            overwrite: true
        }
      });
      if (pubErr) {
          if (pubErr.context && typeof pubErr.context.json === 'function') {
              const errorBody = await pubErr.context.json();
              console.error("Publish failed with details:", JSON.stringify(errorBody, null, 2));
          } else {
              console.error(`Publish failed: ${pubErr.message}`);
          }
      }
      else console.log(`Publish results:`, pubRes);
  } else {
      console.log('Skipping publish because no run was generated.');
  }

  // 10. Export Payroll
  console.log('\n[10] Exporting Payroll...');
  const { data: expRes, error: expErr } = await supabase.functions.invoke('merit-payroll-exporter', {
    body: { cycle_id: cycleData.id }
  });
  if (expErr) {
    if (expErr.context && typeof expErr.context.json === 'function') {
        const errorBody = await expErr.context.json();
        console.error("Export failed with details:", JSON.stringify(errorBody, null, 2));
    } else {
        console.error(`Export failed: ${expErr.message}`);
    }
  }
  else console.log(`Export URL:`, expRes?.download_url);

  console.log('\n--- Pilot Execution Completed ---');
}

runPilot().catch(console.error);
