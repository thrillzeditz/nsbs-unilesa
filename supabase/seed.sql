-- ====================================================================
-- SEED DATA: NSBS University of Ilesa Portal
-- Run after the initial migration to populate default data.
-- ====================================================================

-- Site Settings (single configuration row)
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


-- Social Media Links
INSERT INTO social_media_links (platform, url, username) VALUES 
('instagram', 'https://instagram.com/nsbsunilesa', 'nsbs_unilesa'),
('tiktok', 'https://tiktok.com/@nsbsunilesa', 'nsbs.unilesa')
ON CONFLICT (platform) DO NOTHING;


-- Staff Accounts (CMS login credentials)
INSERT INTO staff_accounts (name, email, password) VALUES
('Super Admin', 'admin@nsbs.unilesa.edu.ng', 'admin123'),
('Dr Squalene', 'squalene@nsbs.unilesa.edu.ng', 'squalene'),
('Hannah', 'hannah@nsbs.unilesa.edu.ng', 'hannah'),
('Purest', 'purest@nsbs.unilesa.edu.ng', 'purest')
ON CONFLICT (email) DO NOTHING;


-- Library Resources (Reference materials)
INSERT INTO library_resources (title, description, course_code, level, semester, file_url, file_type, file_size) VALUES
('NSBS Constitution', 'The official constitution and guide outlining student association rights, responsibilities, and executives'' operational guidelines.', 'CONSTITUTION', 'misc', 'First', '#', 'PDF', '3.2 MB'),
('The Scope of Biochemistry', 'An introductory review outlining biochemistry''s scientific branches, medical applications, and scope of study.', 'SCOPE', 'misc', 'First', '#', 'PDF', '2.1 MB'),
('The Power of Discipline', 'An educational guide on study habits, academic discipline, and self-organization strategies for student success.', 'GUIDE', 'misc', 'First', '#', 'PDF', '1.5 MB'),
('List of Area or Industry for SIWES', 'A comprehensive reference directory of recommended laboratories, biotech firms, and industrial placement sites for the SIWES scheme.', 'SIWES', 'misc', 'First', '#', 'PDF', '1.8 MB'),
('CGPA Calculation', 'A comprehensive guide and worksheet explaining the step-by-step process of calculating Grade Point Average (GPA) and Cumulative Grade Point Average (CGPA) under the university grading system.', 'CGPA', 'misc', 'First', 'https://drive.google.com/drive/folders/13Je1yjc2_AAKaGLzm_iLv8Cy0XbNeQ4-', 'PDF', '2 KB')
ON CONFLICT DO NOTHING;


-- Sample Payment Records
INSERT INTO payment_records (surname, first_name, middle_name, email, mobile_number, matric_number, level, academic_session, due_item, amount_paid, payment_status) VALUES
('Adeboye', 'Tosin', 'Emmanuel', 'tosin.adeboye@student.unilesa.edu.ng', '+2348055551234', '2023/1045', '300', '2025/2026', 'NSBS Departmental Due', 3000, 'Approved'),
('Fagbemi', 'Esther', NULL, 'esther.fagbemi@student.unilesa.edu.ng', '+2349077775678', '2024/2056', '200', '2025/2026', 'NSBS Departmental Due', 3000, 'Pending Verification')
ON CONFLICT DO NOTHING;
