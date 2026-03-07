export interface ImportColumnDef {
  key: string;               // Exact database key or target key parsing
  header: string;            // The column name in the CSV/XLSX
  required: boolean;         // Is it strictly required?
  type: 'text' | 'currency' | 'percent' | 'date'; // Data type for XLSX builder
  width: number;             // Explicit width for XLSX builder
  description?: string;      // Notes/instructions for the user
  sampleValue?: string | number; // Example data for template
}

export const IMPORT_TEMPLATE_MANIFEST: ImportColumnDef[] = [
  { 
    key: 'employee_external_id', 
    header: 'employee_id', 
    required: true, 
    type: 'text', 
    width: 20,
    description: 'Unique identifier per row (e.g. EMP001)',
    sampleValue: 'EMP001'
  },
  { 
    key: 'external_id', 
    header: 'external_id', 
    required: true, 
    type: 'text', 
    width: 20,
    description: 'External HRIS system ID',
    sampleValue: 'EXT-001'
  },
  { 
    key: 'full_name', 
    header: 'full_name', 
    required: true, 
    type: 'text', 
    width: 28,
    description: 'First and Last name',
    sampleValue: 'Alice Johnson'
  },
  { 
    key: 'country_code', 
    header: 'country_code', 
    required: true, 
    type: 'text', 
    width: 14,
    description: 'ISO 3166-1 2-letter code (e.g. US, MX)',
    sampleValue: 'US'
  },
  { 
    key: 'currency', 
    header: 'currency', 
    required: true, 
    type: 'text', 
    width: 12,
    description: 'ISO 4217 3-letter code (e.g. USD, MXN)',
    sampleValue: 'USD'
  },
  { 
    key: 'base_salary', 
    header: 'base_salary', 
    required: true, 
    type: 'currency', 
    width: 16,
    description: 'Annual base salary in local currency',
    sampleValue: 120000
  },
  { 
    key: 'performance_rating', 
    header: 'performance_rating', 
    required: false, 
    type: 'text', 
    width: 20,
    description: 'e.g. Exceeds, Meets, Needs Improvement',
    sampleValue: 'Exceeds'
  },
  { 
    key: 'job_level', 
    header: 'job_level', 
    required: false, 
    type: 'text', 
    width: 16,
    description: 'Internal job level (e.g. L4, L5)',
    sampleValue: 'L5'
  },
  { 
    key: 'department', 
    header: 'department', 
    required: false, 
    type: 'text', 
    width: 20,
    description: 'Department or business unit',
    sampleValue: 'Engineering'
  },
  { 
    key: 'annual_variable_target_local', 
    header: 'annual_variable_target_local', 
    required: true, 
    type: 'currency', 
    width: 24,
    description: 'Variable pay target in local currency. Use 0 if not applicable.',
    sampleValue: 15000
  },
  { 
    key: 'annual_guaranteed_cash_target_local', 
    header: 'annual_guaranteed_cash_target_local', 
    required: true, 
    type: 'currency', 
    width: 32,
    description: 'Guaranteed cash allowances in local currency. Use 0 if not applicable.',
    sampleValue: 3000
  },
  // Extra columns supported by the engine but optional in the minimal v2 template
  { 
    key: 'employee_status', 
    header: 'employee_status', 
    required: true, 
    type: 'text', 
    width: 18,
    description: 'e.g. Active, LOA, Terminated',
    sampleValue: 'Active'
  },
  { 
    key: 'contract_hours_per_week', 
    header: 'contract_hours_per_week', 
    required: true, 
    type: 'text', 
    width: 22,
    description: 'Contracted hours per week',
    sampleValue: 40
  },
  { 
    key: 'email', 
    header: 'email', 
    required: false, 
    type: 'text', 
    width: 24,
    description: 'Work email address',
    sampleValue: 'alice@example.com'
  },
  { 
    key: 'manager_external_id', 
    header: 'manager_external_id', 
    required: false, 
    type: 'text', 
    width: 22,
    description: 'External ID of supervisor',
    sampleValue: 'MGR001'
  },
  { 
    key: 'manager_name', 
    header: 'manager_name', 
    required: false, 
    type: 'text', 
    width: 24,
    description: 'Name of supervisor',
    sampleValue: 'Robert Johnson'
  },
  { 
    key: 'position_code', 
    header: 'position_code', 
    required: false, 
    type: 'text', 
    width: 16,
    description: 'Position identifier',
    sampleValue: 'POS-1234'
  },
  { 
    key: 'job_title', 
    header: 'job_title', 
    required: false, 
    type: 'text', 
    width: 30,
    description: 'Current job title',
    sampleValue: 'Senior Software Engineer'
  },
  { 
    key: 'career_function', 
    header: 'career_function', 
    required: false, 
    type: 'text', 
    width: 20,
    description: 'e.g. Engineering, Sales',
    sampleValue: 'Engineering'
  },
  { 
    key: 'job_family', 
    header: 'job_family', 
    required: false, 
    type: 'text', 
    width: 20,
    description: 'Specific family within function',
    sampleValue: 'Backend'
  },
  { 
    key: 'career_level', 
    header: 'career_level', 
    required: false, 
    type: 'text', 
    width: 16,
    description: 'e.g. P1, P2, M1',
    sampleValue: 'P3'
  },
  { 
    key: 'employment_type', 
    header: 'employment_type', 
    required: false, 
    type: 'text', 
    width: 18,
    description: 'e.g. Full-Time, Part-Time',
    sampleValue: 'Full-Time'
  },
  { 
    key: 'hire_date', 
    header: 'hire_date', 
    required: false, 
    type: 'date', 
    width: 14,
    description: 'Format YYYY-MM-DD',
    sampleValue: '2020-03-15'
  },
  { 
    key: 'start_date_in_role', 
    header: 'start_date_in_role', 
    required: false, 
    type: 'date', 
    width: 18,
    description: 'Format YYYY-MM-DD',
    sampleValue: '2023-01-01'
  }
];
