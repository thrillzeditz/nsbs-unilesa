-- ====================================================================
-- MIGRATION: 20261126000001_admin_staff_management_and_active_status.sql
-- Description:
--   1. Add is_active column to admin_roles and staff_accounts.
--   2. Add role column to staff_accounts.
--   3. Update admin helper functions (is_any_admin, is_super_admin,
--      is_electoral_role, is_content_admin, is_editorial_admin) to
--      require is_active = true.
--   4. Update get_staff_accounts() RPC to return role and is_active.
--   5. Update column-level grants on staff_accounts for authenticated.
--   6. Link and sync gbiriemmanueltemidayo@gmail.com as super_admin.
-- ====================================================================

-- Step 1: Add is_active and role columns
ALTER TABLE public.admin_roles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.staff_accounts
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'staff';

ALTER TABLE public.staff_accounts
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Step 2: Grant safe columns to authenticated
GRANT SELECT (id, name, email, role, is_active, created_at)
  ON TABLE public.staff_accounts TO authenticated;

GRANT INSERT (name, email, role, is_active)
  ON TABLE public.staff_accounts TO authenticated;

GRANT UPDATE (name, email, role, is_active)
  ON TABLE public.staff_accounts TO authenticated;

GRANT DELETE
  ON TABLE public.staff_accounts TO authenticated;

-- Step 3: Update role-checking helper functions to enforce is_active = true
CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_electoral_role()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin','electoral_committee')
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_content_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin','staff','course_rep')
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_editorial_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin','staff')
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_any_admin();
$$;

-- Ensure execute permissions on helper functions
REVOKE ALL ON FUNCTION public.is_any_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_any_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_any_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_electoral_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_electoral_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_electoral_role() TO authenticated;

REVOKE ALL ON FUNCTION public.is_content_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_content_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_content_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_editorial_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_editorial_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_editorial_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- Step 4: Drop and recreate get_staff_accounts() to match new return signature
DROP FUNCTION IF EXISTS public.get_staff_accounts();

CREATE OR REPLACE FUNCTION public.get_staff_accounts()
RETURNS TABLE(id uuid, name text, email text, role text, is_active boolean, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sa.id, sa.name, sa.email, sa.role, sa.is_active, sa.created_at
  FROM   public.staff_accounts sa
  WHERE  EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND is_active = true
  )
  ORDER BY sa.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_staff_accounts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_staff_accounts() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_staff_accounts() TO authenticated;

-- Step 5: Provision / Sync primary super_admin gbiriemmanueltemidayo@gmail.com
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'gbiriemmanueltemidayo@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.admin_roles (user_id, role, email, is_active)
    VALUES (v_user_id, 'super_admin', 'gbiriemmanueltemidayo@gmail.com', true)
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'super_admin', email = 'gbiriemmanueltemidayo@gmail.com', is_active = true;
  END IF;

  INSERT INTO public.staff_accounts (id, name, email, role, is_active)
  VALUES (coalesce(v_user_id, gen_random_uuid()), 'Temidayo Gbiri', 'gbiriemmanueltemidayo@gmail.com', 'super_admin', true)
  ON CONFLICT (email) DO UPDATE
  SET role = 'super_admin', is_active = true, name = 'Temidayo Gbiri';
END $$;
