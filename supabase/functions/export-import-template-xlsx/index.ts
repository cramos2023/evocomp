import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { buildXlsx } from '../_shared/xlsx.ts';
import { IMPORT_TEMPLATE_MANIFEST } from '../_shared/importTemplateManifest.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Phase 7C.AD: Manual Auth ---
    const { getBearerToken, getAuthedUserId } = await import('../_shared/auth.ts');
    const token = getBearerToken(req);
    if (!token) {
      return new Response(JSON.stringify({ code: 401, message: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let _userId: string;
    try {
      _userId = await getAuthedUserId(token);
    } catch (e) {
      return new Response(JSON.stringify({ code: 401, message: 'Invalid or expired JWT' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Since this is just a template, we just need to confirm the user is authed.
    // The rest of the logic doesn't need a supabase client.
    // Construct the single sample row
    const sampleRow: Record<string, any> = {};
    IMPORT_TEMPLATE_MANIFEST.forEach(col => {
      sampleRow[col.key] = col.sampleValue ?? '';
    });

    // Build notes sheet
    const notesRows = [
      ['Column', 'Description', 'Required?', 'Example']
    ];
    IMPORT_TEMPLATE_MANIFEST.forEach(col => {
      notesRows.push([
        col.header,
        col.description || '',
        col.required ? 'Yes' : 'No',
        String(col.sampleValue ?? '')
      ]);
    });

    // Generate XLSX
    const xlsxBytes = await buildXlsx({
      sheetName: 'Import Template',
      columns: IMPORT_TEMPLATE_MANIFEST.map(col => ({
        key: col.key,
        header: col.header,
        type: col.type,
        width: col.width
      })),
      rows: [sampleRow],
      notes: {
        sheetName: 'Instructions & Notes',
        rows: notesRows
      }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 15);
    const filename = `evocomp_import_template_v2_${timestamp}.xlsx`;

    return new Response(xlsxBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (err: any) {
    console.error('Export Template error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
