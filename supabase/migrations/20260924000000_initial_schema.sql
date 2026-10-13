-- ====================================================================
-- MIGRATION: Initial Schema
-- NSBS University of Ilesa Portal
-- Nigerian Society of Biochemistry Students (NSBS)
-- ====================================================================
-- This migration creates all tables, indexes, RLS policies, and
-- stored procedures for the NSBS portal system.
-- ====================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- TABLES
-- ====================================================================

-- 1. SITE SETTINGS TABLE (Ensures a single configuration row)
CREATE TABLE IF NOT EXISTS site_settings (
    id integer PRIMARY KEY DEFAULT 1,
    hero_title text NOT NULL,
    hero_description text NOT NULL,
    hero_bg_url text NOT NULL,
    logo_nsbs_url text NOT NULL,
    logo_unilesa_url text NOT NULL,
    vision_statement text NOT NULL,
    mission_statement text NOT NULL,
    bank_name text NOT NULL,
    account_name text NOT NULL,
    account_number text NOT NULL,
    treasurer_whatsapp text NOT NULL,
    dues_amount numeric NOT NULL DEFAULT 3000,
    contact_email_dept text NOT NULL,
    contact_email_general text NOT NULL,
    contact_whatsapp text NOT NULL,
    footer_description text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT only_one_row CHECK (id = 1)
);


-- 2. SOCIAL MEDIA LINKS TABLE
CREATE TABLE IF NOT EXISTS social_media_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform text NOT NULL UNIQUE,
    url text NOT NULL,
    username text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


-- 3. LIBRARY RESOURCES TABLE
CREATE TABLE IF NOT EXISTS library_resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    course_code text NOT NULL,
    level text NOT NULL,
    semester text NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    file_size text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lib_resources_level ON library_resources(level);
CREATE INDEX IF NOT EXISTS idx_lib_resources_course ON library_resources(course_code);


-- 4. PAST QUESTIONS TABLE (Exam papers repository)
CREATE TABLE IF NOT EXISTS past_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    course_code text NOT NULL,
    level text NOT NULL,
    semester text NOT NULL,
    academic_session text NOT NULL,
    file_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_past_questions_course ON past_questions(course_code);
CREATE INDEX IF NOT EXISTS idx_past_questions_level ON past_questions(level);


-- 5. NEWS ARTICLES TABLE
CREATE TABLE IF NOT EXISTS news_articles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    content text NOT NULL,
    featured_image text NOT NULL,
    author text NOT NULL,
    category text NOT NULL,
    tags text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_articles_slug ON news_articles(slug);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);


-- 6. COMMENTS TABLE (News articles comments system)
CREATE TABLE IF NOT EXISTS comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id uuid REFERENCES news_articles(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    content text NOT NULL,
    is_approved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_is_approved ON comments(is_approved);


-- 7. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    venue text NOT NULL,
    date timestamp with time zone NOT NULL,
    poster_url text NOT NULL,
    registration_link text,
    created_at timestamp with time zone DEFAULT now()
);


-- 8. ELECTIONS TABLE
CREATE TABLE IF NOT EXISTS elections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'upcoming',
    created_at timestamp with time zone DEFAULT now()
);


-- 9. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id uuid REFERENCES elections(id) ON DELETE CASCADE,
    name text NOT NULL,
    position text NOT NULL,
    photo_url text NOT NULL,
    manifesto text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidates_election_id ON candidates(election_id);


-- 10. ELECTION VOTERS TABLE (Registered / Eligible Roster Registry)
CREATE TABLE IF NOT EXISTS election_voters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id uuid REFERENCES elections(id) ON DELETE CASCADE,
    matric_number text NOT NULL,
    full_name text,
    level text,
    department text DEFAULT 'Biochemistry',
    is_eligible boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_election_voter UNIQUE (election_id, matric_number)
);

CREATE INDEX IF NOT EXISTS idx_election_voters_election ON election_voters(election_id);
CREATE INDEX IF NOT EXISTS idx_election_voters_matric ON election_voters(matric_number);


-- 11. VOTER ACCREDITATIONS TABLE (Voter Identity & Lockout Registry)
CREATE TABLE IF NOT EXISTS voter_accreditations (
    election_id uuid REFERENCES elections(id) ON DELETE CASCADE,
    matric_number text NOT NULL,
    reference_code text NOT NULL,
    accredited_at timestamp with time zone DEFAULT now(),
    voted_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (election_id, matric_number)
);

CREATE INDEX IF NOT EXISTS idx_accreditations_election ON voter_accreditations(election_id);
CREATE INDEX IF NOT EXISTS idx_accreditations_matric ON voter_accreditations(matric_number);


-- 12. ELECTION BALLOTS TABLE (Anonymous Ballot Vault)
CREATE TABLE IF NOT EXISTS election_ballots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id uuid REFERENCES elections(id) ON DELETE CASCADE,
    position_id text NOT NULL,
    candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ballots_election_id ON election_ballots(election_id);
CREATE INDEX IF NOT EXISTS idx_ballots_candidate_id ON election_ballots(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ballots_position_id ON election_ballots(position_id);


-- 13. ELECTION AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS election_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id uuid,
    actor_email text NOT NULL,
    action text NOT NULL,
    details jsonb DEFAULT '{}',
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_election ON election_audit_logs(election_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON election_audit_logs(action);


-- 14. PAYMENT RECORDS TABLE (Departmental Dues tracking)
CREATE TABLE IF NOT EXISTS payment_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    surname text NOT NULL,
    first_name text NOT NULL,
    middle_name text,
    email text NOT NULL,
    mobile_number text NOT NULL,
    matric_number text NOT NULL,
    level text NOT NULL,
    academic_session text NOT NULL,
    due_item text NOT NULL DEFAULT 'NSBS Departmental Due',
    amount_paid numeric NOT NULL,
    payment_status text NOT NULL DEFAULT 'Pending Verification',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_matric ON payment_records(matric_number);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_records(payment_status);


-- 15. STAFF ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS staff_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    password text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on election tables
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_accreditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;

-- Elections: Public read, Authenticated write
DROP POLICY IF EXISTS "Public can view elections" ON elections;
CREATE POLICY "Public can view elections" ON elections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin modify elections" ON elections;
CREATE POLICY "Admin modify elections" ON elections FOR ALL TO authenticated USING (true);

-- Candidates: Public read, Authenticated write
DROP POLICY IF EXISTS "Public can view candidates" ON candidates;
CREATE POLICY "Public can view candidates" ON candidates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin modify candidates" ON candidates;
CREATE POLICY "Admin modify candidates" ON candidates FOR ALL TO authenticated USING (true);

-- Election Voters: Authenticated only
DROP POLICY IF EXISTS "Admin manage election voters" ON election_voters;
CREATE POLICY "Admin manage election voters" ON election_voters FOR ALL TO authenticated USING (true);

-- Voter Accreditations: Authenticated SELECT only
DROP POLICY IF EXISTS "Admin view accreditations" ON voter_accreditations;
CREATE POLICY "Admin view accreditations" ON voter_accreditations FOR SELECT TO authenticated USING (true);

-- Election Ballots: Authenticated SELECT only
DROP POLICY IF EXISTS "Admin view raw ballots" ON election_ballots;
CREATE POLICY "Admin view raw ballots" ON election_ballots FOR SELECT TO authenticated USING (true);

-- Audit Logs: Authenticated access
DROP POLICY IF EXISTS "Admin access audit logs" ON election_audit_logs;
CREATE POLICY "Admin access audit logs" ON election_audit_logs FOR ALL TO authenticated USING (true);

-- Staff Accounts: Open access (matches original schema)
DROP POLICY IF EXISTS "Allow staff_accounts select for all" ON staff_accounts;
CREATE POLICY "Allow staff_accounts select for all" ON staff_accounts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow staff_accounts insert for all" ON staff_accounts;
CREATE POLICY "Allow staff_accounts insert for all" ON staff_accounts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow staff_accounts update for all" ON staff_accounts;
CREATE POLICY "Allow staff_accounts update for all" ON staff_accounts FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow staff_accounts delete for all" ON staff_accounts;
CREATE POLICY "Allow staff_accounts delete for all" ON staff_accounts FOR DELETE USING (true);


-- ====================================================================
-- STORED PROCEDURES
-- ====================================================================

-- Atomic ballot submission with voter lockout
CREATE OR REPLACE FUNCTION submit_election_ballot(
    p_election_id uuid,
    p_matric_number text,
    p_ballot_items jsonb,
    p_reference_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status text;
    v_existing_accreditation int;
    v_norm_matric text;
    v_item record;
    v_roster_count int;
    v_is_eligible boolean;
BEGIN
    v_norm_matric := UPPER(TRIM(p_matric_number));

    IF v_norm_matric IS NULL OR LENGTH(v_norm_matric) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or missing matriculation number.');
    END IF;

    SELECT status INTO v_status FROM elections WHERE id = p_election_id;
    IF v_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Election does not exist.');
    END IF;

    IF v_status != 'open' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Election is currently not open for voting.');
    END IF;

    SELECT COUNT(*) INTO v_roster_count FROM election_voters WHERE election_id = p_election_id;
    IF v_roster_count > 0 THEN
        SELECT is_eligible INTO v_is_eligible 
        FROM election_voters 
        WHERE election_id = p_election_id AND UPPER(TRIM(matric_number)) = v_norm_matric;

        IF v_is_eligible IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Your matriculation number is not on the accredited voter roster for this election.');
        ELSIF v_is_eligible = false THEN
            RETURN jsonb_build_object('success', false, 'error', 'Your student account is marked as not eligible to vote in this election.');
        END IF;
    END IF;

    SELECT COUNT(*) INTO v_existing_accreditation
    FROM voter_accreditations
    WHERE election_id = p_election_id AND matric_number = v_norm_matric;

    IF v_existing_accreditation > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'This student matriculation number has already voted in this election.');
    END IF;

    INSERT INTO voter_accreditations (election_id, matric_number, reference_code, voted_at)
    VALUES (p_election_id, v_norm_matric, p_reference_code, now());

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_ballot_items) AS x(position_id text, candidate_id uuid)
    LOOP
        INSERT INTO election_ballots (election_id, position_id, candidate_id, created_at)
        VALUES (p_election_id, v_item.position_id, v_item.candidate_id, now());
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'reference_code', p_reference_code
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- Certified election results computation
CREATE OR REPLACE FUNCTION get_election_results(
    p_election_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_election record;
    v_registered_count int;
    v_eligible_count int;
    v_accredited_count int;
    v_yet_to_vote int;
    v_turnout_pct numeric;
    v_position record;
    v_candidate record;
    v_pos_votes int;
    v_cand_votes int;
    v_percentage numeric;
    v_positions_array jsonb := '[]'::jsonb;
    v_candidates_array jsonb;
    v_candidate_tallies jsonb := '{}'::jsonb;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election_id;
    IF v_election IS NULL THEN
        RETURN jsonb_build_object('error', 'Election not found');
    END IF;

    SELECT COUNT(*) INTO v_registered_count
    FROM election_voters
    WHERE election_id = p_election_id;

    SELECT COUNT(*) INTO v_eligible_count
    FROM election_voters
    WHERE election_id = p_election_id AND is_eligible = true;

    SELECT COUNT(*) INTO v_accredited_count 
    FROM voter_accreditations 
    WHERE election_id = p_election_id;

    IF v_registered_count = 0 THEN
        v_registered_count := v_accredited_count;
    END IF;
    IF v_eligible_count = 0 THEN
        v_eligible_count := v_accredited_count;
    END IF;

    v_yet_to_vote := GREATEST(0, v_eligible_count - v_accredited_count);
    
    IF v_eligible_count > 0 THEN
        v_turnout_pct := ROUND((v_accredited_count::numeric / v_eligible_count::numeric) * 100, 2);
    ELSE
        v_turnout_pct := 0;
    END IF;

    FOR v_position IN 
        SELECT DISTINCT position AS title FROM candidates WHERE election_id = p_election_id ORDER BY position
    LOOP
        SELECT COUNT(*) INTO v_pos_votes
        FROM election_ballots
        WHERE election_id = p_election_id AND position_id = v_position.title;

        v_candidates_array := '[]'::jsonb;

        FOR v_candidate IN
            SELECT id, name FROM candidates WHERE election_id = p_election_id AND position = v_position.title ORDER BY name
        LOOP
            SELECT COUNT(*) INTO v_cand_votes
            FROM election_ballots
            WHERE election_id = p_election_id AND candidate_id = v_candidate.id;

            IF v_pos_votes > 0 THEN
                v_percentage := ROUND((v_cand_votes::numeric / v_pos_votes::numeric) * 100, 2);
            ELSE
                v_percentage := 0;
            END IF;

            v_candidate_tallies := jsonb_set(
                v_candidate_tallies,
                ARRAY[v_candidate.id::text],
                to_jsonb(v_cand_votes)
            );

            v_candidates_array := v_candidates_array || jsonb_build_object(
                'candidate_id', v_candidate.id,
                'candidate_name', v_candidate.name,
                'position_id', v_position.title,
                'votes_received', v_cand_votes,
                'percentage', v_percentage
            );
        END LOOP;

        v_positions_array := v_positions_array || jsonb_build_object(
            'position_id', v_position.title,
            'position_title', v_position.title,
            'total_votes_for_position', v_pos_votes,
            'candidates', v_candidates_array
        );
    END LOOP;

    RETURN jsonb_build_object(
        'election_id', v_election.id,
        'election_title', v_election.title,
        'status', v_election.status,
        'created_at', v_election.created_at,
        'registered_voters', v_registered_count,
        'eligible_voters', v_eligible_count,
        'votes_cast', v_accredited_count,
        'accredited_voters', v_accredited_count,
        'total_ballots_cast', v_accredited_count,
        'yet_to_vote', v_yet_to_vote,
        'remaining_voters', v_yet_to_vote,
        'turnout_percentage', v_turnout_pct,
        'positions', v_positions_array,
        'candidate_tallies', v_candidate_tallies
    );
END;
$$;
