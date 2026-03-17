export interface CompMapping {
  id: string;
  tenant_id: string;
  internal_level: string;
  job_family_group: string;
  pay_grade: string;
  band_structure_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PayBand {
  id: string;
  tenant_id: string;
  grade: string;
  country_code: string | null;
  currency: string | null;
  min_salary: number;
  midpoint: number;
  max_salary: number;
  effective_year: number;
  effective_month: number;
}

export interface JDCompAnalysis {
  profile_id: string;
  job_title: string;
  job_family: string;
  career_level: string;
  internal_grade: string | null;
  market_grade: string | null;
  band: PayBand | null;
  alignment_status: 'NO_DATA' | 'NOT_MAPPED' | 'MAPPED' | 'BAND_RESOLVED';
  market_deviation_pct: number | null;
  pay_market_code?: string;
  reporting_currency?: string;
  fx_applied?: boolean;
  fx_rate?: number;
}
