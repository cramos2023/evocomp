import { supabase } from '@/lib/supabaseClient';
import { Position } from '../types/position';

export interface EvaluationRunMeta {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export const jobEvaluationApi = {
  async saveEvaluationRun(
    name: string, 
    positions: Position[], 
    tenantId: string, 
    description?: string
  ): Promise<string> {
    
    // 1. Get current user profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 2. Insert Header (Run)
    const { data: runData, error: runError } = await supabase
      .from('job_eval_runs')
      .insert({
        tenant_id: tenantId,
        name,
        description: description || null,
        created_by: user.id
      })
      .select('id')
      .single();

    if (runError) throw runError;
    const runId = runData.id;

    // 3. Prepare Factors
    const factorsToInsert: any[] = [];
    const outputsToInsert: any[] = [];

    positions.forEach((pos, index) => {
      const positionId = `pos-${index}`;
      // Extract factors
      Object.entries(pos.dimensions || {}).forEach(([key, dim]) => {
        factorsToInsert.push({
          run_id: runId,
          tenant_id: tenantId,
          position_id: positionId,
          dimension_key: key,
          value: dim.value,
          points: dim.points
        });
      });

      // Extract Outputs
      if (pos.result) {
        outputsToInsert.push({
          run_id: runId,
          tenant_id: tenantId,
          position_id: positionId,
          title: pos.jobTitle,
          department: null,
          total_points: pos.result.totalPoints,
          position_class: pos.result.positionClass,
          rcs_grade: pos.result.rcsGrade,
          raw_data: pos // Backup for recreation
        });
      }
    });

    // 4. Insert Factors
    if (factorsToInsert.length > 0) {
      const { error: factorsError } = await supabase
        .from('job_eval_run_factors')
        .insert(factorsToInsert);
      if (factorsError) throw factorsError;
    }

    // 5. Insert Outputs
    if (outputsToInsert.length > 0) {
      const { error: outputsError } = await supabase
        .from('job_eval_run_outputs')
        .insert(outputsToInsert);
      if (outputsError) throw outputsError;
    }

    return runId;
  },

  async getRunsList(tenantId: string): Promise<EvaluationRunMeta[]> {
    const { data, error } = await supabase
      .from('job_eval_runs')
      .select('id, name, description, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async loadEvaluationRun(runId: string, tenantId: string): Promise<Position[]> {
    // We can reconstruct exactly what was saved using the raw_data in outputs
    const { data: outputs, error } = await supabase
      .from('job_eval_run_outputs')
      .select('raw_data')
      .eq('run_id', runId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
    
    return outputs.map(out => out.raw_data as Position);
  }
};
