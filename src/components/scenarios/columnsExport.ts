import { supabase } from '../../lib/supabaseClient';

interface ExportableColumn {
  key: string;
  label: string;
  data_type: string;
  source: 'base' | 'dynamic';
}

// Base columns always present in scenario_employee_results grid
const BASE_COLUMNS: ExportableColumn[] = [
  { key: 'employee_id', label: 'Employee ID', data_type: 'text', source: 'base' },
  { key: 'full_name', label: 'Full Name', data_type: 'text', source: 'base' },
  { key: 'performance_rating', label: 'Performance Rating', data_type: 'text', source: 'base' },
  { key: 'salary_base_before', label: 'Base Salary Before', data_type: 'currency', source: 'base' },
  { key: 'salary_base_after', label: 'Base Salary After', data_type: 'currency', source: 'base' },
  { key: 'base_salary_local', label: 'Base Salary (Local)', data_type: 'currency', source: 'base' },
  { key: 'annual_variable_target_local', label: 'Variable Target (Local)', data_type: 'currency', source: 'base' },
  { key: 'annual_guaranteed_cash_target_local', label: 'Guaranteed Cash (Local)', data_type: 'currency', source: 'base' },
  { key: 'target_cash_local', label: 'Target Cash (Local)', data_type: 'currency', source: 'base' },
  { key: 'total_guaranteed_local', label: 'Total Guaranteed (Local)', data_type: 'currency', source: 'base' },
];

/**
 * Returns the merged list of base + active dynamic columns for export purposes.
 * Does NOT produce CSV itself — just returns the column manifest.
 */
export async function getExportableColumns(datasetId: string): Promise<ExportableColumn[]> {
  const { data: dynamicCols } = await supabase
    .from('column_definitions')
    .select('column_key, label, data_type')
    .eq('dataset_id', datasetId)
    .eq('is_active', true)
    .order('column_key', { ascending: true });

  const dynamic: ExportableColumn[] = (dynamicCols || []).map(c => ({
    key: c.column_key,
    label: c.label,
    data_type: c.data_type,
    source: 'dynamic' as const,
  }));

  return [...BASE_COLUMNS, ...dynamic];
}

// Performance threshold constants
export const SYNC_ROW_LIMIT = 10_000;

export function getCalculationMode(rowCount: number): 'sync' | 'async' {
  return rowCount > SYNC_ROW_LIMIT ? 'async' : 'sync';
}
