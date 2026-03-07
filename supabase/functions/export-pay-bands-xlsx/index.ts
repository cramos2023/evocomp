import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildXlsx, XlsxColumn } from '../_shared/xlsx.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { search = '', filterBasis = 'ALL', filterCountry = 'ALL', filterYear = 'ALL', filterMonth = 'ALL' } = await req.json();

    // --- Phase 7C.AD: Manual Auth ---
    const { getBearerToken, getAuthedUserId } = await import('../_shared/auth.ts');
    const token = getBearerToken(req);
    if (!token) {
      return new Response(JSON.stringify({ code: 401, message: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let userId: string;
    try {
      userId = await getAuthedUserId(token);
    } catch (e) {
      return new Response(JSON.stringify({ code: 401, message: 'Invalid or expired JWT' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Replicate PayBandsPage.tsx query
    const { data: bands, error: bandsErr } = await supabase
      .from('pay_bands')
      .select('id, grade, basis_type, country_code, currency, min_salary, midpoint, max_salary, spread, effective_year, effective_month')
      .order('effective_year', { ascending: false })
      .order('effective_month', { ascending: false })
      .order('country_code', { ascending: true, nullsFirst: false })
      .order('grade', { ascending: true })
      .order('basis_type', { ascending: true });

    if (bandsErr) throw bandsErr;

    // Apply exact same UI filters
    const filtered = (bands || []).filter((b: any) => {
      const matchSearch = !search || b.grade?.toLowerCase().includes(search.toLowerCase());
      const matchBasis  = filterBasis === 'ALL' || b.basis_type?.toUpperCase() === filterBasis.toUpperCase();
      const matchCountry = filterCountry === 'ALL' || (b.country_code && b.country_code.toUpperCase() === filterCountry.toUpperCase());
      const matchYear = filterYear === 'ALL' || b.effective_year?.toString() === filterYear;
      const matchMonth = filterMonth === 'ALL' || b.effective_month?.toString() === filterMonth;
      return matchSearch && matchBasis && matchCountry && matchYear && matchMonth;
    });

    // Formatting rules
    const BASIS_MAP: Record<string, string> = {
      'BASE_SALARY': 'Base Salary',
      'ANNUAL_TARGET_CASH': 'Target Cash',
      'TOTAL_GUARANTEED': 'Total Guaranteed'
    };

    const columns: XlsxColumn[] = [
      { key: 'grade', header: 'Grade', type: 'text', width: 14 },
      { key: 'basis_type_label', header: 'Basis', type: 'text', width: 22 },
      { key: 'country_code', header: 'Country', type: 'text', width: 12 },
      { key: 'currency', header: 'Currency', type: 'text', width: 12 },
      { key: 'effective_year', header: 'Year', type: 'text', width: 10 },
      { key: 'effective_month', header: 'Month', type: 'text', width: 10 },
      { key: 'min_salary', header: 'Min Salary', type: 'currency', width: 18 },
      { key: 'midpoint', header: 'Midpoint', type: 'currency', width: 18 },
      { key: 'max_salary', header: 'Max Salary', type: 'currency', width: 18 },
      { key: 'spread_pct', header: 'Spread', type: 'percent', width: 14 }
    ];

    const mappedRows = filtered.map((b: any) => {
      let spread: number | null = null;
      if (b.min_salary && b.max_salary) {
        spread = (b.max_salary - b.min_salary) / b.min_salary; // fraction for percent format
      }
      return {
        ...b,
        basis_type_label: BASIS_MAP[b.basis_type || ''] || b.basis_type,
        spread_pct: spread
      };
    });

    const ts = new Date().toISOString();
    const topHeaders = [
      ['Report:', 'Pay Bands Database'],
      ['Generated At:', ts],
      ['Filters:', `Search="${search}", Basis="${filterBasis}", Country="${filterCountry}", Year="${filterYear}", Month="${filterMonth}"`],
      []
    ];

    const xlsxBytes = await buildXlsx({
      sheetName: 'Pay Bands',
      columns,
      rows: mappedRows,
      topHeaderRows: topHeaders
    });

    const safeTs = ts.replace(/[:.]/g, '-').slice(0, 15);
    const filename = `evocomp_pay_bands_${safeTs}.xlsx`;

    return new Response(xlsxBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (err: any) {
    console.error('Export Pay Bands error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
