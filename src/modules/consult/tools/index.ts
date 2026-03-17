import { compService } from '../../job-description/services/compService';
import { DiagnosticScope, VirtualContext } from '../../job-description/types/comp';
import { EvidenceSource } from '../types/evidence';

export const aiTools = {
  /**
   * Fetches full compensation diagnostics for an employee or position.
   */
  async get_comp_diagnostics(
    scope: DiagnosticScope,
    id: string,
    tenantId: string,
    context?: VirtualContext
  ): Promise<EvidenceSource> {
    const data = await compService.runDiagnostic(scope, id, tenantId, undefined, context);
    return {
      type: 'DIAGNOSTICS',
      id: `diag-${scope}-${id}`,
      data,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Fetches specific market alignment data.
   */
  async get_market_alignment(
    tenantId: string,
    country: string,
    family: string,
    func: string,
    level: string,
    currentSalary: number,
    context?: VirtualContext
  ): Promise<EvidenceSource> {
    const data = await compService.getMarketAlignment(tenantId, country, family, func, level, currentSalary, context);
    return {
      type: 'MARKET',
      id: `market-${country}-${level}`,
      data,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Fetches pay band fit for a salary.
   */
  async get_band_fit(
    tenantId: string,
    salary: number,
    level: string,
    country: string,
    context?: VirtualContext
  ): Promise<EvidenceSource> {
    const data = await compService.calculateBandFit(tenantId, salary, level, country, context);
    return {
      type: 'STRUCTURE',
      id: `band-fit-${level}-${country}`,
      data,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Aggregates equity risk based on peer group.
   */
  async get_equity_risk(
    tenantId: string,
    country: string,
    level: string,
    family?: string,
    func?: string,
    context?: VirtualContext
  ): Promise<EvidenceSource> {
    const data = await compService.getPeerGroupStats(tenantId, country, level, family, func, context);
    return {
      type: 'DIAGNOSTICS',
      id: `equity-risk-${level}`,
      data,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Placeholder for running a simulation.
   * In a real implementation, this would trigger the simulation orchestration.
   */
  async run_simulation(
    tenantId: string,
    scenarioId: string
  ): Promise<EvidenceSource> {
    // Mock simulation output for MVP
    const data = {
      scenario_id: scenarioId,
      impact: {
        total_payroll_delta: 154000,
        alignment_shift: 2.1,
        risk_reduction: 15
      }
    };
    return {
      type: 'SIMULATION',
      id: `sim-run-${scenarioId}`,
      data,
      timestamp: new Date().toISOString()
    };
  }
};
