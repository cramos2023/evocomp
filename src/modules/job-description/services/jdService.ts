import { supabase } from '@/lib/supabaseClient';
import { JDProfile, JDVersion, JDResponsibility, JDFilters, Position, AdvisoryLog } from '../types/jd';

export const jdService = {
  async getProfiles(filters: JDFilters = {}): Promise<JDProfile[]> {
    let query = supabase
      .from('jd_profiles')
      .select(`
        *,
        versions:jd_profile_versions(
          *,
          responsibilities:jd_profile_responsibilities(*)
        )
      `)
      .order('updated_at', { ascending: false });

    if (filters.career_function) {
      query = query.eq('versions.career_function', filters.career_function);
    }
    // Filter by status on the version level
    if (filters.status) {
      query = query.eq('versions.status', filters.status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Manual search filtering if title matches
    let profiles = data as JDProfile[];
    if (filters.search) {
      const search = filters.search.toLowerCase();
      profiles = profiles.filter(p => 
        p.reference_job_code.toLowerCase().includes(search) ||
        p.versions?.some(v => v.title.toLowerCase().includes(search))
      );
    }

    return profiles;
  },

  async getProfileById(id: string): Promise<JDProfile | null> {
    const { data, error } = await supabase
      .from('jd_profiles')
      .select(`
        *,
        versions:jd_profile_versions(
          *,
          responsibilities:jd_profile_responsibilities(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async saveProfile(profile: Partial<JDProfile>, version: Partial<JDVersion>, responsibilities: Partial<JDResponsibility>[]): Promise<JDProfile> {
    // 1. Validate 100% time if status is not draft
    if (version.status === 'active') {
      const total = responsibilities.reduce((sum, r) => sum + (r.percentage_of_time || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        throw new Error('Total percentage of time must be exactly 100% for active profiles.');
      }
    }

    // 2. Perform transaction (Upsert Profile -> Upsert Version -> Delete/Upsert Responsibilities)
    const { data: profileData, error: profileError } = await supabase
      .from('jd_profiles')
      .upsert({
        id: profile.id,
        tenant_id: profile.tenant_id,
        reference_job_code: profile.reference_job_code,
        managerial_scope: profile.managerial_scope,
        team_size_range: profile.team_size_range,
        geographic_scope: profile.geographic_scope,
        budget_responsibility: profile.budget_responsibility,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) throw profileError;

    const { data: versionData, error: versionError } = await supabase
      .from('jd_profile_versions')
      .upsert({
        ...version,
        profile_id: profileData.id,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // Replace responsibilities for this version
    if (responsibilities.length > 0) {
      await supabase.from('jd_profile_responsibilities').delete().eq('version_id', versionData.id);
      
      const { error: respError } = await supabase
        .from('jd_profile_responsibilities')
        .insert(responsibilities.map(r => ({
          ...r,
          version_id: versionData.id
        })));
      
      if (respError) throw respError;
    }

    return profileData;
  },

  async invokeAdvisory(versionId: string, hasPlaceholderSupervisor: boolean = false): Promise<any> {
    const { data, error } = await supabase.functions.invoke('decision-engine-advisor', {
      body: { action: 'run', versionId, hasPlaceholderSupervisor }
    });
    
    if (error) {
      if (error.context) {
        let errData;
        try {
          errData = await error.context.json();
        } catch (_) {
          // Could not parse JSON, fallback to generic error below
        }
        
        if (errData) {
          throw new Error(`Edge Function Error (${errData.step || 'unknown'}): ${errData.error || errData.details || JSON.stringify(errData)}`);
        }
      }
      throw error;
    }
    
    return data;
  },

  async getAdvisoryLog(versionId: string): Promise<AdvisoryLog | null> {
    const { data, error } = await supabase
      .from('de_advisory_log')
      .select('*')
      .eq('entity_id', versionId)
      .eq('entity_type', 'jd_version')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getPositions(): Promise<Position[]> {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .neq('position_status', 'archived')
      .order('position_title', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getClassificationLevelMappings(): Promise<any[]> {
    const { data, error } = await supabase
      .from('classification_level_mapping')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  async createPlaceholderPosition(params: {
    title: string;
    companyCode: string;
    functionCode: string;
    familyCode?: string;
  }): Promise<Position> {
    const { data: tenantData } = await supabase.rpc('get_current_tenant_id');

    const { data, error } = await supabase
      .from('positions')
      .insert({
        position_title: params.title,
        company_code: params.companyCode,
        function_code: params.functionCode,
        family_code: params.familyCode,
        is_placeholder: true,
        requires_review: true,
        position_status: 'draft',
        tenant_id: tenantData
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
