import { supabase } from '../lib/supabaseClient';

export interface BulkUpdatePayload {
  id: string;
  after_json: any;
}

/**
 * Updates multiple scenario_employee_results records in batches to avoid overwhelming the database.
 * @param updates Array of objects containing the row ID and the new after_json complete state.
 * @param batchSize Number of rows to update concurrently in a single batch.
 */
export async function updateEmployeeResultsBulk(updates: BulkUpdatePayload[], batchSize = 50): Promise<void> {
  for (let i = 0; i < updates.length; i += batchSize) {
    const chunk = updates.slice(i, i + batchSize);
    
    // Fire the updates in parallel for this chunk
    await Promise.all(
      chunk.map(updateConfig =>
        supabase
          .from('scenario_employee_results')
          .update({ after_json: updateConfig.after_json })
          .eq('id', updateConfig.id)
      )
    );
  }
}
