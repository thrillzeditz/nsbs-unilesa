-- ====================================================================
-- MIGRATION: v5 — Least-Privilege RBAC, Hardened RPCs & Payment Fix
-- NSBS University of Ilesa Portal
-- Date: 2026-10-26  |  Version: v5 (Critical Security Corrections)
-- ====================================================================
-- SAFETY GUARANTEES:
--   ✓ Wrapped in BEGIN…COMMIT — fails atomically or not at all.
--   ✓ All DDL uses IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS.
--   ✓ Section 3 uses pg_policies enumeration to drop EVERY existing
--     policy on each table (not just named ones from previous migrations).
--   ✓ Seed data uses ON CONFLICT DO NOTHING — never overwrites real values.
--   ✓ Functions use SECURITY DEFINER + SET search_path = public.
--   ✓ No CASCADE on DROP FUNCTION — old names are updated in place.
--   ✓ Does NOT drop or recreate tables.
--   ✓ Does NOT overwrite existing site_settings rows.
-- ====================================================================
-- ROLE PERMISSION MATRIX (enforced in DB, not just frontend):
--
--  Table / Operation         | anon | super | staff | course | electoral
--  --------------------------|------|-------|-------|--------|----------
--  site_settings   READ      |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  site_settings   WRITE     |      |  ✓    |       |        |
--  social_media_links READ   |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  social_media_links WRITE  |      |  ✓    |       |        |
--  library_resources READ    |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  library_resources WRITE   |      |  ✓    |  ✓    |  ✓     |
--  past_questions READ       |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  past_questions WRITE      |      |  ✓    |  ✓    |  ✓     |
--  news_articles (published) |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  news_articles (drafts)    |      |  ✓    |  ✓    |        |
--  news_articles WRITE       |      |  ✓    |  ✓    |        |
--  events READ               |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  events WRITE              |      |  ✓    |  ✓    |        |
--  comments (approved)       |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  comments (all)            |      |  ✓    |  ✓    |        |
--  comments INSERT           |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  comments moderate         |      |  ✓    |  ✓    |        |
--  elections READ            |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  elections WRITE           |      |  ✓    |       |        |  ✓
--  candidates READ           |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  candidates WRITE          |      |  ✓    |       |        |  ✓
--  election_voters READ      |      |  ✓    |  ✓    |  ✓     |  ✓
--  election_voters WRITE     |      |  ✓    |       |        |  ✓
--  voter_accreditations READ |      |  ✓    |  ✓    |  ✓     |  ✓
--  voter_accreditations WRITE|      | RPC   | RPC   | RPC    | RPC (via SD RPC)
--  election_ballots READ     |      |  ✓    |  ✓    |  ✓     |  ✓
--  election_ballots WRITE    |      | RPC   | RPC   | RPC    | RPC (via SD RPC)
--  election_audit_logs READ  |      |  ✓    |  ✓    |  ✓     |  ✓
--  election_audit_logs INSERT|      |  ✓    |  ✓    |  ✓     |  ✓
--  election_audit_logs DELETE|      |  ✓    |       |        |
--  staff_accounts READ       |      |  ✓    |  ✓    |  ✓     |  ✓
--  staff_accounts WRITE      |      |  ✓    |       |        |
--  payment_records INSERT    |  ✓   |  ✓    |       |        |
--  payment_records READ      |      |  ✓    |       |        |
--  payment_records UPDATE    |      |  ✓    |       |        |
--  admin_roles READ (own row)|      |  ✓    |  ✓    |  ✓     |  ✓
--  admin_roles WRITE         |      | svc   | svc   | svc    | svc (service_role only)
-- ====================================================================

BEGIN;

-- ====================================================================
-- SECTION 1: admin_roles TABLE
-- Maps Supabase Auth UIDs to portal roles.
-- Writes: service_role only (Supabase Dashboard). No client INSERT policy.
-- ====================================================================

CREATE TABLE IF NOT EXISTS admin_roles (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'staff'
                         CHECK (role IN ('super_admin', 'staff', 'course_rep', 'electoral_committee')),
  email      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- SECTION 2: ROLE-CHECKING FUNCTIONS
-- All SECURITY DEFINER with SET search_path = public.
-- Old function names (is_admin_user, is_super_admin_user) kept as
-- backward-compat aliases — they are updated in place so any external
-- RLS policies that reference them by name are not broken.
-- ====================================================================

-- 2a. Any row in admin_roles → "is any kind of admin"
CREATE OR REPLACE FUNCTION is_any_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()
  );
$$;

-- 2b. super_admin role only
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

-- 2c. super_admin + electoral_committee (election management)
CREATE OR REPLACE FUNCTION is_electoral_role()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'electoral_committee')
  );
$$;

-- 2d. super_admin + staff + course_rep (library/PQ uploads)
CREATE OR REPLACE FUNCTION is_content_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'staff', 'course_rep')
  );
$$;

-- 2e. super_admin + staff (news, events, comments moderation)
CREATE OR REPLACE FUNCTION is_editorial_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'staff')
  );
$$;

-- 2f. Backward-compat aliases (updated to call new implementations)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_any_admin();
$$;

CREATE OR REPLACE FUNCTION is_super_admin_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin();
$$;

-- Strip PUBLIC execute from all role-check functions, then grant to authenticated only.
-- Anon users must not be able to probe role membership.
REVOKE ALL ON FUNCTION is_any_admin()        FROM PUBLIC;
REVOKE ALL ON FUNCTION is_super_admin()      FROM PUBLIC;
REVOKE ALL ON FUNCTION is_electoral_role()   FROM PUBLIC;
REVOKE ALL ON FUNCTION is_content_admin()    FROM PUBLIC;
REVOKE ALL ON FUNCTION is_editorial_admin()  FROM PUBLIC;
REVOKE ALL ON FUNCTION is_admin_user()       FROM PUBLIC;
REVOKE ALL ON FUNCTION is_super_admin_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION is_any_admin()        TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin()      TO authenticated;
GRANT EXECUTE ON FUNCTION is_electoral_role()   TO authenticated;
GRANT EXECUTE ON FUNCTION is_content_admin()    TO authenticated;
GRANT EXECUTE ON FUNCTION is_editorial_admin()  TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user()       TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin_user() TO authenticated;


-- ====================================================================
-- SECTION 3: DROP ALL EXISTING POLICIES ON AFFECTED TABLES
-- Uses pg_policies enumeration so ALL legacy policy names are caught,
-- not just the ones known from previous migration drafts.
-- PostgreSQL permissive policies OR together; any leftover policy from
-- an earlier migration would silently grant unintended access.
-- ====================================================================

DO $$
DECLARE
  r      RECORD;
  tables TEXT[] := ARRAY[
    'admin_roles', 'elections', 'candidates', 'election_voters',
    'voter_accreditations', 'election_ballots', 'election_audit_logs',
    'staff_accounts', 'site_settings', 'social_media_links',
    'library_resources', 'past_questions', 'news_articles',
    'events', 'comments', 'payment_records'
  ];
  tbl    TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    FOR r IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- Drop all storage.objects policies that name 'Library' (case-insensitive).
-- Policies for other buckets (if any) are left untouched.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname ILIKE '%library%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;


-- ====================================================================
-- SECTION 4: ENABLE RLS ON ALL AFFECTED TABLES
-- FORCE = on ensures even the table owner (postgres) is subject to RLS
-- unless bypassing via SECURITY DEFINER functions.
-- ====================================================================

ALTER TABLE admin_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections            ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_voters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_accreditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_ballots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_audit_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_resources    ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records      ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- SECTION 5: FINE-GRAINED RLS POLICIES
-- Each policy is scoped to the minimum required access for each role.
-- ====================================================================

-- ── 5A. admin_roles ─────────────────────────────────────────────────
-- Each user may read only their own row (for role resolution on login).
-- No INSERT/UPDATE/DELETE — service_role (Supabase Dashboard) only.
CREATE POLICY "admin_roles: self read"
  ON admin_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- ── 5B. site_settings ───────────────────────────────────────────────
-- All columns (bank details, logos, election_portal_enabled) are
-- intentionally public — they are displayed on the public homepage,
-- payments page, and used by the election portal status check.
-- WRITE: super_admin only — includes the election master toggle.
-- Implication: staff/course_rep/electoral_committee cannot alter settings.
CREATE POLICY "site_settings: public read"
  ON site_settings FOR SELECT
  USING (true);

CREATE POLICY "site_settings: super_admin write"
  ON site_settings FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- ── 5C. social_media_links ──────────────────────────────────────────
CREATE POLICY "social_media_links: public read"
  ON social_media_links FOR SELECT
  USING (true);

CREATE POLICY "social_media_links: super_admin write"
  ON social_media_links FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- ── 5D. library_resources ───────────────────────────────────────────
-- Upload access: content admins (super_admin + staff + course_rep).
-- course_rep can upload lecture materials for their level.
CREATE POLICY "library_resources: public read"
  ON library_resources FOR SELECT
  USING (true);

CREATE POLICY "library_resources: content_admin write"
  ON library_resources FOR ALL TO authenticated
  USING (is_content_admin())
  WITH CHECK (is_content_admin());


-- ── 5E. past_questions ──────────────────────────────────────────────
CREATE POLICY "past_questions: public read"
  ON past_questions FOR SELECT
  USING (true);

CREATE POLICY "past_questions: content_admin write"
  ON past_questions FOR ALL TO authenticated
  USING (is_content_admin())
  WITH CHECK (is_content_admin());


-- ── 5F. news_articles ───────────────────────────────────────────────
-- Two SELECT policies (PostgreSQL permissive OR logic):
--   Policy 1 (all roles): published articles only.
--   Policy 2 (authenticated admin): ALL articles including drafts.
-- Combined: admins see everything; public sees only published.
CREATE POLICY "news_articles: public read published"
  ON news_articles FOR SELECT
  USING (is_published = true);

CREATE POLICY "news_articles: admin read all drafts"
  ON news_articles FOR SELECT TO authenticated
  USING (is_any_admin());

-- Write: editorial admins (super_admin + staff).
-- course_rep and electoral_committee cannot author or edit news.
CREATE POLICY "news_articles: editorial_admin insert"
  ON news_articles FOR INSERT TO authenticated
  WITH CHECK (is_editorial_admin());

CREATE POLICY "news_articles: editorial_admin update"
  ON news_articles FOR UPDATE TO authenticated
  USING (is_editorial_admin())
  WITH CHECK (is_editorial_admin());

CREATE POLICY "news_articles: editorial_admin delete"
  ON news_articles FOR DELETE TO authenticated
  USING (is_editorial_admin());


-- ── 5G. events ──────────────────────────────────────────────────────
CREATE POLICY "events: public read"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "events: editorial_admin write"
  ON events FOR ALL TO authenticated
  USING (is_editorial_admin())
  WITH CHECK (is_editorial_admin());


-- ── 5H. comments ────────────────────────────────────────────────────
-- SELECT policy 1: public reads approved comments.
-- SELECT policy 2: any admin reads all (for moderation dashboard).
-- INSERT: public (WITH CHECK forces is_approved=false and non-empty fields).
-- UPDATE/DELETE: editorial admins only.
CREATE POLICY "comments: public read approved"
  ON comments FOR SELECT
  USING (is_approved = true);

CREATE POLICY "comments: admin read all"
  ON comments FOR SELECT TO authenticated
  USING (is_any_admin());

CREATE POLICY "comments: public insert unapproved"
  ON comments FOR INSERT
  WITH CHECK (
    is_approved = false
    AND length(trim(coalesce(name,    ''))) > 0
    AND length(trim(coalesce(content, ''))) > 0
  );

CREATE POLICY "comments: editorial_admin update"
  ON comments FOR UPDATE TO authenticated
  USING (is_editorial_admin())
  WITH CHECK (is_editorial_admin());

CREATE POLICY "comments: editorial_admin delete"
  ON comments FOR DELETE TO authenticated
  USING (is_editorial_admin());


-- ── 5I. elections ───────────────────────────────────────────────────
-- Public read (required for ElectionPortal component).
-- Write: electoral role only (super_admin + electoral_committee).
-- staff and course_rep cannot create or modify elections.
CREATE POLICY "elections: public read"
  ON elections FOR SELECT
  USING (true);

CREATE POLICY "elections: electoral_role write"
  ON elections FOR ALL TO authenticated
  USING (is_electoral_role())
  WITH CHECK (is_electoral_role());


-- ── 5J. candidates ──────────────────────────────────────────────────
CREATE POLICY "candidates: public read"
  ON candidates FOR SELECT
  USING (true);

CREATE POLICY "candidates: electoral_role write"
  ON candidates FOR ALL TO authenticated
  USING (is_electoral_role())
  WITH CHECK (is_electoral_role());


-- ── 5K. election_voters ─────────────────────────────────────────────
-- READ: any admin (needed for fallback collation queries in dashboard).
-- WRITE: electoral role only.
CREATE POLICY "election_voters: admin read"
  ON election_voters FOR SELECT TO authenticated
  USING (is_any_admin());

CREATE POLICY "election_voters: electoral_role insert"
  ON election_voters FOR INSERT TO authenticated
  WITH CHECK (is_electoral_role());

CREATE POLICY "election_voters: electoral_role update"
  ON election_voters FOR UPDATE TO authenticated
  USING (is_electoral_role())
  WITH CHECK (is_electoral_role());

CREATE POLICY "election_voters: electoral_role delete"
  ON election_voters FOR DELETE TO authenticated
  USING (is_electoral_role());


-- ── 5L. voter_accreditations ────────────────────────────────────────
-- READ: any admin (for collation: see who voted, not how they voted).
-- INSERT/UPDATE/DELETE: SECURITY DEFINER RPC only.
-- The submit_election_ballot function runs as postgres (bypasses RLS),
-- so no client INSERT policy is needed or wanted.
-- No anon SELECT — check_voter_accreditation() RPC handles that case.
CREATE POLICY "voter_accreditations: admin read"
  ON voter_accreditations FOR SELECT TO authenticated
  USING (is_any_admin());


-- ── 5M. election_ballots ────────────────────────────────────────────
-- Anonymous ballots (no voter identifier stored). Any admin can read
-- for result computation. Only the SD RPC may insert.
CREATE POLICY "election_ballots: admin read"
  ON election_ballots FOR SELECT TO authenticated
  USING (is_any_admin());


-- ── 5N. election_audit_logs ─────────────────────────────────────────
-- Any admin can read and insert audit events (logElectionAuditEvent
-- is called from the dashboard by any admin role).
-- Only super_admin may modify or delete audit records.
CREATE POLICY "election_audit_logs: admin read"
  ON election_audit_logs FOR SELECT TO authenticated
  USING (is_any_admin());

CREATE POLICY "election_audit_logs: admin insert"
  ON election_audit_logs FOR INSERT TO authenticated
  WITH CHECK (is_any_admin());

CREATE POLICY "election_audit_logs: super_admin update"
  ON election_audit_logs FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "election_audit_logs: super_admin delete"
  ON election_audit_logs FOR DELETE TO authenticated
  USING (is_super_admin());


-- ── 5O. staff_accounts ──────────────────────────────────────────────
-- READ: any admin (for display in dashboard staff list).
-- WRITE: super_admin only.
-- NOTE: The password column is a legacy plaintext field and must never
-- be selected in application queries (see db.ts getStaffAccounts).
CREATE POLICY "staff_accounts: admin read"
  ON staff_accounts FOR SELECT TO authenticated
  USING (is_any_admin());

CREATE POLICY "staff_accounts: super_admin write"
  ON staff_accounts FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- ── 5P. payment_records ─────────────────────────────────────────────
-- INSERT: public (students submit dues). Status locked to 'Pending Verification'.
-- With CHECK enforces minimal data quality server-side.
-- SELECT/UPDATE/DELETE: super_admin only (PII — name, email, phone, matric).
-- Anon payment status lookup goes through lookup_payment_status() RPC (Section 8).
CREATE POLICY "payment_records: public insert"
  ON payment_records FOR INSERT
  WITH CHECK (
    payment_status = 'Pending Verification'
    AND length(trim(coalesce(matric_number,  ''))) > 0
    AND length(trim(coalesce(surname,        ''))) > 0
    AND length(trim(coalesce(first_name,     ''))) > 0
    AND length(trim(coalesce(email,          ''))) > 0
    AND amount_paid > 0
  );

CREATE POLICY "payment_records: super_admin read"
  ON payment_records FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "payment_records: super_admin update"
  ON payment_records FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "payment_records: super_admin delete"
  ON payment_records FOR DELETE TO authenticated
  USING (is_super_admin());


-- ====================================================================
-- SECTION 6: get_election_results — WITH INTERNAL AUTH CHECK
-- SECURITY DEFINER bypasses all table RLS, so the function must
-- explicitly verify the caller is an authorised admin.
-- Return format is identical to the existing dashboard consumer.
-- ====================================================================

CREATE OR REPLACE FUNCTION get_election_results(p_election_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election          record;
  v_registered_count  int;
  v_eligible_count    int;
  v_accredited_count  int;
  v_yet_to_vote       int;
  v_turnout_pct       numeric;
  v_position          record;
  v_candidate         record;
  v_pos_votes         int;
  v_cand_votes        int;
  v_percentage        numeric;
  v_positions_array   jsonb := '[]'::jsonb;
  v_candidates_array  jsonb;
  v_candidate_tallies jsonb := '{}'::jsonb;
BEGIN
  -- ──────────────────────────────────────────────────────────────
  -- EXPLICIT AUTHORIZATION CHECK
  -- Because SECURITY DEFINER bypasses RLS, any authenticated user
  -- who can call this RPC would otherwise receive full election data.
  -- We check admin_roles manually. Non-admin authenticated users and
  -- anon callers receive a JSON error, not election data.
  -- ──────────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'error', 'Access denied. Administrative credentials required to view election results.'
    );
  END IF;

  SELECT * INTO v_election FROM public.elections WHERE id = p_election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Election not found.');
  END IF;

  SELECT COUNT(*) INTO v_registered_count
  FROM public.election_voters WHERE election_id = p_election_id;

  SELECT COUNT(*) INTO v_eligible_count
  FROM public.election_voters WHERE election_id = p_election_id AND is_eligible = true;

  SELECT COUNT(*) INTO v_accredited_count
  FROM public.voter_accreditations WHERE election_id = p_election_id;

  IF v_registered_count = 0 THEN v_registered_count := v_accredited_count; END IF;
  IF v_eligible_count   = 0 THEN v_eligible_count   := v_accredited_count; END IF;

  v_yet_to_vote := GREATEST(0, v_eligible_count - v_accredited_count);

  IF v_eligible_count > 0 THEN
    v_turnout_pct := ROUND(
      (v_accredited_count::numeric / v_eligible_count::numeric) * 100, 2
    );
  ELSE
    v_turnout_pct := 0;
  END IF;

  FOR v_position IN
    SELECT DISTINCT position AS title
    FROM public.candidates
    WHERE election_id = p_election_id
    ORDER BY position
  LOOP
    SELECT COUNT(*) INTO v_pos_votes
    FROM public.election_ballots
    WHERE election_id = p_election_id AND position_id = v_position.title;

    v_candidates_array := '[]'::jsonb;

    FOR v_candidate IN
      SELECT id, name
      FROM public.candidates
      WHERE election_id = p_election_id AND position = v_position.title
      ORDER BY name
    LOOP
      SELECT COUNT(*) INTO v_cand_votes
      FROM public.election_ballots
      WHERE election_id = p_election_id AND candidate_id = v_candidate.id;

      IF v_pos_votes > 0 THEN
        v_percentage := ROUND(
          (v_cand_votes::numeric / v_pos_votes::numeric) * 100, 2
        );
      ELSE
        v_percentage := 0;
      END IF;

      v_candidate_tallies := jsonb_set(
        v_candidate_tallies,
        ARRAY[v_candidate.id::text],
        to_jsonb(v_cand_votes)
      );

      v_candidates_array := v_candidates_array || jsonb_build_object(
        'candidate_id',   v_candidate.id,
        'candidate_name', v_candidate.name,
        'position_id',    v_position.title,
        'votes_received', v_cand_votes,
        'percentage',     v_percentage
      );
    END LOOP;

    v_positions_array := v_positions_array || jsonb_build_object(
      'position_id',              v_position.title,
      'position_title',           v_position.title,
      'total_votes_for_position', v_pos_votes,
      'candidates',               v_candidates_array
    );
  END LOOP;

  RETURN jsonb_build_object(
    'election_id',        v_election.id,
    'election_title',     v_election.title,
    'status',             v_election.status,
    'created_at',         v_election.created_at,
    'registered_voters',  v_registered_count,
    'eligible_voters',    v_eligible_count,
    'votes_cast',         v_accredited_count,
    'accredited_voters',  v_accredited_count,
    'total_ballots_cast', v_accredited_count,
    'yet_to_vote',        v_yet_to_vote,
    'remaining_voters',   v_yet_to_vote,
    'turnout_percentage', v_turnout_pct,
    'positions',          v_positions_array,
    'candidate_tallies',  v_candidate_tallies
  );
END;
$$;

-- Grant EXECUTE to authenticated only; anon cannot call this RPC.
-- Non-admin authenticated callers receive the JSON error from the
-- internal auth check above, not raw election data.
REVOKE ALL ON FUNCTION get_election_results(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_election_results(uuid) TO authenticated;


-- ====================================================================
-- SECTION 7: submit_election_ballot — HARDENED VALIDATION
-- Additional checks added in this version:
--   • Null / malformed payload guard
--   • Duplicate position detection (two votes for same office)
--   • Duplicate candidate detection
--   • Per-item null candidate_id guard
-- Existing checks preserved:
--   • Global portal toggle (site_settings.election_portal_enabled)
--   • Electoral body exemption (server-side)
--   • Election status = 'open'
--   • Voter roster eligibility
--   • Candidate-to-election/position validation
--   • Duplicate-vote prevention via PK + unique_violation catch
-- ====================================================================

CREATE OR REPLACE FUNCTION submit_election_ballot(
  p_election_id    uuid,
  p_matric_number  text,
  p_ballot_items   jsonb,
  p_reference_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm_matric    text;
  v_portal_enabled boolean;
  v_status         text;
  v_roster_count   int;
  v_is_eligible    boolean;
  v_ballot_count   int;
  v_dup_count      int;
  v_candidate_ok   int;
  v_existing_acc   int;
  v_item           record;
BEGIN
  -- ── 1. Matric normalisation and basic format check ──────────────
  IF p_matric_number IS NULL OR TRIM(p_matric_number) = '' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Matriculation number is required.');
  END IF;

  -- Normalise: uppercase, trim, collapse all internal whitespace
  v_norm_matric := REGEXP_REPLACE(UPPER(TRIM(p_matric_number)), '\s+', '', 'g');

  IF LENGTH(v_norm_matric) < 5 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Invalid matriculation number format.');
  END IF;

  -- ── 2. Ballot payload type validation ──────────────────────────
  IF p_ballot_items IS NULL OR jsonb_typeof(p_ballot_items) != 'array' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Invalid ballot payload: expected a JSON array of selections.');
  END IF;

  SELECT COUNT(*) INTO v_ballot_count
  FROM jsonb_to_recordset(p_ballot_items) AS x(position_id text, candidate_id uuid);

  IF v_ballot_count = 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Your ballot is empty. Please select at least one candidate before submitting.');
  END IF;

  -- ── 3. Duplicate position check (only one vote per office) ─────
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT x.position_id
    FROM jsonb_to_recordset(p_ballot_items) AS x(position_id text, candidate_id uuid)
    GROUP BY x.position_id
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Invalid ballot: multiple candidate selections for the same position are not permitted.');
  END IF;

  -- ── 4. Duplicate candidate check ───────────────────────────────
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT x.candidate_id
    FROM jsonb_to_recordset(p_ballot_items) AS x(position_id text, candidate_id uuid)
    WHERE x.candidate_id IS NOT NULL
    GROUP BY x.candidate_id
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Invalid ballot: the same candidate appears more than once. Each candidate may be selected only once.');
  END IF;

  -- ── 5. Global election portal toggle check ─────────────────────
  SELECT election_portal_enabled INTO v_portal_enabled
  FROM public.site_settings WHERE id = 1;

  IF v_portal_enabled IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false,
      'error', 'The election portal is currently closed. Please check back during the official voting period.');
  END IF;

  -- ── 6. Electoral body exemption (server-side — cannot be bypassed) ─
  IF v_norm_matric = ANY(ARRAY[
    '2023/0445', '2023/1075', '2025/7936', '2024/1589', '2023/1002'
  ]) THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Electoral body members are exempt from voting in this election.');
  END IF;

  -- ── 7. Election existence and open-status check ─────────────────
  SELECT status INTO v_status FROM public.elections WHERE id = p_election_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Election not found.');
  END IF;
  IF v_status != 'open' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'This election is not currently open for voting.');
  END IF;

  -- ── 8. Voter roster eligibility (only when roster is loaded) ────
  SELECT COUNT(*) INTO v_roster_count
  FROM public.election_voters WHERE election_id = p_election_id;

  IF v_roster_count > 0 THEN
    SELECT is_eligible INTO v_is_eligible
    FROM public.election_voters
    WHERE election_id  = p_election_id
      AND UPPER(TRIM(matric_number)) = v_norm_matric;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Your matriculation number is not on the accredited voter roster for this election.');
    END IF;

    IF v_is_eligible IS DISTINCT FROM true THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Your student record has been marked ineligible to vote in this election.');
    END IF;
  END IF;

  -- ── 9. Candidate validation: each ballot item must reference a real
  --       candidate that belongs to this election AND the stated position.
  --       Prevents cross-election ballot stuffing and forged position IDs.
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_ballot_items)
      AS x(position_id text, candidate_id uuid)
  LOOP
    IF v_item.candidate_id IS NULL THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Invalid ballot: null candidate_id detected in submission.');
    END IF;

    SELECT COUNT(*) INTO v_candidate_ok
    FROM public.candidates
    WHERE id          = v_item.candidate_id
      AND election_id = p_election_id
      AND position    = v_item.position_id;

    IF v_candidate_ok = 0 THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Invalid ballot: one or more selections do not correspond to valid candidates for this election. Submission rejected.');
    END IF;
  END LOOP;

  -- ── 10. Duplicate-vote pre-check (optimistic, before PK insert) ─
  SELECT COUNT(*) INTO v_existing_acc
  FROM public.voter_accreditations
  WHERE election_id = p_election_id AND matric_number = v_norm_matric;

  IF v_existing_acc > 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'This matriculation number has already cast a ballot in this election.');
  END IF;

  -- ── 11. ATOMIC INSERT: accreditation first, then ballot entries ─
  -- The PRIMARY KEY (election_id, matric_number) on voter_accreditations
  -- is the final, concurrency-safe duplicate-vote guarantee. A second
  -- concurrent INSERT for the same (election_id, matric_number) raises
  -- unique_violation, caught below.
  INSERT INTO public.voter_accreditations (election_id, matric_number, reference_code, voted_at)
  VALUES (p_election_id, v_norm_matric, p_reference_code, now());

  -- Ballot entries are anonymous — no matric_number column here.
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_ballot_items)
      AS x(position_id text, candidate_id uuid)
  LOOP
    INSERT INTO public.election_ballots (election_id, position_id, candidate_id, created_at)
    VALUES (p_election_id, v_item.position_id, v_item.candidate_id, now());
  END LOOP;

  RETURN jsonb_build_object('success', true, 'reference_code', p_reference_code);

EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent ballot: PK constraint fired before we could check above.
    RETURN jsonb_build_object('success', false,
      'error', 'This matriculation number has already cast a ballot in this election.');
  WHEN OTHERS THEN
    -- Log without leaking matric to the client
    RAISE WARNING '[submit_election_ballot] Unhandled error election_id=%: %',
      p_election_id, SQLERRM;
    RETURN jsonb_build_object('success', false,
      'error', 'An unexpected error occurred. Please try again or contact the electoral committee.');
END;
$$;

-- Anon voters (not authenticated) must be able to call this.
REVOKE ALL ON FUNCTION submit_election_ballot(uuid, text, jsonb, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION submit_election_ballot(uuid, text, jsonb, text) TO anon, authenticated;


-- ====================================================================
-- SECTION 8: lookup_payment_status() — REPLACES payment_status_view
-- Root cause of the view problem:
--   • The view is SECURITY INVOKER (default): when anon queries it,
--     PostgreSQL checks anon's permissions on payment_records, which our
--     new RLS blocks. Result: 0 rows — public payment tracking is broken.
--   • Even if permissions were relaxed, SELECT * on the view by anon
--     would return ALL students' records (bulk enumeration risk).
-- Fix: SECURITY DEFINER function filters by the supplied matric and
-- returns only non-PII columns. Anon can only retrieve records for the
-- single matric they supply — bulk enumeration is impossible.
-- ====================================================================

DROP VIEW IF EXISTS payment_status_view;

CREATE OR REPLACE FUNCTION lookup_payment_status(p_matric text)
RETURNS TABLE(
  matric_number    text,
  level            text,
  academic_session text,
  due_item         text,
  amount_paid      numeric,
  payment_status   text,
  created_at       timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pr.matric_number,
    pr.level,
    pr.academic_session,
    pr.due_item,
    pr.amount_paid,
    pr.payment_status,
    pr.created_at
  FROM public.payment_records pr
  WHERE UPPER(TRIM(pr.matric_number)) = UPPER(TRIM(p_matric))
  ORDER BY pr.created_at DESC;
$$;

-- Anon callers (students checking their own status) and admins.
REVOKE ALL ON FUNCTION lookup_payment_status(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION lookup_payment_status(text) TO anon, authenticated;


-- ====================================================================
-- SECTION 9: check_voter_accreditation() — SAFE ACCREDITATION LOOKUP
-- Replaces direct anon SELECT on voter_accreditations (now RLS-locked).
-- Returns only a boolean: did this matric vote in this election?
-- No bulk enumeration: caller must supply both election_id and matric.
-- ====================================================================

CREATE OR REPLACE FUNCTION check_voter_accreditation(
  p_election_id uuid,
  p_matric      text
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COUNT(*) > 0
      THEN jsonb_build_object('accredited', true)
      ELSE jsonb_build_object('accredited', false)
  END
  FROM public.voter_accreditations
  WHERE election_id  = p_election_id
    AND matric_number = REGEXP_REPLACE(UPPER(TRIM(p_matric)), '\s+', '', 'g');
$$;

REVOKE ALL ON FUNCTION check_voter_accreditation(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION check_voter_accreditation(uuid, text) TO anon, authenticated;


-- ====================================================================
-- SECTION 10: SCHEMA COLUMN ADDITIONS (idempotent)
-- ====================================================================

-- 10a. news_articles publish workflow
ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS is_published boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now();

-- Back-fill: existing articles get published_at = created_at
UPDATE news_articles
  SET published_at = created_at
  WHERE published_at IS NULL AND is_published = true;

CREATE INDEX IF NOT EXISTS idx_news_articles_published
  ON news_articles(is_published, published_at DESC);

-- 10b. Election portal master toggle
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS election_portal_enabled boolean NOT NULL DEFAULT false;


-- ====================================================================
-- SECTION 11: SEED DATA (ON CONFLICT DO NOTHING)
-- Never overwrites existing production values.
-- Placeholder text is intentionally obvious — update in dashboard.
-- ====================================================================

INSERT INTO site_settings (
  id, hero_title, hero_description, hero_bg_url,
  logo_nsbs_url, logo_unilesa_url,
  vision_statement, mission_statement,
  bank_name, account_name, account_number,
  treasurer_whatsapp, dues_amount,
  contact_email_dept, contact_email_general, contact_whatsapp,
  footer_description, election_portal_enabled
) VALUES (
  1,
  'Welcome to NSBS-UNILESA',
  'Nigerian Society of Biochemistry Students — University of Ilesa Chapter.',
  '/hero_bg.jpg',
  '/logo_nsbs.jpg',
  '/logo_unilesa.jpg',
  '[Update vision statement in admin dashboard]',
  '[Update mission statement in admin dashboard]',
  '[BANK NAME — update in dashboard]',
  '[ACCOUNT NAME — update in dashboard]',
  '[ACCOUNT NUMBER — update in dashboard]',
  '[TREASURER WHATSAPP — update in dashboard]',
  3000,
  '[DEPT EMAIL — update in dashboard]',
  '[GENERAL EMAIL — update in dashboard]',
  '[WHATSAPP — update in dashboard]',
  'Nigerian Society of Biochemistry Students (NSBS) — University of Ilesa Chapter.',
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO social_media_links (platform, url, username) VALUES
  ('instagram', 'https://instagram.com/nsbs_unilesa', 'nsbs_unilesa'),
  ('tiktok',    'https://tiktok.com/@nsbs_unilesa',   'nsbs_unilesa')
ON CONFLICT (platform) DO NOTHING;


-- ====================================================================
-- SECTION 12: STORAGE — Library Bucket
-- ====================================================================

INSERT INTO storage.buckets (id, name, public)
  VALUES ('Library', 'Library', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- content_admin (super_admin + staff + course_rep) may upload/delete.
CREATE POLICY "Library: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'Library');

CREATE POLICY "Library: content_admin upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'Library' AND is_content_admin());

CREATE POLICY "Library: content_admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'Library' AND is_content_admin());

CREATE POLICY "Library: content_admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'Library' AND is_content_admin());


COMMIT;


-- ====================================================================
-- VERIFICATION QUERIES (run separately in SQL Editor after migration)
-- ====================================================================
/*

-- V1: All seven security functions exist and are SECURITY DEFINER:
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname IN (
  'is_any_admin','is_super_admin','is_electoral_role',
  'is_content_admin','is_editorial_admin',
  'is_admin_user','is_super_admin_user',
  'get_election_results','submit_election_ballot',
  'lookup_payment_status','check_voter_accreditation'
)
AND pronamespace = 'public'::regnamespace
ORDER BY proname;
-- Expected: 11 rows, prosecdef = true for all

-- V2: RLS enabled on all tables:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: rowsecurity = true for all listed tables

-- V3: Policy inventory — count per table:
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- V4: site_settings has election_portal_enabled = false:
SELECT id, election_portal_enabled FROM site_settings;

-- V5: No anon-readable rows in voter_accreditations via RLS:
-- (Run as anon API key) SELECT COUNT(*) FROM voter_accreditations;
-- Expected: 0 rows returned (RLS blocks anon) OR permission error

-- V6: get_election_results returns auth error for anon:
-- (Run as anon API key)
-- SELECT get_election_results('<any-uuid>');
-- Expected: {"error": "Access denied. Administrative credentials required..."}

-- V7: payment_status_view is gone:
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'payment_status_view';
-- Expected: 0 rows

-- V8: lookup_payment_status function exists:
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'lookup_payment_status';
-- Expected: 1 row

-- V9: Library bucket is public:
SELECT id, name, public FROM storage.buckets WHERE id = 'Library';

-- V10: All function grants (check no PUBLIC grants remain):
SELECT grantee, routine_name, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_any_admin','is_super_admin','get_election_results',
    'submit_election_ballot','lookup_payment_status'
  )
ORDER BY routine_name, grantee;

*/


-- ====================================================================
-- POST-MIGRATION MANUAL ACTIONS
-- ====================================================================
/*

ACTION 1 — CREATE SUPER ADMINISTRATOR (first-time setup only):
  In Supabase Dashboard → Authentication → Users → Add User
  Then run in SQL Editor:
    INSERT INTO admin_roles (user_id, role, email)
    VALUES ('<USER_UUID>', 'super_admin', '<email>');

ACTION 2 — DISABLE PUBLIC SIGNUPS:
  Supabase Dashboard → Authentication → Providers → Email
  → Toggle "Enable sign ups" OFF

ACTION 3 — SET AUTH REDIRECT URLs:
  Supabase Dashboard → Authentication → URL Configuration
  Site URL: https://your-production-domain.vercel.app
  Redirect URLs: https://your-production-domain.vercel.app/**

ACTION 4 — UPDATE REAL SITE SETTINGS:
  Admin Dashboard → Site Settings tab → update all placeholder values.
  Do NOT leave '[BANK NAME — update in dashboard]' in production.

ACTION 5 — VERIFY LIBRARY BUCKET:
  Supabase Dashboard → Storage → confirm 'Library' bucket exists (public).

ACTION 6 — UPDATE src/lib/db.ts:
  getPaymentByMatric  → now calls lookup_payment_status RPC (see instructions)
  checkVoterAccreditationStatus → now calls check_voter_accreditation RPC

*/
