-- ====================================================================
-- NSBS-UNILESA: REUSABLE PRODUCTION STAFF AUTHORIZATION SQL SCRIPT
-- Run this directly in the Supabase Dashboard SQL Editor (postgres role)
-- ====================================================================
--
-- FEATURES & SAFETY GUARANTEES:
-- 1. Uses existing auth.users UUIDs (or automatically resolves them by email).
-- 2. Never invents or assumes UUIDs.
-- 3. Automatically populates all required columns (user_id, role, email, is_active).
-- 4. Enforces check constraint: role IN ('super_admin','staff','course_rep','electoral_committee').
-- 5. Preserves existing accounts using ON CONFLICT (user_id) DO UPDATE.
-- 6. Synchronizes both public.admin_roles AND public.staff_accounts.
-- 7. Reports exactly which accounts were authorized.
-- ====================================================================

-- --------------------------------------------------------------------
-- OPTION 1 (RECOMMENDED): AUTHORIZE BY EMAIL
-- This method queries auth.users directly to fetch the exact UUID,
-- eliminating any risk of typos, wrong formatting, or foreign key errors.
-- --------------------------------------------------------------------
DO $$
DECLARE
  -- Define the list of staff accounts to authorize:
  -- Format: (email, role, full_name)
  v_staff_list jsonb := '[
    {
      "email": "staff1@nsbs.unilesa.edu.ng",
      "role": "staff",
      "name": "Dr. A. B. Adeleke"
    }
    -- Add more staff members below as needed:
    -- , { "email": "courserep@nsbs.unilesa.edu.ng", "role": "course_rep", "name": "John Doe" }
    -- , { "email": "electoral@nsbs.unilesa.edu.ng", "role": "electoral_committee", "name": "Jane Smith" }
  ]'::jsonb;

  v_item jsonb;
  v_email text;
  v_role text;
  v_name text;
  v_user_id uuid;
  v_count int := 0;
BEGIN
  RAISE NOTICE 'Starting NSBS Staff Authorization process...';

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_staff_list)
  LOOP
    v_email := lower(trim(v_item->>'email'));
    v_role  := lower(trim(v_item->>'role'));
    v_name  := trim(v_item->>'name');

    -- Validate role
    IF v_role NOT IN ('super_admin', 'staff', 'course_rep', 'electoral_committee') THEN
      RAISE EXCEPTION 'Invalid role "%" for email "%". Allowed roles: super_admin, staff, course_rep, electoral_committee', v_role, v_email;
    END IF;

    -- Lookup user in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = v_email;

    IF v_user_id IS NULL THEN
      RAISE WARNING 'User with email "%" does NOT exist in Supabase Authentication! Skipping.', v_email;
      CONTINUE;
    END IF;

    -- Upsert into public.admin_roles
    INSERT INTO public.admin_roles (user_id, role, email, is_active)
    VALUES (v_user_id, v_role, v_email, true)
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        email = EXCLUDED.email,
        is_active = true;

    -- Upsert into public.staff_accounts
    INSERT INTO public.staff_accounts (id, name, email, role, is_active)
    VALUES (
      v_user_id,
      coalesce(v_name, initcap(split_part(v_email, '@', 1))),
      v_email,
      v_role,
      true
    )
    ON CONFLICT (email) DO UPDATE
    SET role = EXCLUDED.role,
        is_active = true,
        name = coalesce(v_name, public.staff_accounts.name);

    v_count := v_count + 1;
    RAISE NOTICE '✓ Authorized % (UUID: %) with role %', v_email, v_user_id, v_role;
  END LOOP;

  RAISE NOTICE 'Finished: Successfully authorized % staff accounts.', v_count;
END $$;


-- --------------------------------------------------------------------
-- OPTION 2: DIRECT AUTHORIZATION BY USER UUID (If you already copied UUIDs)
-- --------------------------------------------------------------------
/*
INSERT INTO public.admin_roles (user_id, role, email, is_active)
SELECT 
  u.id,
  r.role,
  u.email,
  true
FROM (
  VALUES 
    ('PASTE-SUPABASE-AUTH-UUID-HERE'::uuid, 'staff'),
    ('ANOTHER-SUPABASE-AUTH-UUID-HERE'::uuid, 'course_rep')
) AS r(user_id, role)
JOIN auth.users u ON u.id = r.user_id
WHERE r.role IN ('super_admin', 'staff', 'course_rep', 'electoral_committee')
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    email = EXCLUDED.email,
    is_active = true;
*/

-- --------------------------------------------------------------------
-- VERIFICATION QUERY
-- Run this to verify all authorized administrators and their roles:
-- --------------------------------------------------------------------
SELECT 
  ar.user_id,
  ar.email,
  ar.role,
  ar.is_active,
  ar.created_at,
  sa.name AS staff_name,
  u.email_confirmed_at IS NOT NULL AS email_confirmed
FROM public.admin_roles ar
LEFT JOIN public.staff_accounts sa ON lower(sa.email) = lower(ar.email)
LEFT JOIN auth.users u ON u.id = ar.user_id
ORDER BY ar.created_at DESC;
