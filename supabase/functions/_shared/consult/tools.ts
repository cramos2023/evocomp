import { ToolResult } from './contracts.ts';
import { ToolNotAllowedError, ToolExecutionError } from './errors.ts';

export const ALLOWED_TOOLS = [
  'get_comp_diagnostics',
  'get_equity_risk',
  'get_band_fit',
  'get_market_alignment',
  'run_simulation'
] as const;

export type ToolName = typeof ALLOWED_TOOLS[number];

export interface ToolDefinition {
  name: ToolName;
  execute: (params: any, scope: any) => Promise<ToolResult>;
}

/**
 * Deterministic Tool Registry
 * For Phase 3A Remediation, source_id values are stable (hardcoded) to ensure deterministic hashing.
 */
export const ToolRegistry: Record<ToolName, ToolDefinition> = {
  get_comp_diagnostics: {
    name: 'get_comp_diagnostics',
    execute: async (params, scope) => {
      return {
        tool_name: 'get_comp_diagnostics',
        success: true,
        payload: {
          diagnostics_summary: "Comp ratio across organization is at 0.92, indicating potential market lag.",
          hot_zones: ["Engineering", "Product"],
          anomalies_count: 14
        },
        source_id: 'd1a60cc0-0001-4000-8000-000000000001',
        source_type: 'DIAGNOSTIC_RUN',
        latency_ms: 120
      };
    }
  },
  get_equity_risk: {
    name: 'get_equity_risk',
    execute: async (params, scope) => {
      return {
        tool_name: 'get_equity_risk',
        success: true,
        payload: {
          risk_score: 0.15,
          diversity_gap: "None detected in current scope.",
          internal_parity_notes: "Minor compression in Senior levels."
        },
        source_id: 'd1a60cc0-0001-4000-8000-000000000002',
        source_type: 'EQUITY_AUDIT',
        latency_ms: 250
      };
    }
  },
  get_band_fit: {
    name: 'get_band_fit',
    execute: async (params, scope) => {
      return {
        tool_name: 'get_band_fit',
        success: true,
        payload: {
          fit_average: 0.88,
          out_of_band_count: 3,
          critical_exceptions: []
        },
        source_id: 'd1a60cc0-0001-4000-8000-000000000003',
        source_type: 'BAND_ANALYSIS',
        latency_ms: 80
      };
    }
  },
  get_market_alignment: {
    name: 'get_market_alignment',
    execute: async (params, scope) => {
      return {
        tool_name: 'get_market_alignment',
        success: true,
        payload: {
          percentile_rank: 55,
          market_volatility: "Moderate",
          benchmark_freshness: "90 days"
        },
        source_id: 'd1a60cc0-0001-4000-8000-000000000004',
        source_type: 'MARKET_BENCHMARK',
        latency_ms: 190
      };
    }
  },
  run_simulation: {
    name: 'run_simulation',
    execute: async (params, scope) => {
      return {
        tool_name: 'run_simulation',
        success: true,
        payload: {
          simulation_id: 'd1a60cc0-0001-4000-8000-000000000006',
          projected_budget_impact: 450000,
          outcome: "Approved parameters within fiscal 2026 guidelines."
        },
        source_id: 'd1a60cc0-0001-4000-8000-000000000005',
        source_type: 'SIMULATION_SCENARIO',
        latency_ms: 1200
      };
    }
  }
};

/**
 * Orchestrates tool execution based on a server-side plan.
 */
export async function executeToolPlan(plan: { tool: string; params: any }[], scope: any): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  
  for (const step of plan) {
    const toolName = step.tool as ToolName;
    
    if (!ALLOWED_TOOLS.includes(toolName)) {
      throw new ToolNotAllowedError(toolName);
    }
    
    const tool = ToolRegistry[toolName];
    try {
      const result = await tool.execute(step.params, scope);
      results.push(result);
    } catch (err: any) {
      throw new ToolExecutionError(toolName, err.message || 'Unknown tool error', err);
    }
  }
  
  return results;
}
