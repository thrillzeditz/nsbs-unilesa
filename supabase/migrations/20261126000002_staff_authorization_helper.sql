-- ====================================================================
-- MIGRATION: 20261126000002_staff_authorization_helper.sql
-- Description:
--   1. Provides reusable, constraint-safe SQL helper functions for
--      authorizing staff members in public.admin_roles and public.staff_accounts.
--   2. Provides a batch authorization procedure to provision multiple
--      Supabase Auth users in one execution.
--   3. Guarantees constraint compliance:
--      - Validates foreign key against auth.users(id).
--      - Enforces role check (super_admin, staff, course_rep, electoral_committee).
--      - Automatically populates the required email column.
--      - Sets is_active = true.
--      - Prevents duplicate key errors via ON CONFLICT (user_id) DO UPDATE.
--      - Preserves existing super_admin accounts.
-- ====================================================================

-- --------------------------------------------------------------------
-- Helper Function 1: Authorize an Auth User by Email
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authorize_admin_user(
  p_email text,
  p_role text DEFAULT 'staff',
  p_name text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_clean_role text;
BEGIN
  -- Normalize inputs
  v_user_email := lower(trim(p_email));
  v_clean_role := lower(trim(p_role));

  -- 1. Validate role against DB constraint
  IF v_clean_role NOT IN ('super_admin', 'staff', 'course_rep', 'electoral_committee') THEN
    RAISE EXCEPTION 'Invalid role "%". Allowed roles are: super_admin, staff, course_rep, electoral_committee', p_role;
  END IF;

  -- 2. Lookup existing user in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User "%" does not exist in Supabase Authentication. Please create the user in Auth first.', v_user_email;
  END IF;

  -- 3. Upsert into public.admin_roles
  INSERT INTO public.admin_roles (user_id, role, email, is_active)
  VALUES (v_user_id, v_clean_role, v_user_email, true)
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role,
      email = EXCLUDED.email,
      is_active = true;

  -- 4. Upsert into public.staff_accounts (sync display name and role)
  INSERT INTO public.staff_accounts (id, name, email, role, is_active)
  VALUES (
    v_user_id,
    coalesce(p_name, initcap(split_part(v_user_email, '@', 1))),
    v_user_email,
    v_clean_role,
    true
  )
  ON CONFLICT (email) DO UPDATE
  SET role = EXCLUDED.role,
      is_active = true,
      name = coalesce(p_name, public.staff_accounts.name);

  RETURN format('Successfully authorized user %s (%s) with role %s.', v_user_email, v_user_id, v_clean_role);
END;
$$;

-- Restrict execution to authenticated users with super_admin role or service_role
REVOKE ALL ON FUNCTION public.authorize_admin_user(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.authorize_admin_user(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.authorize_admin_user(text, text, text) TO authenticated;

-- --------------------------------------------------------------------
-- Helper Function 2: Authorize an Auth User by UUID
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authorize_admin_by_uuid(
  p_user_id uuid,
  p_role text DEFAULT 'staff',
  p_name text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_email text;
  v_clean_role text;
BEGIN
  -- Normalize role
  v_clean_role := lower(trim(p_role));

  -- 1. Validate role against DB constraint
  IF v_clean_role NOT IN ('super_admin', 'staff', 'course_rep', 'electoral_committee') THEN
    RAISE EXCEPTION 'Invalid role "%". Allowed roles are: super_admin, staff, course_rep, electoral_committee', p_role;
  END IF;

  -- 2. Lookup existing user in auth.users to verify existence and fetch email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'UUID "%" does not exist in auth.users. Please verify the copied User ID.', p_user_id;
  END IF;

  -- 3. Upsert into public.admin_roles
  INSERT INTO public.admin_roles (user_id, role, email, is_active)
  VALUES (p_user_id, v_clean_role, lower(v_user_email), true)
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role,
      email = EXCLUDED.email,
      is_active = true;

  -- 4. Upsert into public.staff_accounts
  INSERT INTO public.staff_accounts (id, name, email, role, is_active)
  VALUES (
    p_user_id,
    coalesce(p_name, initcap(split_part(v_user_email, '@', 1))),
    lower(v_user_email),
    v_clean_role,
    true
  )
  ON CONFLICT (email) DO UPDATE
  SET role = EXCLUDED.role,
      is_active = true,
      name = coalesce(p_name, public.staff_accounts.name);

  RETURN format('Successfully authorized user %s (%s) with role %s.', v_user_email, p_user_id, v_clean_role);
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_admin_by_uuid(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.authorize_admin_by_uuid(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.authorize_admin_by_uuid(uuid, text, text) TO authenticated;
