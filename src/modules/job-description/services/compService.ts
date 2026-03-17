import { supabase } from '@/lib/supabaseClient';
import { 
  CompensationDiagnosticOutput, 
  DiagnosticScope, 
  CompDiagnosticRecord, 
  CompRecommendationRecord,
  VirtualContext
} from '../types/comp';

export const compService = {
  /**
   * Runs the deterministic compensation engine for a specific position or employee.
   * Supports an optional VirtualContext for simulation.
   */
  async runDiagnostic(
    scope: DiagnosticScope, 
    id: string, 
    tenantId: string,
    metadata?: { level: string; family: string; function: string; country: string },
    context?: VirtualContext
  ): Promise<CompensationDiagnosticOutput> {
    const runAt = new Date().toISOString();
    const version = context?.scenarioId ? `sim-${context.scenarioId}` : '2.0.0-deterministic';

    // 1. Fetch Primary Subject Data (with Virtual Context support)
    let subjectSalary = 0;
    let subjectLevel = metadata?.level || '';
    let subjectFamily = metadata?.family || '';
    let subjectFunction = metadata?.function || '';
    let subjectCountry = metadata?.country || 'USA';

    const isValidUuid = (uid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);

    if (scope === 'employee' && id && isValidUuid(id)) {
      const emp = context?.state?.employees?.[id] || (await supabase
        .from('employees')
        .select(`*, employee_compensation(*)`)
        .eq('id', id)
        .single()).data;
      
      if (!emp) throw new Error('Employee not found');
      
      const comp = emp.employee_compensation?.[0];
      subjectSalary = comp?.base_salary_local || 0;
      subjectLevel = emp.job_level_internal;
      subjectFamily = emp.job_family;
      subjectCountry = emp.country_code;
    } else if (scope === 'position' && id && isValidUuid(id)) {
      const pos = context?.state?.positions?.[id] || (await supabase
        .from('positions')
        .select('*')
        .eq('position_id', id)
        .single()).data;
      
      if (!pos) throw new Error('Position not found');
      
      subjectLevel = pos.classification_level;
      subjectFamily = pos.family_code;
      subjectFunction = pos.function_code;
      
      const band = await this.getPayBand(tenantId, subjectLevel, subjectCountry, context);
      subjectSalary = band?.midpoint || 0;
    } else if (metadata) {
      const band = await this.getPayBand(tenantId, subjectLevel, subjectCountry, context);
      subjectSalary = band?.midpoint || 0;
    } else {
      throw new Error('Valid ID or Metadata required for diagnostic run');
    }

    // 2. Internal Equity Engine (Peer Matching)
    const peerData = await this.getPeerGroupStats(tenantId, subjectCountry, subjectLevel, subjectFamily, subjectFunction, context);
    
    // 3. Band Fit Engine
    const bandFit = await this.calculateBandFit(tenantId, subjectSalary, subjectLevel, subjectCountry, context);

    // 4. Market Alignment Engine
    const marketAlignment = await this.getMarketAlignment(tenantId, subjectCountry, subjectFamily, subjectFunction, subjectLevel, subjectSalary, context);

    // 5. Compression/Inversion Engine
    const compression = scope === 'employee' 
      ? await this.calculateCompression(id, subjectSalary, context)
      : { risk_level: 'HEALTHY' as const, gap_percent: 0, subordinate_count: 0 };

    // 6. Recommendation Logic (Deterministic)
    const primaryRec = this.generatePrimaryRecommendation(peerData, bandFit, marketAlignment, compression, subjectSalary);

    const output: CompensationDiagnosticOutput = {
      scope,
      metadata: { run_at: runAt, engine_version: version },
      internal_equity: {
        peer_group_level: peerData.level,
        sample_size: peerData.sampleSize,
        median_peer_salary: peerData.median,
        delta_percent: subjectSalary > 0 && peerData.median > 0 ? ((subjectSalary - peerData.median) / peerData.median) * 100 : 0,
        status: peerData.sampleSize < 3 ? 'INSUFFICIENT_DATA' : 'HEALTHY'
      },
      band_fit: bandFit,
      market_alignment: marketAlignment,
      compression: compression as any,
      primary_recommendation: primaryRec
    };

    return output;
  },

  async getPayBand(tenantId: string, level: string, country: string, context?: VirtualContext) {
    const contextKey = `${level}-${country}`;
    if (context?.state?.payBands?.[contextKey]) {
      return context.state.payBands[contextKey];
    }

    const { data: band } = await supabase
      .from('pay_bands')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('grade', level)
      .eq('country_code', country)
      .limit(1)
      .maybeSingle();
    return band;
  },

  async getPeerGroupStats(tenantId: string, country: string, level: string, family?: string, func?: string, context?: VirtualContext) {
    const fetchPeers = async (f?: string, fu?: string) => {
      // 1. Check virtual state first
      if (context?.state?.employees) {
        const simPeers = Object.values(context.state.employees).filter((emp: any) => {
          const matchLevel = emp.job_level_internal === level && emp.country_code === country;
          if (!matchLevel) return false;
          if (f) return emp.job_family === f;
          if (fu) return emp.career_function === fu;
          return true;
        }).map((emp: any) => emp.employee_compensation?.[0]?.base_salary_local || 0);

        if (simPeers.length > 0) return simPeers;
      }

      // 2. Fallback to Supabase
      let q = supabase
        .from('employees')
        .select('id, employee_compensation(base_salary_local)')
        .eq('tenant_id', tenantId)
        .eq('country_code', country)
        .eq('job_level_internal', level);
      
      if (f) q = q.eq('job_family', f);
      else if (fu) q = q.eq('career_function', fu);

      const { data } = await q;
      return (data || []).map(p => p.employee_compensation?.[0]?.base_salary_local || 0).filter(s => s > 0);
    };

    // Hierarchical Match: 1. Family -> 2. Function -> 3. Level
    let salaries = family ? await fetchPeers(family) : [];
    let matchedLevel: 'family' | 'function' | 'level' | 'fallback_midpoint' = 'family';

    if (salaries.length < 3 && func) {
      salaries = await fetchPeers(undefined, func);
      matchedLevel = 'function';
    }

    if (salaries.length < 3) {
      salaries = await fetchPeers();
      matchedLevel = 'level';
    }

    if (salaries.length < 3) {
      matchedLevel = 'fallback_midpoint';
    }

    const sorted = salaries.sort((a, b) => a - b);
    const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

    return { median, sampleSize: salaries.length, level: matchedLevel };
  },

  async calculateBandFit(tenantId: string, salary: number, level: string, country: string, context?: VirtualContext) {
    const band = await this.getPayBand(tenantId, level, country, context);

    if (!band || !band.midpoint) {
      return { compa_ratio: 0, range_penetration: 0, status: 'BELOW_BAND' as const };
    }

    const compa_ratio = salary / band.midpoint;
    const range_penetration = (salary - band.min_salary) / (band.max_salary - band.min_salary);
    
    let status: any = 'IN_RANGE_MID';
    if (salary < band.min_salary) status = 'BELOW_BAND';
    else if (salary > band.max_salary) status = 'ABOVE_BAND';
    else if (range_penetration < 0.33) status = 'IN_RANGE_LOW';
    else if (range_penetration > 0.66) status = 'IN_RANGE_HIGH';

    return { compa_ratio, range_penetration, status };
  },

  async getMarketAlignment(tenantId: string, country: string, family: string, func: string, level: string, currentSalary: number, context?: VirtualContext) {
    const fetchBenchmark = async (f?: string, fu?: string) => {
      // Market data is usually static reference, but context can override target percentile
      const targetPercentile = context?.state?.settings?.marketPercentile || 50;
      const column = `base_salary_p${targetPercentile}`;

      let q = supabase
        .from('market_pay_data')
        .select(column)
        .eq('country_code', country)
        .eq('vendor_level_code', level);
      
      if (f) q = q.ilike('vendor_job_title', `%${f}%`);
      else if (fu) q = q.ilike('vendor_job_title', `%${fu}%`);

      const { data } = await q.limit(1).maybeSingle();
      return (data as any)?.[column] || null;
    };

    // Hierarchical Match: 1. Family -> 2. Function -> 3. Level
    let benchmark = await fetchBenchmark(family);
    let matchType: 'exact' | 'functional' | 'default' = 'exact';

    if (!benchmark) {
      benchmark = await fetchBenchmark(undefined, func);
      matchType = 'functional';
    }

    if (!benchmark) {
      benchmark = await fetchBenchmark();
      matchType = 'default';
    }

    const gap = benchmark && benchmark > 0 ? ((currentSalary - benchmark) / benchmark) * 100 : 0;
    
    let status: 'COMPETITIVE' | 'LAGGING' | 'LEADING' = 'COMPETITIVE';
    if (gap < -15) status = 'LAGGING';
    else if (gap > 15) status = 'LEADING';

    return {
      match_type: matchType,
      benchmark_value: benchmark || 0,
      market_gap_percent: gap,
      status
    };
  },

  async calculateCompression(employeeId: string, salary: number, context?: VirtualContext) {
    // 1. Check virtual direct reports first
    let directReports: any[] = [];
    if (context?.state?.employees) {
      directReports = Object.values(context.state.employees).filter((emp: any) => emp.manager_id === employeeId);
    }
    
    // 2. Fallback to Supabase if no virtual reports (or merge them if needed, but usually context is complete)
    if (directReports.length === 0) {
      const { data } = await supabase
        .from('snapshot_employee_data')
        .select('employee_id, base_salary_local')
        .eq('manager_id', employeeId);
      directReports = data || [];
    }

    if (!directReports || directReports.length === 0) {
      return { risk_level: 'HEALTHY' as const, gap_percent: 0, subordinate_count: 0 };
    }

    const maxSubSalary = Math.max(...directReports.map(r => r.base_salary_local || 0));
    if (maxSubSalary === 0) return { risk_level: 'HEALTHY' as const, gap_percent: 0, subordinate_count: directReports.length };

    const gap = ((salary - maxSubSalary) / maxSubSalary) * 100;
    
    let risk_level: 'PAY_INVERSION' | 'SEVERE_COMPRESSION' | 'MODERATE_COMPRESSION' | 'WATCH' | 'HEALTHY' = 'HEALTHY';
    if (salary < maxSubSalary) risk_level = 'PAY_INVERSION';
    else if (gap < 3) risk_level = 'SEVERE_COMPRESSION';
    else if (gap < 8) risk_level = 'MODERATE_COMPRESSION';
    else if (gap < 12) risk_level = 'WATCH';

    return { risk_level, gap_percent: gap, subordinate_count: directReports.length };
  },

  generatePrimaryRecommendation(peers: any, band: any, market: any, compression: any, salary: number) {
    if (compression.risk_level === 'PAY_INVERSION') {
      return { type_code: 'FIX_INVERSION', priority: 1 };
    }
    if (band.status === 'BELOW_BAND') {
      return { type_code: 'ADJUST_TO_MINIMUM', priority: 1 };
    }
    if (compression.risk_level === 'SEVERE_COMPRESSION') {
      return { type_code: 'REDUCE_COMPRESSION', priority: 2 };
    }
    if (market.status === 'LAGGING') {
      return { type_code: 'MARKET_ALIGNMENT_ADJUST', priority: 3 };
    }
    if (band.status === 'IN_RANGE_LOW' && peers.median > 0 && ((peers.median - salary)/salary) > 0.1) {
       return { type_code: 'INTERNAL_EQUITY_ADJUST', priority: 4 };
    }
    return { type_code: 'MAINTAIN', priority: 5 };
  },

  async saveDiagnostic(tenantId: string, record: Partial<CompDiagnosticRecord>, recommendations: Partial<CompRecommendationRecord>[]) {
    const { data: diagnostic, error: diagErr } = await supabase
      .from('comp_diagnostics')
      .insert({
        ...record,
        tenant_id: tenantId,
        run_at: new Date().toISOString()
      })
      .select()
      .single();

    if (diagErr) throw diagErr;

    if (recommendations.length > 0) {
      const { error: recErr } = await supabase
        .from('comp_recommendations')
        .insert(recommendations.map(r => ({
          ...r,
          tenant_id: tenantId,
          diagnostic_id: diagnostic.id
        })));
      
      if (recErr) throw recErr;
    }

    return diagnostic;
  }
};
