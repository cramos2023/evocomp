import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { PersistenceService } from '../_shared/consult/persistence.ts';
import { InteractionMode, ConsultationRequest } from '../_shared/consult/contracts.ts';

serve(async (req: Request) => {
  try {
    const { tenant_id, user_id, correlation_id, question } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const persistence = new PersistenceService(supabase, tenant_id);

    // Mock the ConsultationRequest structure expected by createConsultation
    const mockRequest: ConsultationRequest = {
      mode: 'ASK' as InteractionMode,
      question: question || 'Audit Test Question',
      scope: { tenant_id }
    };

    const data = await persistence.createConsultation(
      mockRequest,
      'RECEIVED',
      undefined,
      user_id,
      correlation_id
    );

    return new Response(JSON.stringify(data), {
       status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
