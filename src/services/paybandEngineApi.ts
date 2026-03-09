import { supabase } from '../lib/supabaseClient';

/**
 * Invokes the payband-engine Edge Function with a secure JWT.
 * Ensures the session exists before making the call.
 */
export async function invokePaybandEngine(action: string, payload: any) {
  // 1. Ensure session exists
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.access_token) {
    throw new Error('Authentication session missing. Please login again.');
  }

  // 2. Invoke the function via supabase.functions.invoke
  // This automatically includes the Authorization: Bearer <JWT> header
  const { data, error } = await supabase.functions.invoke('payband-engine', {
    body: { action, payload }
  });

  if (error) {
    let msg = error.message;
    if (error.context && typeof error.context.text === 'function') {
      try {
        msg = await error.context.text();
      } catch (e) {
        // Fallback to error.message
      }
    }

    // Log details only in development (Vite sets import.meta.env.DEV)
    if (import.meta.env.DEV) {
      console.error('[PaybandEngine] Execution Error:', msg, error);
    }
    throw new Error(msg);
  }

  return data;
}
