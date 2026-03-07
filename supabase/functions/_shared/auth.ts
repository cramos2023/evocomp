// supabase/functions/_shared/auth.ts
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AdminRole = "admin" | "superadmin" | "TENANT_ADMIN" | "COMP_ADMIN";

export const DEFAULT_ADMIN_ROLES: AdminRole[] = [
  "admin",
  "superadmin",
  "TENANT_ADMIN",
  "COMP_ADMIN",
];

export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export function createSupabaseAdmin() {
  const url = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getAuthedUserId(jwt: string): Promise<string> {
  const url = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!url || !anon) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");

  // --- Phase 7C.AD: Manual Claims Sanity Check ---
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) throw new Error("Invalid JWT format");
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // 1. Must have sub (user id)
    if (!payload.sub) throw new Error("JWT missing 'sub' claim");
    
    // 2. Issuer check: should point to this project's auth endpoint
    const expectedIss = url.endsWith('/') ? `${url}auth/v1` : `${url}/auth/v1`;
    if (payload.iss && payload.iss !== expectedIss) {
      console.warn(`[Auth] Issuer mismatch. Got: ${payload.iss}, Expected: ${expectedIss}`);
      // We don't necessarily throw here if we trust getUser() to catch it, 
      // but it's good for logging/diagnostics.
    }
    
    // 3. Expiry check (fast fail)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) throw new Error("JWT expired");

  } catch (e) {
    console.error("JWT Claims Validation Failed:", e);
    throw new Error("Unauthorized");
  }

  const supabaseAsUser = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabaseAsUser.auth.getUser();
  if (error || !data?.user?.id) {
    console.error("Auth Exception:", error);
    throw new Error("Unauthorized");
  }
  return data.user.id;
}

export async function requireAnyAdminRole(
  supabaseAdmin: SupabaseClient,
  userId: string,
  roles: string[] = DEFAULT_ADMIN_ROLES,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);

  if (error) throw new Error("Role lookup failed");

  const roleIds = (data ?? []).map((r: { role_id: string | number }) => String(r.role_id));
  const ok = roles.some((r) => roleIds.includes(r));
  if (!ok) throw new Error("Forbidden");
}

export async function getTenantIdForUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();

  if (error || !data?.tenant_id) throw new Error("Tenant resolution failed");
  return String(data.tenant_id);
}
