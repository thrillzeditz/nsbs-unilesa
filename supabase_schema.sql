-- ====================================================================
-- SUPABASE SCHEMA DESIGN
-- Nigerian Society of Biochemistry Students (NSBS), University of Ilesa
-- ====================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Seed initial settings
INSERT INTO site_settings (
    id, hero_title, hero_description, hero_bg_url, logo_nsbs_url, logo_unilesa_url,
    vision_statement, mission_statement, bank_name, account_name, account_number,
    treasurer_whatsapp, dues_amount, contact_email_dept, contact_email_general,
    contact_whatsapp, footer_description
) VALUES (
    1,
    'Welcome to NSBS University of Ilesa Portal',
    'The official academic, dues management, and information hub for the Nigerian Society of Biochemistry Students (NSBS), University of Ilesa Chapter.',
    '/hero_bg.jpg',
    '/logo_nsbs.jpg',
    '/logo_unilesa.jpg',
    'To build a vibrant academic community of biochemistry students equipped with research skills, academic excellence, and ethical leadership.',
    'To provide quality study materials, maintain transparent financial reporting, promote student welfare, and foster research collaborations.',
    'Wema Bank PLC',
    'NSBS University of Ilesa Chapter',
    '0245678912',
    '2348105596459',
    3000,
    'biochem@unilesa.edu.ng',
    'nsbsunilesa@gmail.com',
    '2347054083339',
    'Nigerian Society of Biochemistry Students (NSBS), University of Ilesa Chapter. Empowering future biochemists for global impact.'
) ON CONFLICT (id) DO NOTHING;


-- 2. SOCIAL MEDIA LINKS TABLE
CREATE TABLE IF NOT EXISTS social_media_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform text NOT NULL UNIQUE,
    url text NOT NULL,
    username text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Seed initial social channels
INSERT INTO social_media_links (platform, url, username) VALUES 
('instagram', 'https://instagram.com/nsbsunilesa', 'nsbs_unilesa'),
('tiktok', 'https://tiktok.com/@nsbsunilesa', 'nsbs.unilesa')
ON CONFLICT (platform) DO NOTHING;


-- 3. LIBRARY RESOURCES TABLE
CREATE TABLE IF NOT EXISTS library_resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    course_code text NOT NULL,
    level text NOT NULL, -- '100', '200', '300', '400'
    semester text NOT NULL, -- 'First', 'Second'
    file_url text NOT NULL,
    file_type text NOT NULL, -- 'PDF', 'DOCX', 'PPTX', etc.
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
    category text NOT NULL, -- 'Departmental Announcements', etc.
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
    status text NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'open', 'closed'
    created_at timestamp with time zone DEFAULT now()
);


-- 9. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id uuid REFERENCES elections(id) ON DELETE CASCADE,
    name text NOT NULL,
    position text NOT NULL, -- 'President', 'Treasurer', etc.
    photo_url text NOT NULL,
    manifesto text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidates_election_id ON candidates(election_id);


-- 10. VOTES TABLE (Secure with duplicate protection)
CREATE TABLE IF NOT EXISTS votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id uuid REFERENCES elections(id) ON DELETE CASCADE,
    candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
    matric_number text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    -- CRITICAL DUPLICATE VOTE CONSTRAINT
    -- Prevent duplicate voting inside the same election using matric_number
    CONSTRAINT unique_vote_per_matric UNIQUE (election_id, matric_number)
);

CREATE INDEX IF NOT EXISTS idx_votes_election_id ON votes(election_id);


-- 11. PAYMENT RECORDS TABLE (Departmental Dues tracking)
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
    payment_status text NOT NULL DEFAULT 'Pending Verification', -- 'Pending Verification', 'Approved', 'Rejected'
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_matric ON payment_records(matric_number);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_records(payment_status);


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & ACCESS CONTROL (Optional Reference)
-- ====================================================================
-- Enable RLS on all tables
-- ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
-- ...
-- Enable read permissions to everyone, write/mod permissions to admins
-- CREATE POLICY "Public Access" ON site_settings FOR SELECT USING (true);
-- CREATE POLICY "Admin Modify" ON site_settings FOR ALL TO authenticated USING (true);


-- 12. STAFF ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS staff_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    password text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

