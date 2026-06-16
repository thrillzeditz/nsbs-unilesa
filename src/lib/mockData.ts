import { SiteSettings, SocialMediaLink, LibraryResource, PastQuestion, NewsArticle, Comment, ActivityEvent, Election, Candidate, PaymentRecord, StaffAccount } from './types';

export const initialSiteSettings: SiteSettings = {
  id: 1,
  hero_title: "Welcome to NSBS University of Ilesa Portal",
  hero_description: "The official academic, dues management, and information hub for the Nigerian Society of Biochemistry Students (NSBS), University of Ilesa Chapter. Access resources, past questions, track payments, and get departmental news.",
  hero_bg_url: "/hero_bg.jpg",
  logo_nsbs_url: "/logo_nsbs.jpg",
  logo_unilesa_url: "/logo_unilesa.jpg",
  vision_statement: "To build a vibrant academic community of biochemistry students equipped with research skills, academic excellence, and ethical leadership to solve global biological challenges.",
  mission_statement: "To provide quality study materials, maintain transparent financial reporting for dues, promote student welfare, foster research collaborations, and enable seamless student communication.",
  bank_name: "Wema Bank PLC",
  account_name: "NSBS University of Ilesa Chapter",
  account_number: "0245678912",
  treasurer_whatsapp: "2348105596459", // Include country code without "+" for deep links
  dues_amount: 3000,
  contact_email_dept: "biochem@unilesa.edu.ng",
  contact_email_general: "nsbsunilesa@gmail.com",
  contact_whatsapp: "2347054083339",
  footer_description: "Nigerian Society of Biochemistry Students (NSBS), University of Ilesa Chapter. Empowering future biochemists for global impact through academic excellence and research."
};

export const initialSocialMediaLinks: SocialMediaLink[] = [
  {
    id: "social-2",
    platform: "instagram",
    url: "https://instagram.com/nsbsunilesa",
    username: "nsbs_unilesa"
  },
  {
    id: "social-3",
    platform: "tiktok",
    url: "https://tiktok.com/@nsbsunilesa",
    username: "nsbs.unilesa"
  }
];

export const initialLibraryResources: LibraryResource[] = [
  {
    id: "lib-7",
    title: "NSBS Constitution",
    description: "The official constitution and guide outlining student association rights, responsibilities, and executives' operational guidelines.",
    course_code: "CONSTITUTION",
    level: "misc",
    semester: "First",
    file_url: "#",
    file_type: "PDF",
    file_size: "3.2 MB",
    created_at: "2026-06-12T10:00:00Z"
  },
  {
    id: "lib-8",
    title: "The Scope of Biochemistry",
    description: "An introductory review outlining biochemistry's scientific branches, medical applications, and scope of study.",
    course_code: "SCOPE",
    level: "misc",
    semester: "First",
    file_url: "#",
    file_type: "PDF",
    file_size: "2.1 MB",
    created_at: "2026-06-12T11:00:00Z"
  },
  {
    id: "lib-9",
    title: "The Power of Discipline",
    description: "An educational guide on study habits, academic discipline, and self-organization strategies for student success.",
    course_code: "GUIDE",
    level: "misc",
    semester: "First",
    file_url: "#",
    file_type: "PDF",
    file_size: "1.5 MB",
    created_at: "2026-06-12T12:00:00Z"
  },
  {
    id: "lib-10",
    title: "List of Area or Industry for SIWES",
    description: "A comprehensive reference directory of recommended laboratories, biotech firms, and industrial placement sites for the SIWES scheme.",
    course_code: "SIWES",
    level: "misc",
    semester: "First",
    file_url: "#",
    file_type: "PDF",
    file_size: "1.8 MB",
    created_at: "2026-06-12T13:00:00Z"
  },
  {
    id: "lib-11",
    title: "CGPA Calculation",
    description: "A comprehensive guide and worksheet explaining the step-by-step process of calculating Grade Point Average (GPA) and Cumulative Grade Point Average (CGPA) under the university grading system.",
    course_code: "CGPA",
    level: "misc",
    semester: "First",
    file_url: "https://drive.google.com/drive/folders/13Je1yjc2_AAKaGLzm_iLv8Cy0XbNeQ4-",
    file_type: "PDF",
    file_size: "2 KB",
    created_at: "2026-06-12T14:00:00Z"
  }
];

export const initialPastQuestions: PastQuestion[] = [];

export const initialNewsArticles: NewsArticle[] = [];

export const initialComments: Comment[] = [];

export const initialEvents: ActivityEvent[] = [];

export const initialElections: Election[] = [];

export const initialCandidates: Candidate[] = [];


export const initialPaymentRecords: PaymentRecord[] = [
  {
    id: "pay-1",
    surname: "Adeboye",
    first_name: "Tosin",
    middle_name: "Emmanuel",
    email: "tosin.adeboye@student.unilesa.edu.ng",
    mobile_number: "+2348055551234",
    matric_number: "2023/1045",
    level: "300",
    academic_session: "2025/2026",
    due_item: "NSBS Departmental Due",
    amount_paid: 3000,
    payment_status: "Approved",
    created_at: "2026-06-08T09:00:00Z",
    updated_at: "2026-06-08T11:30:00Z"
  },
  {
    id: "pay-2",
    surname: "Fagbemi",
    first_name: "Esther",
    email: "esther.fagbemi@student.unilesa.edu.ng",
    mobile_number: "+2349077775678",
    matric_number: "2024/2056",
    level: "200",
    academic_session: "2025/2026",
    due_item: "NSBS Departmental Due",
    amount_paid: 3000,
    payment_status: "Pending Verification",
    created_at: "2026-06-11T10:15:00Z",
    updated_at: "2026-06-11T10:15:00Z"
  }
];

export const initialStaffAccounts: StaffAccount[] = [
  {
    id: "staff-1",
    name: "Dr. Sarah Alao",
    email: "staff@nsbs.unilesa.edu.ng",
    password: "staff123",
    created_at: "2026-06-12T09:00:00Z"
  }
];
