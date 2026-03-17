export type JDStatus = 'draft' | 'active' | 'archived';

export interface JDProfile {
  id: string;
  tenant_id: string;
  reference_job_code: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Organization Context
  managerial_scope?: string;
  team_size_range?: string;
  geographic_scope?: string;
  budget_responsibility?: string;

  // Included versions (usually fetched separately or as a join)
  versions?: JDVersion[];
  current_version?: JDVersion;
}

export interface JDVersion {
  id: string;
  profile_id: string;
  version_number: number;
  status: JDStatus;
  title: string;
  career_function: string;
  job_family: string;
  career_level: string;
  business_type?: string;
  job_purpose?: string;
  // Scope
  team_size?: string;
  geographic_responsibility?: string;
  supervised_career_levels?: string;
  // Requirements
  education?: string;
  experience_years?: string;
  certifications?: string;
  languages?: string;
  technical_skills?: string;
  behavioral_competencies?: string;
  // Stakeholders
  stakeholders?: string;
  typical_aliases?: string;
  // Restricted
  provider_code_1?: string;
  provider_code_2?: string;
  provider_code_3?: string;
  rcs_grade?: string;
  pay_grade_band?: string;
  flsa_status?: string;
  comp_notes?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Advisory (Decision Engine Phase 1)
  advisory_classification_level?: string;
  advisory_band_reference?: string;
  advisory_job_size_score?: number;
  advisory_confidence_score?: number;
  advisory_confidence_label?: string;
  advisory_run_at?: string;
  advisory_engine_version?: string;

  responsibilities?: JDResponsibility[];
}

export interface JDResponsibility {
  id: string;
  version_id: string;
  title: string;
  description?: string;
  category?: string;
  percentage_of_time: number;
  proficiency_level?: string;
  is_essential: boolean;
  display_order: number;
  created_at: string;
}

export interface JDFilters {
  search?: string;
  career_function?: string;
  job_family?: string;
  career_level?: string;
  status?: JDStatus;
}

export interface Position {
  position_id: string;
  tenant_id: string;
  job_profile_id?: string;
  position_code: string;
  position_title: string;
  company_code: string;
  function_code: string;
  family_code?: string;
  sequence_number: number;
  box_suffix?: string;
  classification_level?: string;
  band_reference?: string;
  reports_to_position_id?: string;
  org_layer?: number;
  span_of_control?: number;
  is_root: boolean;
  is_placeholder: boolean;
  requires_review: boolean;
  is_multi_occupant: boolean;
  position_status: string;
  effective_from?: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvisoryLog {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  engine_version: string;
  input_snapshot: any;
  output_json: any;
  created_at: string;
}

export interface ClassificationLevelMapping {
  mapping_id: string;
  tenant_id: string;
  internal_level: string;
  client_level: string;
  client_label: string;
  created_at: string;
}
