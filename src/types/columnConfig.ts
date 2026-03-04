export interface ColumnDefinition {
  id: string;
  tenant_id: string;
  dataset_id: string;
  column_key: string;
  label: string;
  description?: string;
  data_type: 'text'|'integer'|'decimal'|'currency'|'percent'|'date'|'boolean'|'enum';
  format?: string;
  numeric_scale?: number;
  currency_scale?: number;
  percent_representation?: 'fraction'|'whole';
  null_policy?: 'PROPAGATE'|'ZERO'|'ERROR';
  div0_policy?: 'NULL'|'ERROR';
  formula_dsl?: string;
  depends_on?: string[];
  validation_status?: 'valid'|'invalid'|'requires_attention';
  validation_errors?: any;
  last_validated_at?: string;
  is_active: boolean;
  is_hidden: boolean;
}

export interface FormulaJob {
  id: string;
  tenant_id: string;
  dataset_id: string;
  scenario_run_id?: string;
  requested_columns: string[];
  affected_columns: string[];
  status: 'queued'|'running'|'succeeded'|'failed'|'cancelled';
  mode: 'sync'|'async';
  total_rows?: number;
  processed_rows: number;
  attempt_count: number;
  started_at?: string;
  finished_at?: string;
  error_message?: string;
}
