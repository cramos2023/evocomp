-- Fix RLS policies for jd_profiles to ensure tenant isolation while allowing inserts
-- and set defaults via trigger to avoid missing tenant_id or created_by causing RLS failures.

-- 1. Trigger to ensure created_by and tenant_id are populated
CREATE OR REPLACE FUNCTION public.set_jd_profile_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_current_tenant_id();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_jd_profile_defaults ON public.jd_profiles;
CREATE TRIGGER trg_set_jd_profile_defaults
BEFORE INSERT ON public.jd_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_jd_profile_defaults();


-- 2. Drop existing policies on jd_profiles
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.jd_profiles;
DROP POLICY IF EXISTS "Users can create profiles in their tenant" ON public.jd_profiles;
DROP POLICY IF EXISTS "Users can update profiles in their tenant" ON public.jd_profiles;
DROP POLICY IF EXISTS "jd_profiles_select_same_tenant" ON public.jd_profiles;
DROP POLICY IF EXISTS "jd_profiles_insert_same_tenant" ON public.jd_profiles;
DROP POLICY IF EXISTS "jd_profiles_update_same_tenant" ON public.jd_profiles;

-- 3. Replace with hardened policies using get_current_tenant_id()
CREATE POLICY "jd_profiles_select_same_tenant"
ON public.jd_profiles
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "jd_profiles_insert_same_tenant"
ON public.jd_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant_id()
  -- And verify ownership
  AND created_by = auth.uid()
);

CREATE POLICY "jd_profiles_update_same_tenant"
ON public.jd_profiles
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_current_tenant_id()
)
WITH CHECK (
  tenant_id = public.get_current_tenant_id()
);
