export type DiagnosticScope = 'position' | 'employee';

export interface CompensationDiagnosticOutput {
  scope: DiagnosticScope;
  metadata: {
    run_at: string;
    engine_version: string;
  };
  internal_equity: {
    peer_group_level: 'family' | 'function' | 'level' | 'fallback_midpoint';
    sample_size: number;
    median_peer_salary: number;
    delta_percent: number;
    status: 'HEALTHY' | 'OUTLIER' | 'INSUFFICIENT_DATA';
  };
  band_fit: {
    compa_ratio: number;
    range_penetration: number;
    status:
      | 'BELOW_BAND'
      | 'IN_RANGE_LOW'
      | 'IN_RANGE_MID'
      | 'IN_RANGE_HIGH'
      | 'ABOVE_BAND';
  };
  market_alignment: {
    match_type: 'exact' | 'functional' | 'default';
    benchmark_value: number; // p50
    market_gap_percent: number;
    status: 'COMPETITIVE' | 'LAGGING' | 'LEADING';
  };
  compression: {
    risk_level:
      | 'PAY_INVERSION'
      | 'SEVERE_COMPRESSION'
      | 'MODERATE_COMPRESSION'
      | 'WATCH'
      | 'HEALTHY';
    gap_percent: number;
    subordinate_count: number;
  };
  primary_recommendation: {
    type_code: string;
    priority: number;
  };
}

export interface CompDiagnosticRecord {
  id: string;
  tenant_id: string;
  diagnostic_scope: DiagnosticScope;
  position_id?: string;
  employee_id?: string;
  data: CompensationDiagnosticOutput;
  run_at: string;
  created_by?: string;
}

export interface CompRecommendationRecord {
  id: string;
  tenant_id: string;
  diagnostic_id: string;
  type_code: string;
  priority: number;
  status: 'pending' | 'implemented' | 'ignored';
  details_json: any;
  rationale_text?: string;
  created_at: string;
}

export interface SimulationState {
  employees: Record<string, any>;
  positions: Record<string, any>;
  payBands: Record<string, any>;
  settings: {
    marketPercentile?: number;
  };
}

export interface VirtualContext {
  scenarioId?: string;
  state?: SimulationState;
}
