export type JDStatus = 'draft' | 'active' | 'archived';

export interface JDProfile {
  id: string;
  tenant_id: string;
  reference_job_code: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
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
