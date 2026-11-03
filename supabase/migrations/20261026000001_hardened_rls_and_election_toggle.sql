-- ====================================================================
-- MIGRATION: v6 — Security Audit Corrections (2026-10-26)
-- NSBS University of Ilesa Portal
-- Supersedes: 20261013000001, 20261016000001, and the previous v5 draft
--             of this file.  Apply ONLY this migration; do not also apply
--             the two earlier files.
-- ====================================================================
-- SAFETY GUARANTEES:
--   ✓ Wrapped in BEGIN…COMMIT — atomic; rolls back entirely on any error.
--   ✓ All DDL uses IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS.
--   ✓ Section 3 enumerates pg_policies to drop EVERY existing policy on
--     each affected table (not only the named ones from previous drafts).
--   ✓ Section 3 drops ALL storage.objects policies so that broad policies
--     (USING true / no bucket filter) cannot grant unintended Library access.
--     ⚠ If other storage buckets exist, recreate their policies manually.
--   ✓ Seed data uses ON CONFLICT DO NOTHING — never overwrites real values.
--   ✓ SECURITY DEFINER functions use SET search_path = public.
--   ✓ Every role-checking function explicitly REVOKES from PUBLIC and anon
--     before granting to authenticated.
--   ✓ Plaintext password column is excluded from authenticated SELECT grant
--     on staff_accounts (column-level privilege, defense-in-depth).
--   ✓ Election portal toggle defaults to false and is never overwritten.
--   ✓ Voter roster is mandatory; empty roster = rejected ballot.
--   ✓ check_voter_accreditation RPC removed — voter enumeration is closed.
--   ✓ Payment lookup requires matric + email (two-factor).
-- ====================================================================
-- ROLE PERMISSION MATRIX:
--
--  Table / Operation          | anon | super | staff | course | electoral
--  ---------------------------|------|-------|-------|--------|----------
--  site_settings   READ       |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  site_settings   WRITE      |      |  ✓    |       |        |
--  social_media_links READ    |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  social_media_links WRITE   |      |  ✓    |       |        |
--  library_resources READ     |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  library_resources WRITE    |      |  ✓    |  ✓    |  ✓     |
--  past_questions READ        |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  past_questions WRITE       |      |  ✓    |  ✓    |  ✓     |
--  news_articles (published)  |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  news_articles (drafts)     |      |  ✓    |  ✓    |        |
--  news_articles WRITE        |      |  ✓    |  ✓    |        |
--  events READ                |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  events WRITE               |      |  ✓    |  ✓    |        |
--  comments (approved) READ   |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  comments (all) READ        |      |  ✓    |  ✓    |  ✓     |  ✓
--  comments INSERT            |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  comments moderate          |      |  ✓    |  ✓    |        |
--  elections READ             |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  elections WRITE            |      |  ✓    |       |        |  ✓
--  candidates READ            |  ✓   |  ✓    |  ✓    |  ✓     |  ✓
--  candidates WRITE           |      |  ✓    |       |        |  ✓
--  election_voters READ       |      |  ✓    |  ✓    |  ✓     |  ✓
--  election_voters WRITE      |      |  ✓    |       |        |  ✓
--  voter_accreditations READ  |      |  ✓    |  ✓    |  ✓     |  ✓
--  voter_accreditations WRITE |      | RPC   | RPC   | RPC    | RPC
--  election_ballots READ      |      |  ✓    |  ✓    |  ✓     |  ✓
--  election_ballots WRITE     |      | RPC   | RPC   | RPC    | RPC
--  election_audit_logs READ   |      |  ✓    |  ✓    |  ✓     |  ✓
--  election_audit_logs INSERT |      |  ✓    |  ✓    |  ✓     |  ✓
--  election_audit_logs DELETE |      |  ✓    |       |        |
--  staff_accounts READ (safe) |      |  ✓    |  ✓    |  ✓     |  ✓
--  staff_accounts WRITE       |      |  ✓    |       |        |
--  payment_records INSERT     |  ✓   |  ✓    |       |        |
--  payment_records READ       |      |  ✓    |       |        |
--  payment_records UPDATE     |      |  ✓    |       |        |
--  admin_roles READ (own row) |      |  ✓    |  ✓    |  ✓     |  ✓
--  admin_roles WRITE          |      | svc   | svc   | svc    | svc
-- ====================================================================

BEGIN;

-- ====================================================================
-- SECTION 1: admin_roles TABLE
-- Maps Supabase Auth UIDs to portal roles.
-- Writes: service_role only (Supabase Dashboard).
-- ====================================================================

CREATE TABLE IF NOT EXISTS admin_roles (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'staff'
                         CHECK (role IN ('super_admin','staff','course_rep','electoral_committee')),
  email      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- SECTION 2: ROLE-CHECKING HELPER FUNCTIONS
-- All are SECURITY DEFINER with SET search_path = public.
-- Each function explicitly REVOKES execute from both PUBLIC and anon
-- before granting only to authenticated.  A prior migration that ran
-- GRANT EXECUTE ... TO anon cannot be corrected by REVOKE FROM PUBLIC
-- alone — the explicit REVOKE FROM anon is required.
-- ====================================================================

-- 2a. Any row in admin_roles → the caller is some kind of admin
CREATE OR REPLACE FUNCTION is_any_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid());
$$;

-- 2b. super_admin role only
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.admin_roles
                WHERE user_id = auth.uid() AND role = 'super_admin');
$$;

-- 2c. super_admin + electoral_committee (election management)
CREATE OR REPLACE FUNCTION is_electoral_role()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.admin_roles
                WHERE user_id = auth.uid()
                  AND role IN ('super_admin','electoral_committee'));
$$;

-- 2d. super_admin + staff + course_rep (library/PQ uploads)
CREATE OR REPLACE FUNCTION is_content_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.admin_roles
                WHERE user_id = auth.uid()
                  AND role IN ('super_admin','staff','course_rep'));
$$;

-- 2e. super_admin + staff (news/events/comments moderation)
CREATE OR REPLACE FUNCTION is_editorial_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.admin_roles
                WHERE user_id = auth.uid()
                  AND role IN ('super_admin','staff'));
$$;

-- 2f. Backward-compat aliases (updated in-place so any surviving RLS
--     policies that reference old names continue to work correctly).
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_any_admin();
$$;

CREATE OR REPLACE FUNCTION is_super_admin_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin();
$$;

-- Explicitly revoke from PUBLIC (covers the default grant created at
-- function-definition time) AND from anon (covers any explicit grant
-- applied by an earlier migration that REVOKE FROM PUBLIC does not undo).
DO $$
DECLARE
  fns text[] := ARRAY[
    'is_any_admin()',
    'is_super_admin()',
    'is_electoral_role()',
    'is_content_admin()',
    'is_editorial_admin()',
    'is_admin_user()',
    'is_super_admin_user()'
  ];
  fn text;
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',      fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon',        fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;


-- ====================================================================
-- SECTION 3: DROP ALL EXISTING POLICIES
-- ── 3A. Public schema tables: enumerate via pg_policies. ────────────
-- This catches every policy from every previous migration, including
-- legacy "TO authenticated USING (true)" policies from the initial
-- schema and any partial fixes applied by 20261013 or 20261016.
-- ── 3B. storage.objects: drop ALL policies unconditionally. ─────────
-- A policy that uses USING (true) with no bucket_id filter grants
-- access to ALL objects in ALL buckets, including Library.  Name-based
-- filtering (ILIKE '%library%') cannot detect such policies.  Dropping
-- all storage.objects policies is therefore the only safe approach.
-- ⚠ ACTION REQUIRED: If this project has other storage buckets with
--   dedicated access-control policies, recreate those policies manually
--   in the Supabase Dashboard after this migration is applied.
-- ====================================================================

DO $$
DECLARE
  r      RECORD;
  tables text[] := ARRAY[
    'admin_roles','elections','candidates','election_voters',
    'voter_accreditations','election_ballots','election_audit_logs',
    'staff_accounts','site_settings','social_media_links',
    'library_resources','past_questions','news_articles',
    'events','comments','payment_records'
  ];
  tbl    text;
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

DO $$
DECLARE r RECORD;
BEGIN
  -- Drop ALL storage.objects policies — name-independent.
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;


-- ====================================================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY ON ALL AFFECTED TABLES
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
-- ====================================================================

-- ── 5A. admin_roles ─────────────────────────────────────────────────
-- Each user may read only their own row. No client INSERT/UPDATE/DELETE.
CREATE POLICY "admin_roles: self read"
  ON admin_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- ── 5B. site_settings ───────────────────────────────────────────────
-- All columns are intentionally public: bank details, logos, and
-- election_portal_enabled are all read by the public homepage and portal.
-- WRITE: super_admin only — this includes the election master toggle.
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
-- PostgreSQL permissive OR: admins see all rows; public sees only published.
CREATE POLICY "news_articles: public read published"
  ON news_articles FOR SELECT
  USING (is_published = true);

CREATE POLICY "news_articles: admin read all"
  ON news_articles FOR SELECT TO authenticated
  USING (is_any_admin());

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
CREATE POLICY "comments: public read approved"
  ON comments FOR SELECT
  USING (is_approved = true);

CREATE POLICY "comments: admin read all"
  ON comments FOR SELECT TO authenticated
  USING (is_any_admin());

-- DB enforces is_approved = false on all public inserts.
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
-- READ: any admin.  INSERT: SECURITY DEFINER RPC only (no client policy).
-- There is no check_voter_accreditation RPC: anon cannot probe who voted.
-- Duplicate-vote protection is entirely server-side in submit_election_ballot.
CREATE POLICY "voter_accreditations: admin read"
  ON voter_accreditations FOR SELECT TO authenticated
  USING (is_any_admin());


-- ── 5M. election_ballots ────────────────────────────────────────────
-- Ballots are anonymous (no matric stored). INSERT: SD RPC only.
CREATE POLICY "election_ballots: admin read"
  ON election_ballots FOR SELECT TO authenticated
  USING (is_any_admin());


-- ── 5N. election_audit_logs ─────────────────────────────────────────
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
-- RLS (row-level):  any admin can read; super_admin can write.
-- Column-level:     password is excluded from the SELECT grant (Section 5Z).
CREATE POLICY "staff_accounts: admin read"
  ON staff_accounts FOR SELECT TO authenticated
  USING (is_any_admin());

CREATE POLICY "staff_accounts: super_admin write"
  ON staff_accounts FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- ── 5P. payment_records ─────────────────────────────────────────────
-- INSERT: public (student dues submission; status locked to Pending).
-- SELECT/UPDATE: super_admin only (full PII — name, email, phone, matric).
-- Anon status lookup: lookup_payment_status(matric, email) RPC (Section 8).
-- DELETE: no policy — payment audit trail must be preserved.
CREATE POLICY "payment_records: public insert"
  ON payment_records FOR INSERT
  WITH CHECK (
    payment_status = 'Pending Verification'
    AND length(trim(coalesce(matric_number, ''))) > 0
    AND length(trim(coalesce(surname,       ''))) > 0
    AND length(trim(coalesce(first_name,    ''))) > 0
    AND length(trim(coalesce(email,         ''))) > 0
    AND amount_paid > 0
  );

CREATE POLICY "payment_records: super_admin read"
  ON payment_records FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "payment_records: super_admin update"
  ON payment_records FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());


-- ====================================================================
-- SECTION 5Z: STAFF_ACCOUNTS PASSWORD PROTECTION — TWO-LAYER DEFENSE
-- ====================================================================
-- LAYER 1 — Column-level privilege (database enforcement)
--
-- PostgreSQL column-level SELECT privileges restrict which columns a
-- role may read.  After REVOKING the table-level SELECT grant and
-- re-granting only the safe columns:
--   SELECT id, name, email, created_at  →  allowed
--   SELECT *  OR  SELECT password        →  permission denied
--
-- Supabase / PostgREST honours column-level grants: a request for
-- select=password (or select=*) is rejected at the privilege layer
-- before RLS is evaluated.
--
-- The REVOKE is a no-op if the role was never granted table-level
-- SELECT (tables created via SQL migration, not Studio UI).  In all
-- cases the subsequent column-level GRANT is applied correctly.
--
-- LAYER 2 — SECURITY DEFINER RPC get_staff_accounts()
--
-- As an independent second defence, db.ts calls the function below
-- which is defined as SECURITY DEFINER and hard-codes the safe column
-- list in its body.  The password column is structurally absent from
-- the function signature regardless of table-level grants.
-- The function also re-enforces admin authorization explicitly.
--
-- db.ts also specifies explicit column names (id, name, email,
-- created_at) in its direct table query — a third application-level
-- layer that does not depend on the database-level controls above.
--
-- FUTURE MIGRATION — plaintext password elimination:
--   1. Invite each staff member to create a Supabase Auth account with
--      the same email address used in staff_accounts.
--   2. Insert their auth.users.id into admin_roles with the correct role.
--   3. Once ALL staff are migrated and using Supabase Auth, run:
--        ALTER TABLE staff_accounts DROP COLUMN password;
-- ====================================================================

-- Layer 1: revoke then re-grant with safe columns only.
REVOKE SELECT ON TABLE public.staff_accounts FROM anon;
REVOKE SELECT ON TABLE public.staff_accounts FROM authenticated;

GRANT SELECT (id, name, email, created_at)
  ON TABLE public.staff_accounts TO authenticated;

-- Layer 2: SECURITY DEFINER function — password column is absent from
-- the return type definition, so it can never appear in a response
-- even if table-level grants are altered by a subsequent migration.
-- Authorization check: only callers with an admin_roles row get data.
CREATE OR REPLACE FUNCTION get_staff_accounts()
RETURNS TABLE(id uuid, name text, email text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sa.id, sa.name, sa.email, sa.created_at
  FROM   public.staff_accounts sa
  WHERE  EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()
  )
  ORDER BY sa.created_at DESC;
$$;

REVOKE ALL ON FUNCTION get_staff_accounts() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_staff_accounts() FROM anon;
REVOKE ALL ON FUNCTION get_staff_accounts() FROM authenticated;
GRANT  EXECUTE ON FUNCTION get_staff_accounts() TO authenticated;


-- ====================================================================
-- SECTION 6: get_election_results — WITH INTERNAL AUTH CHECK
-- SECURITY DEFINER bypasses all table RLS, so the function must
-- explicitly verify the caller is an authorised admin before returning
-- any election data.  An EXCEPTION WHEN OTHERS handler prevents raw
-- PostgreSQL error text from leaking through the API response.
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
  -- ── AUTHORIZATION CHECK ─────────────────────────────────────────
  -- SECURITY DEFINER means this function executes as its owner and
  -- bypasses RLS.  We must therefore enforce admin authorisation
  -- explicitly.  Non-admin authenticated callers and all anon callers
  -- receive a JSON error object, not election data.
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'error', 'Access denied. Administrative privileges required.'
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
    FROM public.candidates WHERE election_id = p_election_id
    ORDER BY position
  LOOP
    SELECT COUNT(*) INTO v_pos_votes
    FROM public.election_ballots
    WHERE election_id = p_election_id AND position_id = v_position.title;

    v_candidates_array := '[]'::jsonb;

    FOR v_candidate IN
      SELECT id, name FROM public.candidates
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

EXCEPTION
  WHEN OTHERS THEN
    -- Log the technical detail server-side; return a safe message to the client.
    RAISE WARNING '[get_election_results] error for election_id=%: %',
      p_election_id, SQLERRM;
    RETURN jsonb_build_object(
      'error', 'An error occurred while computing election results. Please try again.'
    );
END;
$$;

-- anon cannot call this RPC (GRANT TO authenticated only).
-- Non-admin authenticated callers receive the JSON auth-error from above.
REVOKE ALL ON FUNCTION get_election_results(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_election_results(uuid) FROM anon;
REVOKE ALL ON FUNCTION get_election_results(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION get_election_results(uuid) TO authenticated;


-- ====================================================================
-- SECTION 7: submit_election_ballot — HARDENED
-- Changes from v5:
--   • Voter roster is now MANDATORY.  If election_voters has no rows
--     for this election, the ballot is rejected immediately.  The
--     previous behaviour (silently permitting unrestricted voting when
--     the roster was empty) was a critical misconfiguration risk.
--   • All other v5 improvements retained:
--     – null/malformed payload guard
--     – duplicate position detection (one vote per office)
--     – duplicate candidate detection
--     – per-item null candidate_id guard
--     – portal toggle check
--     – electoral body exemption (server-side)
--     – election status = 'open' check
--     – candidate-to-election/position validation
--     – atomic duplicate-vote prevention (pre-check + PK constraint)
--     – EXCEPTION WHEN unique_violation (race condition safety)
--     – EXCEPTION WHEN OTHERS (safe error, no SQLERRM to client)
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
  -- ── 1. Matric validation and normalisation ──────────────────────
  IF p_matric_number IS NULL OR TRIM(p_matric_number) = '' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Matriculation number is required.');
  END IF;

  -- Uppercase, trim leading/trailing, collapse internal whitespace.
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
      'error', 'Your ballot is empty. Please select at least one candidate.');
  END IF;

  -- ── 3. Duplicate position check (one vote per office) ──────────
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT x.position_id
    FROM jsonb_to_recordset(p_ballot_items) AS x(position_id text, candidate_id uuid)
    GROUP BY x.position_id
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Invalid ballot: multiple selections for the same position are not permitted.');
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
      'error', 'Invalid ballot: the same candidate appears more than once.');
  END IF;

  -- ── 5. Global election portal toggle ───────────────────────────
  SELECT election_portal_enabled INTO v_portal_enabled
  FROM public.site_settings WHERE id = 1;

  IF v_portal_enabled IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false,
      'error', 'The election portal is currently closed. Please check back during the official voting period.');
  END IF;

  -- ── 6. Electoral body exemption (server-side enforcement) ───────
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

  -- ── 8. MANDATORY roster check ──────────────────────────────────
  -- The voter roster MUST be configured before any ballot is accepted.
  -- An empty roster is treated as a misconfiguration, not an invitation
  -- to allow unrestricted voting.  If the electoral committee has not
  -- yet imported the voter list, all submissions are blocked.
  SELECT COUNT(*) INTO v_roster_count
  FROM public.election_voters WHERE election_id = p_election_id;

  IF v_roster_count = 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'The voter roster for this election has not been configured. Please contact the electoral committee before attempting to vote.');
  END IF;

  -- ── 9. Individual eligibility check ────────────────────────────
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

  -- ── 10. Candidate validation ────────────────────────────────────
  -- Each ballot item must name a candidate that actually belongs to
  -- this election AND the stated position.  Prevents cross-election
  -- ballot stuffing and forged position IDs.
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_ballot_items)
      AS x(position_id text, candidate_id uuid)
  LOOP
    IF v_item.candidate_id IS NULL THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Invalid ballot: a null candidate_id was detected.');
    END IF;

    SELECT COUNT(*) INTO v_candidate_ok
    FROM public.candidates
    WHERE id          = v_item.candidate_id
      AND election_id = p_election_id
      AND position    = v_item.position_id;

    IF v_candidate_ok = 0 THEN
      RETURN jsonb_build_object('success', false,
        'error', 'Invalid ballot: one or more selections do not match valid candidates for this election. Submission rejected.');
    END IF;
  END LOOP;

  -- ── 11. Duplicate-vote pre-check (optimistic) ───────────────────
  SELECT COUNT(*) INTO v_existing_acc
  FROM public.voter_accreditations
  WHERE election_id = p_election_id AND matric_number = v_norm_matric;

  IF v_existing_acc > 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'This matriculation number has already cast a ballot in this election.');
  END IF;

  -- ── 12. ATOMIC INSERT ───────────────────────────────────────────
  -- Accreditation row first: PRIMARY KEY (election_id, matric_number)
  -- is the final concurrency-safe duplicate-vote guarantee.
  INSERT INTO public.voter_accreditations (election_id, matric_number, reference_code, voted_at)
  VALUES (p_election_id, v_norm_matric, p_reference_code, now());

  -- Anonymous ballot entries: no matric linkage.
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
    -- PK constraint fired: concurrent duplicate caught.
    RETURN jsonb_build_object('success', false,
      'error', 'This matriculation number has already cast a ballot in this election.');
  WHEN OTHERS THEN
    RAISE WARNING '[submit_election_ballot] error election_id=%: %',
      p_election_id, SQLERRM;
    RETURN jsonb_build_object('success', false,
      'error', 'An unexpected error occurred. Please try again or contact the electoral committee.');
END;
$$;

REVOKE ALL ON FUNCTION submit_election_ballot(uuid, text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION submit_election_ballot(uuid, text, jsonb, text) FROM anon;
REVOKE ALL ON FUNCTION submit_election_ballot(uuid, text, jsonb, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION submit_election_ballot(uuid, text, jsonb, text) TO anon, authenticated;


-- ====================================================================
-- SECTION 8: lookup_payment_status(p_matric, p_email)
--            REPLACES the payment_status_view.
--
-- WHY TWO FACTORS?
--   A matric number is shared information — classmates, lecturers,
--   and administrative staff all know each other's matric numbers.
--   Treating matric alone as identity would allow any student to look
--   up any other student's payment history.
--
--   Requiring the email address used during payment submission provides
--   a second factor.  Only the submitting student is likely to know the
--   exact email they used.  The function returns 0 rows if either field
--   does not match, so it cannot be used to guess email addresses.
--
-- SECURITY PROPERTIES:
--   • SECURITY DEFINER: reads payment_records bypassing RLS.
--   • Returns only non-PII columns (no name, phone).
--   • Filters to one specific (matric, email) pair — bulk enumeration
--     is impossible without knowing both values.
--   • NULL or empty-string inputs produce 0 rows, not an error.
--   • Callable by anon (students tracking their own dues).
-- ====================================================================

DROP VIEW IF EXISTS payment_status_view;

CREATE OR REPLACE FUNCTION lookup_payment_status(p_matric text, p_email text)
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
  WHERE
    -- Guard: if either input is empty the query returns 0 rows safely.
    length(trim(coalesce(p_matric, ''))) > 0
    AND length(trim(coalesce(p_email, ''))) > 0
    AND UPPER(TRIM(pr.matric_number)) = UPPER(TRIM(p_matric))
    AND UPPER(TRIM(pr.email))         = UPPER(TRIM(p_email))
  ORDER BY pr.created_at DESC;
$$;

REVOKE ALL ON FUNCTION lookup_payment_status(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION lookup_payment_status(text, text) FROM anon;
REVOKE ALL ON FUNCTION lookup_payment_status(text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION lookup_payment_status(text, text) TO anon, authenticated;

-- Drop the old single-argument overload if it exists (created by v5 draft).
DROP FUNCTION IF EXISTS lookup_payment_status(text);


-- ====================================================================
-- SECTION 9: VOTER ENUMERATION — check_voter_accreditation REMOVED
-- The v5 draft included a check_voter_accreditation(election_id, matric)
-- RPC callable by anon.  Although it returned only a boolean, an
-- adversary with a list of matric numbers could iterate it to discover
-- which students had voted.  Since:
--   (a) duplicate-vote protection is fully enforced server-side inside
--       submit_election_ballot (pre-check + PK constraint + unique_violation
--       handler), and
--   (b) the "already voted" UX short-circuit in ElectionPortal.tsx is a
--       convenience only,
-- the function is removed entirely.  The portal falls back to a direct
-- query on voter_accreditations which RLS blocks for anon, returning 0
-- rows (accredited: false).  Repeat voters submit their ballot and
-- receive the server-side rejection message.
-- ====================================================================

DROP FUNCTION IF EXISTS check_voter_accreditation(uuid, text);


-- ====================================================================
-- SECTION 10: SCHEMA COLUMN ADDITIONS (idempotent)
-- ====================================================================

ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS is_published boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now();

UPDATE news_articles
  SET published_at = created_at
  WHERE published_at IS NULL AND is_published = true;

CREATE INDEX IF NOT EXISTS idx_news_articles_published
  ON news_articles(is_published, published_at DESC);

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS election_portal_enabled boolean NOT NULL DEFAULT false;


-- ====================================================================
-- SECTION 11: SEED DATA (ON CONFLICT DO NOTHING)
-- Placeholder text is intentionally obvious. Update via admin dashboard
-- before launch. Real production values are never overwritten.
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
  '/hero_bg.jpg', '/logo_nsbs.jpg', '/logo_unilesa.jpg',
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
  false   -- election portal CLOSED by default; super_admin opens it explicitly
) ON CONFLICT (id) DO NOTHING;

INSERT INTO social_media_links (platform, url, username) VALUES
  ('instagram', 'https://instagram.com/nsbs_unilesa', 'nsbs_unilesa'),
  ('tiktok',    'https://tiktok.com/@nsbs_unilesa',   'nsbs_unilesa')
ON CONFLICT (platform) DO NOTHING;


-- ====================================================================
-- SECTION 12: STORAGE — Library Bucket
-- New policies apply only to bucket_id = 'Library'.
-- ====================================================================

INSERT INTO storage.buckets (id, name, public)
  VALUES ('Library', 'Library', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

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
-- POST-COMMIT SETUP (manual actions — do not run inside the transaction)
-- ====================================================================
/*

ACTION 1 — CREATE SUPER ADMIN (first-time only):
  Supabase Dashboard → Authentication → Users → Add User
  Then in SQL Editor:
    INSERT INTO admin_roles (user_id, role, email)
    VALUES ('<USER_UUID_FROM_AUTH>', 'super_admin', '<email>');

ACTION 2 — DISABLE PUBLIC SIGNUPS:
  Authentication → Providers → Email → "Enable sign ups" OFF

ACTION 3 — VERIFY COLUMN-LEVEL GRANTS:
  Run as an authenticated non-super-admin session:
    SELECT * FROM staff_accounts;
  Expected: error "permission denied for column password"
    OR only id, name, email, created_at returned (depending on client).
  The password column must not appear in any response.

ACTION 4 — VERIFY FUNCTION GRANTS:
  SELECT grantee, routine_name, privilege_type
  FROM information_schema.role_routine_grants
  WHERE routine_schema = 'public'
    AND routine_name IN ('is_any_admin','is_super_admin','get_election_results',
                         'submit_election_ballot','lookup_payment_status')
  ORDER BY routine_name, grantee;
  Expected: no PUBLIC or anon rows. Only authenticated (and anon for
  submit_election_ballot and lookup_payment_status).

ACTION 5 — VERIFY ROSTER ENFORCEMENT:
  With portal enabled and an election in 'open' status but NO rows in
  election_voters for that election:
    SELECT submit_election_ballot('<id>', '2023/0001', '[{"position_id":"President","candidate_id":"<uuid>"}]', 'REF001');
  Expected: {"success": false, "error": "The voter roster for this election has not been configured..."}

ACTION 6 — VERIFY PAYMENT LOOKUP:
  SELECT * FROM lookup_payment_status('2023/0001', 'correct@email.com');  -- returns rows
  SELECT * FROM lookup_payment_status('2023/0001', 'wrong@email.com');    -- returns 0 rows
  SELECT * FROM lookup_payment_status('2023/0001', NULL);                 -- returns 0 rows

ACTION 7 — VERIFY STORAGE POLICIES:
  In Supabase Dashboard → Storage → Policies: confirm only 4 Library
  policies exist.  If other buckets are in use, recreate their policies now.

ACTION 8 — UPDATE FRONTEND:
  The tracker on /payments now requires matric + email (see db.ts and
  payments/page.tsx changes).  Verify the tracker form shows both fields.

ACTION 9 — OPEN ELECTION PORTAL (only when election day arrives):
  Admin Dashboard → Events & Voting → Election Portal Control
  → Click "Open Election Portal" → confirm both prompts.

*/


-- ====================================================================
-- VERIFICATION QUERIES (run separately in SQL Editor after migration)
-- ====================================================================
/*

-- V1: All helper + RPC functions are SECURITY DEFINER:
SELECT proname, prosecdef, proconfig FROM pg_proc
WHERE proname IN (
  'is_any_admin','is_super_admin','is_electoral_role',
  'is_content_admin','is_editorial_admin',
  'is_admin_user','is_super_admin_user',
  'get_election_results','submit_election_ballot','lookup_payment_status'
)
AND pronamespace = 'public'::regnamespace
ORDER BY proname;
-- Expected: 10 rows, prosecdef=true, proconfig contains search_path=public

-- V2: check_voter_accreditation is gone:
SELECT proname FROM pg_proc
WHERE proname = 'check_voter_accreditation'
  AND pronamespace = 'public'::regnamespace;
-- Expected: 0 rows

-- V3: lookup_payment_status has 2 parameters:
SELECT pronargs FROM pg_proc
WHERE proname = 'lookup_payment_status'
  AND pronamespace = 'public'::regnamespace;
-- Expected: 1 row, pronargs = 2

-- V4: payment_status_view is gone:
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'payment_status_view';
-- Expected: 0 rows

-- V5: RLS enabled on all 16 tables:
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
-- Expected: rowsecurity = true for all listed tables

-- V6: Policy inventory per table:
SELECT tablename, COUNT(*) FROM pg_policies
WHERE schemaname = 'public' GROUP BY tablename ORDER BY tablename;

-- V7: No anon/public execute on role-checking functions:
SELECT grantee, routine_name FROM information_schema.role_routine_grants
WHERE routine_schema = 'public'
  AND routine_name IN ('is_any_admin','is_super_admin','is_electoral_role',
                       'is_content_admin','is_editorial_admin')
  AND grantee IN ('PUBLIC','anon');
-- Expected: 0 rows

-- V8: staff_accounts column-level grants (password excluded):
SELECT grantee, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'staff_accounts'
  AND privilege_type = 'SELECT'
ORDER BY grantee, column_name;
-- Expected: authenticated → id, name, email, created_at only (no password row)

-- V9: Storage policies:
SELECT policyname FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
-- Expected: exactly 4 rows, all named 'Library: ...'

-- V10: election_portal_enabled defaults to false:
SELECT id, election_portal_enabled FROM site_settings;
-- Expected: election_portal_enabled = false (unless already updated by admin)

*/
