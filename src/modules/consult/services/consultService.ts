/**
 * ARCHITECTURAL NOTE:
 * Legacy client-side persistence methods (saveConsultation, saveReasoningLog) 
 * have been removed in Phase 3D.1 as persistence is now handled by the 
 * 'consult-reasoning' Edge Function runtime.
 * 
 * getHistory() is preserved as a placeholder for future UI integration 
 * but currently has zero callers in the primary modules.
 */

import { supabase } from '@/lib/supabaseClient';

export const consultService = {
  /**
   * Fetches the consultation history for a tenant/user.
   * Note: This currently points to legacy tables and should be reviewed 
   * when the history UI is implemented.
   */
  async getHistory(tenantId: string, userId: string) {
    const { data, error } = await supabase
      .from('ai_consultations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};
