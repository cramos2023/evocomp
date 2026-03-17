import { supabase } from '@/lib/supabaseClient';
import { JDCompAnalysis, PayBand, CompMapping } from '../types';

export const compService = {
  getCompensationAnalysis: async (): Promise<JDCompAnalysis[]> => {
    // 1. Fetch current tenant ID
    const { data: tenantData } = await supabase.rpc('get_current_tenant_id');
    const tenantId = tenantData;

    if (!tenantId) return [];

    // 2. Fetch all jd_profiles for the tenant
    const { data: profiles, error: profilesError } = await supabase
      .from('jd_profiles')
      .select('*')
      .eq('tenant_id', tenantId);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) return [];

    // 3. Fetch latest active versions for these profiles
    const { data: versions, error: versionsError } = await supabase
      .from('jd_profile_versions')
      .select('*')
      .in('profile_id', profiles.map(p => p.id))
      .eq('status', 'active')
      .order('version_number', { ascending: false });

    if (versionsError) throw versionsError;

    // Map profiles to their latest version
    const profileToLatestVersion = new Map<string, any>();
    versions?.forEach(v => {
      if (!profileToLatestVersion.has(v.profile_id)) {
        profileToLatestVersion.set(v.profile_id, v);
      }
    });

    // 4. Fetch all active comp_mappings for this tenant
    const { data: mappings, error: mappingError } = await supabase
      .from('comp_mappings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (mappingError) throw mappingError;

    // 5. Fetch all latest pay_bands for this tenant
    // Note: In a production environment with thousands of bands, we might filter by specific grades found in mappings
    const { data: bands, error: bandsError } = await supabase
      .from('pay_bands')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('effective_year', { ascending: false })
      .order('effective_month', { ascending: false });

    if (bandsError) throw bandsError;

    // 6. Fetch FX rates
    const { data: fxRates } = await supabase
      .from('fx_rates')
      .select('*')
      .order('date', { ascending: false });

    // 7. Assemble Analysis
    const analysis: JDCompAnalysis[] = profiles.map(profile => {
      const version = profileToLatestVersion.get(profile.id);
      
      const baseResult: JDCompAnalysis = {
        profile_id: profile.id,
        job_title: version?.title || 'Untitled Profile',
        job_family: version?.job_family || 'Unassigned',
        career_level: version?.career_level || 'N/A',
        internal_grade: version?.career_level || null,
        market_grade: null,
        band: null,
        alignment_status: version ? 'NOT_MAPPED' : 'NO_DATA',
        market_deviation_pct: null,
        pay_market_code: profile.pay_market_code,
        reporting_currency: profile.reporting_currency
      };

      if (!version) return baseResult;

      // Step 1: Resolve Mapping
      const mapping = mappings?.find(m => 
        m.internal_level === version.career_level &&
        m.job_family_group === 'GLOBAL' && // Default for MVP
        m.band_structure_id === 'STANDARD' // Default for MVP
      );

      if (!mapping) return baseResult;

      baseResult.market_grade = mapping.pay_grade;
      baseResult.alignment_status = 'MAPPED';

      // Step 2: Resolve Pay Band
      const band = bands?.find(b => 
        b.grade === mapping.pay_grade &&
        b.country_code === profile.pay_market_code
      );

      if (!band) return baseResult;

      // Assemble final band object
      const matchedBand: PayBand = {
        id: band.id,
        tenant_id: band.tenant_id,
        grade: band.grade,
        country_code: band.country_code,
        currency: band.currency,
        min_salary: band.min_salary,
        midpoint: band.midpoint,
        max_salary: band.max_salary,
        effective_year: band.effective_year,
        effective_month: band.effective_month
      };

      baseResult.band = matchedBand;
      baseResult.alignment_status = 'BAND_RESOLVED';

      // Step 3: FX Conversion (if applicable)
      if (profile.reporting_currency && band.currency && profile.reporting_currency !== band.currency) {
        const rateObj = fxRates?.find(r => 
          r.from_currency === band.currency && 
          r.to_currency === profile.reporting_currency
        );

        if (rateObj) {
          const rate = rateObj.rate;
          baseResult.band = {
            ...matchedBand,
            currency: profile.reporting_currency,
            min_salary: matchedBand.min_salary * rate,
            midpoint: matchedBand.midpoint * rate,
            max_salary: matchedBand.max_salary * rate
          };
          baseResult.fx_applied = true;
          baseResult.fx_rate = rate;
        }
      }

      return baseResult;
    });

    return analysis;
  },

  getAsOfDate: () => {
    return new Date().toLocaleDateString();
  },

  // --- Mapping Administration (Phase 2.3B) ---

  /**
   * Fetches all mappings for the current tenant.
   * @param activeOnly If true, only returns active mappings.
   */
  getMappings: async (activeOnly: boolean = false): Promise<CompMapping[]> => {
    const { data: tenantData } = await supabase.rpc('get_current_tenant_id');
    if (!tenantData) return [];

    let query = supabase
      .from('comp_mappings')
      .select('*')
      .eq('tenant_id', tenantData);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('internal_level', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Saves (inserts or updates) a mapping.
   * Strategy: Option A - Update the same row for edits.
   */
  saveMapping: async (mapping: Partial<CompMapping>): Promise<{ data: CompMapping | null, error: string | null }> => {
    const { data: tenantData } = await supabase.rpc('get_current_tenant_id');
    if (!tenantData) return { data: null, error: 'No tenant found' };

    const payload = {
      ...mapping,
      tenant_id: tenantData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('comp_mappings')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      // Hardened Error Handling: Catch Unique Violation (Partial Index idx_comp_mappings_unique_active)
      if (error.code === '23505') {
        return { data: null, error: 'DUPLICATE_ACTIVE_MAPPING' };
      }
      throw error;
    }

    return { data, error: null };
  },

  /**
   * Soft-deactivates a mapping.
   */
  deactivateMapping: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('comp_mappings')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;
  }
};
