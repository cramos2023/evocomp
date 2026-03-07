/**
 * XLSX utilities for handling binary downloads from project Edge Functions.
 */

/**
 * Trigger an XLSX file download in the browser.
 * @param blob The binary data (typically from response.blob())
 * @param filename The desired filename (e.g. 'export.xlsx')
 */
export function downloadXlsx(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to invoke an export Edge Function and trigger download.
 * @param functionName The Supabase Edge Function slug
 * @param body Request payload
 * @param supabase The supabase client instance
 */
import { supabaseAnonKey } from '../lib/supabaseClient';

export async function triggerXlsxExport(
  functionName: string, 
  body: any, 
  supabase: any
): Promise<void> {
  const maxRetries = 1;
  let retryCount = 0;

  async function attemptInvoke(token: string): Promise<any> {
    // SECURITY GUARD: Ensure the token is a valid JWT format (3 parts)
    if (!token || token.split('.').length !== 3) {
      throw new Error('[XLSX Export] Invalid token format. Expected a JWT access_token.');
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers: { 
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey // Explicitly send the project's anon key
      }
    });
    return { data, error };
  }

  try {
    // 1. Initial attempt: get current session
    let { data: { session } } = await supabase.auth.getSession();
    
    // Check if session is expired or nearly expired (within 60 seconds)
    const now = Math.floor(Date.now() / 1000);
    const isExpiring = session?.expires_at ? (session.expires_at - now < 60) : true;

    if (!session || isExpiring) {
      console.log(`[XLSX Export] Session missing or expiring in ${session?.expires_at ? (session.expires_at - now) : 'N/A'}s. Refreshing...`);
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('[XLSX Export] Session refresh failed:', refreshError);
      } else {
        session = refreshData.session;
      }
    }

    if (!session || !session.access_token) {
      throw new Error('Authentication required: No active access_token. Please log in again.');
    }

    let token = session.access_token;
    
    // --- Phase 7C.AC: Structured Auth Diagnostics ---
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const supabaseUrl = (supabase as any).supabaseUrl || '';
      const urlHost = new URL(supabaseUrl).hostname;
      const issHost = payload.iss ? new URL(payload.iss).hostname : 'N/A';
      const ref = payload.ref || (payload.iss?.includes('.supabase.co') ? payload.iss.split('.')[0].replace('https://','') : 'N/A');
      
      console.groupCollapsed('XLSX Auth Debug');
      console.log('Function:', functionName);
      console.log('Supabase URL:', urlHost);
      console.log('Token Parts:', parts.length);
      console.log('Token Issuer:', issHost);
      console.log('Token Ref:', ref);
      console.log('Token Mask:', `${token.slice(0, 12)}...${token.slice(-6)}`);
      console.log('Seconds to Expire:', payload.exp - Math.floor(Date.now()/1000));
      console.log('Match Status:', urlHost.includes(ref) ? '✅ MATCH' : '❌ MISMATCH');
      console.groupEnd();
    } catch (diagErr) {
      console.error('[XLSX Export] Debug logging failed:', diagErr);
    }
    // -------------------------------------------------

    // 2. Initial Invocation
    let result = await attemptInvoke(token);

    // 3. Automated Retry on 401 (Invalid JWT)
    if (result.error && result.error.context?.status === 401 && retryCount < maxRetries) {
      retryCount++;
      console.warn(`[XLSX Export] 401 Invalid JWT detected. Forcing fresh refresh and retrying...`);
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData.session?.access_token) {
        token = refreshData.session.access_token;
        result = await attemptInvoke(token);
      }
    }

    const { data, error } = result;

    if (error) {
      let errorDetail = error.message;
      if (error.context && typeof error.context.text === 'function') {
        try {
          const bodyText = await error.context.text();
          errorDetail = `[HTTP ${error.context.status}] ${bodyText || error.message}`;
        } catch {
          errorDetail = `[HTTP ${error.context.status}] ${error.message}`;
        }
      }
      throw new Error(errorDetail);
    }

    if (data instanceof Blob) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 15);
      downloadXlsx(data, `evocomp_${functionName}_${ts}.xlsx`);
    } else {
      throw new Error('Response is not a valid binary file (Blob expected)');
    }
  } catch (err: any) {
    console.error(`XLSX export (${functionName}) failed:`, err);
    throw err;
  }
}
