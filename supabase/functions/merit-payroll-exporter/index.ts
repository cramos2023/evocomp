// supabase/functions/merit-payroll-exporter/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import {
  getBearerToken,
  getAuthedUserId,
  requireAnyAdminRole,
  getTenantIdForUser,
} from "../_shared/auth.ts";

function convertToCSV(data: Record<string, unknown>[]) {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => {
      let val = obj[header];
      if (val === null || val === undefined) val = "";
      // Escape commas and quotes
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Auth
    const token = getBearerToken(req);
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    let userId: string;
    try {
      userId = await getAuthedUserId(token);
      await requireAnyAdminRole(supabase, userId);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("Unauthorized")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      if (msg.includes("Forbidden")) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      return new Response(JSON.stringify({ error: "Admin gate failed", details: msg }), { status: 500, headers: corsHeaders });
    }
    
    let tenantId: string;
    try {
      tenantId = await getTenantIdForUser(supabase, userId);
    } catch {
      return new Response(JSON.stringify({ error: "Tenant not found for user" }), { status: 500, headers: corsHeaders });
    }

    // 3. Parse Body
    const { cycle_id } = await req.json();
    if (!cycle_id) throw new Error("cycle_id is required");

    // 4. Fetch Published Recommendations
    const { data: recs, error: recError } = await supabase
      .from("comp_merit_effective_recommendations")
      .select(`
        employee_external_id, 
        current_base_salary, 
        recommended_increase_pct, 
        recommended_increase_amount, 
        effective_new_base_salary, 
        currency, 
        published_at
      `)
      .eq("cycle_id", cycle_id)
      .eq("tenant_id", tenantId);
    
    if (recError) throw recError;
    if (!recs || recs.length === 0) {
      return new Response(JSON.stringify({ 
        ok: false,
        error: "NOT_PUBLISHED", 
        message: "No effective recommendations found for this cycle. Publish first." 
      }), { status: 404, headers: corsHeaders });
    }

    // 5. Generate CSV
    const csvContent = convertToCSV(recs);
    const fileName = `merit_export_${cycle_id}_${Date.now()}.csv`;
    const filePath = `${tenantId}/${cycle_id}/${fileName}`;

    // 6. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from("merit-exports")
      .upload(filePath, csvContent, {
        contentType: "text/csv",
        upsert: true
      });
    
    if (uploadError) {
      // If bucket doesn't exist, this might fail. In a real app we'd ensure bucket exists.
      throw new Error(`Storage error: ${uploadError.message}`);
    }

    // 7. Get Signed URL
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from("merit-exports")
      .createSignedUrl(filePath, 3600); // 1 hour
    
    if (urlError) throw urlError;

    return new Response(JSON.stringify({ 
      ok: true, 
      download_url: signedUrl.signedUrl,
      file_name: fileName,
      count: recs.length
    }), { status: 200, headers: corsHeaders });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
