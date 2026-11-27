-- ====================================================================
-- MIGRATION: Student Voter Registry (2026-11-27)
-- NSBS University of Ilesa — Election Management System
--
-- PURPOSE:
--   Creates a permanent, centralised student_voter_registry table that
--   acts as the single source of truth for all registered biochemistry
--   students. Individual elections draw their voter roster FROM this
--   registry rather than from one-off CSV pastes.
--
-- WHAT THIS ADDS:
--   1. student_voter_registry table (RLS-protected)
--   2. verify_voter_for_election(election_id, matric) RPC — anon-callable
--      minimal-disclosure function: returns name + eligibility only
--   3. get_registry_summary() RPC — admin-only count function
--
-- SAFETY:
--   • Wrapped in BEGIN…COMMIT — atomic.
--   • All DDL uses IF NOT EXISTS / CREATE OR REPLACE.
--   • RLS enabled; anon role cannot read or write the table.
--   • verify_voter_for_election is SECURITY DEFINER but returns only
--     name and eligibility — never PII beyond the name the student
--     already knows belongs to their matric.
-- ====================================================================

BEGIN;

-- ====================================================================
-- 1. STUDENT VOTER REGISTRY TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.student_voter_registry (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  matric_number text        NOT NULL,
  matric_norm   text        NOT NULL,       -- normalised: UPPER + no spaces
  full_name     text        NOT NULL,
  department    text        NOT NULL DEFAULT 'Biochemistry',
  level         text,                       -- '100 Level', '200 Level', etc.
  is_active     boolean     NOT NULL DEFAULT true,
  import_batch  text,                       -- label / timestamp of import run
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- Uniqueness enforced on the normalised matric so that minor
  -- formatting variations (spaces, casing) cannot create duplicates.
  CONSTRAINT student_voter_registry_matric_norm_key UNIQUE (matric_norm)
);

-- Index for fast name / matric searches from the admin UI
CREATE INDEX IF NOT EXISTS idx_svr_matric_norm  ON public.student_voter_registry (matric_norm);
CREATE INDEX IF NOT EXISTS idx_svr_department   ON public.student_voter_registry (department);
CREATE INDEX IF NOT EXISTS idx_svr_level        ON public.student_voter_registry (level);
CREATE INDEX IF NOT EXISTS idx_svr_is_active    ON public.student_voter_registry (is_active);
CREATE INDEX IF NOT EXISTS idx_svr_full_name    ON public.student_voter_registry USING gin(to_tsvector('simple', full_name));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_svr_updated_at ON public.student_voter_registry;
CREATE TRIGGER trg_svr_updated_at
  BEFORE UPDATE ON public.student_voter_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ====================================================================
-- 2. RLS ON student_voter_registry
-- ====================================================================

ALTER TABLE public.student_voter_registry ENABLE ROW LEVEL SECURITY;

-- Drop any stale policies first (idempotent)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_voter_registry'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_voter_registry', r.policyname);
  END LOOP;
END $$;

-- Any admin can read (for the registry management UI)
CREATE POLICY "registry: admin read"
  ON public.student_voter_registry FOR SELECT TO authenticated
  USING (public.is_any_admin());

-- Only super_admin can insert / update / delete
CREATE POLICY "registry: super_admin insert"
  ON public.student_voter_registry FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "registry: super_admin update"
  ON public.student_voter_registry FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "registry: super_admin delete"
  ON public.student_voter_registry FOR DELETE TO authenticated
  USING (public.is_super_admin());


-- ====================================================================
-- 3. verify_voter_for_election(p_election_id, p_matric)
--    Minimal-disclosure RPC callable by anon voters.
--    Returns: { found, name, is_eligible }
--    Does NOT expose the full registry row.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.verify_voter_for_election(
  p_election_id  uuid,
  p_matric       text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm   text;
  v_name   text;
  v_elig   boolean;
BEGIN
  -- Normalise using same logic as submit_election_ballot
  v_norm := REGEXP_REPLACE(UPPER(TRIM(coalesce(p_matric, ''))), '\s+', '', 'g');

  IF length(v_norm) < 5 THEN
    RETURN jsonb_build_object('found', false, 'error', 'Invalid matriculation number format.');
  END IF;

  -- Lookup in election_voters for this specific election
  SELECT ev.full_name, ev.is_eligible
  INTO   v_name, v_elig
  FROM   public.election_voters ev
  WHERE  ev.election_id  = p_election_id
    AND  UPPER(TRIM(ev.matric_number)) = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found',       true,
    'name',        coalesce(v_name, 'Accredited Student'),
    'is_eligible', coalesce(v_elig, false)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('found', false, 'error', 'Verification failed. Please try again.');
END;
$$;

REVOKE ALL ON FUNCTION public.verify_voter_for_election(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_voter_for_election(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.verify_voter_for_election(uuid, text) FROM authenticated;
-- anon needs execute: voters are not logged-in
GRANT EXECUTE ON FUNCTION public.verify_voter_for_election(uuid, text) TO anon, authenticated;


-- ====================================================================
-- 4. get_registry_summary() — admin-only stats
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_registry_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total   int;
  v_active  int;
  v_dept    jsonb;
BEGIN
  -- Auth check
  IF NOT EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()) THEN
    RETURN jsonb_build_object('error', 'Access denied.');
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
  INTO   v_total, v_active
  FROM   public.student_voter_registry;

  SELECT jsonb_object_agg(department, cnt)
  INTO   v_dept
  FROM (
    SELECT department, COUNT(*) AS cnt
    FROM   public.student_voter_registry
    GROUP  BY department
  ) x;

  RETURN jsonb_build_object(
    'total',    coalesce(v_total, 0),
    'active',   coalesce(v_active, 0),
    'by_dept',  coalesce(v_dept, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_registry_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_registry_summary() FROM anon;
REVOKE ALL ON FUNCTION public.get_registry_summary() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_registry_summary() TO authenticated;


COMMIT;
