import { VirtualContext, SimulationState, CompensationDiagnosticOutput } from '../types/comp';
import { supabase } from '@/lib/supabaseClient';
import { compService } from './compService';

export const simulationService = {
  /**
   * Creates an empty simulation state.
   */
  createInitialState(): SimulationState {
    return {
      employees: {},
      positions: {},
      payBands: {},
      settings: {
        marketPercentile: 50
      }
    };
  },

  /**
   * Merges specific live data into the simulation state.
   * Useful for "Baseline Materialization".
   */
  async materializeBaseline(
    tenantId: string, 
    scope: { employees?: string[], positions?: string[], payBands?: { grade: string, country: string }[] }
  ): Promise<SimulationState> {
    const state = this.createInitialState();

    if (scope.employees?.length) {
      const { data } = await supabase
        .from('employees')
        .select(`*, employee_compensation(*)`)
        .in('id', scope.employees);
      
      (data || []).forEach(emp => {
        state.employees[emp.id] = emp;
      });
    }

    if (scope.positions?.length) {
      const { data } = await supabase
        .from('positions')
        .select('*')
        .in('position_id', scope.positions);
      
      (data || []).forEach(pos => {
        state.positions[pos.position_id] = pos;
      });
    }

    if (scope.payBands?.length) {
      // Fetch pay bands for specific grade+country combinations
      for (const b of scope.payBands) {
        const { data } = await supabase
          .from('pay_bands')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('grade', b.grade)
          .eq('country_code', b.country)
          .maybeSingle();
        
        if (data) {
          state.payBands[`${b.grade}-${b.country}`] = data;
        }
      }
    }

    return state;
  },

  /**
   * Creates a new simulation scenario in the database and materializes its baseline.
   */
  async createScenario(params: {
    tenantId: string;
    name: string;
    description?: string;
    type: 'STRUCTURAL' | 'INCUMBENT';
    scope: { employees?: string[], positions?: string[], payBands?: { grade: string, country: string }[] }
  }): Promise<string> {
    // 1. Materialize data in memory
    const baseline = await this.materializeBaseline(params.tenantId, params.scope);

    // 2. Persist to database
    const { data, error } = await supabase
      .from('simulation_scenarios')
      .insert({
        tenant_id: params.tenantId,
        name: params.name,
        description: params.description,
        scenario_type: params.type,
        baseline_data: baseline
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  /**
   * Validates the structural integrity of a simulation state.
   */
  validateStructuralIntegrity(state: SimulationState) {
    const errors: string[] = [];

    // 1. Cycle Detection in Reporting Lines
    const positions = Object.values(state.positions);
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (posId: string): boolean => {
      if (recStack.has(posId)) return true;
      if (visited.has(posId)) return false;

      visited.add(posId);
      recStack.add(posId);

      const pos = state.positions[posId];
      if (pos?.manager_id && state.positions[pos.manager_id]) {
        if (hasCycle(pos.manager_id)) return true;
      }

      recStack.delete(posId);
      return false;
    };

    for (const pos of positions) {
      if (hasCycle(pos.position_id)) {
        errors.push(`Circular dependency detected involving position ${pos.position_id}`);
        break; // Stop after first cycle found
      }
    }

    // 2. Orphan Check (Target position must exist if specified)
    // (Implicitly handled by logic, but good to add if we had more granular checks)

    return { isValid: errors.length === 0, errors };
  },

  /**
   * Applies an array of transformations to a simulation state.
   */
  applyTransformations(state: SimulationState, transformations: any[]): SimulationState {
    const newState = JSON.parse(JSON.stringify(state)); // Deep clone for immutability

    for (const tx of transformations) {
      switch (tx.operation_type) {
        case 'adjust_midpoint_percent': {
          const key = `${tx.transformation_data.grade}-${tx.transformation_data.country}`;
          const band = newState.payBands[key];
          if (band) {
            const factor = 1 + tx.transformation_data.value;
            band.midpoint *= factor;
            band.minimum *= factor;
            band.maximum *= factor;
          }
          break;
        }

        case 'adjust_salary_percent': {
          const emp = newState.employees[tx.target_id];
          if (emp && emp.employee_compensation?.[0]) {
            emp.employee_compensation[0].base_salary_local *= (1 + tx.transformation_data.value);
          }
          break;
        }

        case 'promote_level': {
          const emp = newState.employees[tx.target_id];
          if (emp) {
            emp.job_level_internal = tx.transformation_data.new_level;
          }
          break;
        }

        case 'change_market_stance': {
          newState.settings.marketPercentile = tx.transformation_data.percentile_target;
          break;
        }

        case 'change_reports_to': {
          const pos = newState.positions[tx.target_id];
          if (pos) {
            pos.manager_id = tx.transformation_data.manager_id;
          }
          break;
        }
      }
    }

    return newState;
  },

  /**
   * Summarizes the results of a simulation run.
   */
  async summarizeResults(tenantId: string, baselineState: SimulationState, simulatedState: SimulationState, scenarioId: string): Promise<{ summary: any, details: Record<string, any> }> {
    const details: Record<string, any> = {};
    const summary = {
      totalPayrollImpact: 0,
      headcountImpacted: 0,
      riskDelta: 0,
      bandFitDelta: 0,
      marketAlignmentShift: 0
    };

    const targetEmployees = Object.keys(simulatedState.employees);

    for (const empId of targetEmployees) {
      const contextSim: VirtualContext = { scenarioId, state: simulatedState };
      const contextBase: VirtualContext = { state: baselineState };

      const diagSim = await compService.runDiagnostic('employee', empId, tenantId, undefined, contextSim);
      const diagBase = await compService.runDiagnostic('employee', empId, tenantId, undefined, contextBase);

      const salarySim = simulatedState.employees[empId].employee_compensation?.[0]?.base_salary_local || 0;
      const salaryBase = baselineState.employees[empId].employee_compensation?.[0]?.base_salary_local || 0;

      const salaryDelta = salarySim - salaryBase;
      if (salaryDelta !== 0) summary.headcountImpacted++;
      summary.totalPayrollImpact += salaryDelta;

      const marketSim = diagSim.market_alignment.market_gap_percent || 0;
      const marketBase = diagBase.market_alignment.market_gap_percent || 0;
      summary.marketAlignmentShift += (marketSim - marketBase);

      // Risk Delta (Compression)
      if (diagSim.compression.risk_level !== diagBase.compression.risk_level) {
        if (diagSim.compression.risk_level === 'HEALTHY') summary.riskDelta--;
        else if (diagBase.compression.risk_level === 'HEALTHY') summary.riskDelta++;
      }

      // Band Fit Delta
      const isSimMatch = diagSim.band_fit.status.startsWith('IN_RANGE');
      const isBaseMatch = diagBase.band_fit.status.startsWith('IN_RANGE');
      
      if (isSimMatch !== isBaseMatch) {
        if (isSimMatch) summary.bandFitDelta--;
        else if (isBaseMatch) summary.bandFitDelta++;
      }

      details[empId] = {
        sim: diagSim,
        base: diagBase,
        deltas: {
          salary: salaryDelta,
          compaRatio: diagSim.band_fit.compa_ratio - diagBase.band_fit.compa_ratio
        }
      };
    }

    if (targetEmployees.length > 0) {
      summary.marketAlignmentShift /= targetEmployees.length;
    }

    return { summary, details };
  },

  /**
   * Orchestrates the execution of a simulation scenario.
   */
  async runSimulation(scenarioId: string): Promise<{ state: SimulationState, summary: any }> {
    // 1. Fetch Scenario, Inputs
    const { data: scenario } = await supabase
      .from('simulation_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .single();
    
    const { data: inputs } = await supabase
      .from('simulation_inputs')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('step_order', { ascending: true });

    if (!scenario) throw new Error('Scenario not found');

    // 2. Start with baseline
    const baselineState = scenario.baseline_data as SimulationState;
    let currentState = JSON.parse(JSON.stringify(baselineState));

    // 3. Apply transformations
    currentState = this.applyTransformations(currentState, inputs || []);

    // 4. Validate
    const validation = this.validateStructuralIntegrity(currentState);
    if (!validation.isValid) {
      throw new Error(`Structural validation failed: ${validation.errors.join(', ')}`);
    }

    // 5. Aggregate Results
    const { summary, details } = await this.summarizeResults(scenario.tenant_id, baselineState, currentState, scenarioId);

    // 6. Persist results
    await supabase
      .from('simulation_outputs')
      .upsert({
        scenario_id: scenarioId,
        summary_json: summary,
        detail_json: details
      });

    return { state: currentState, summary };
  }
};
