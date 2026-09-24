export interface SiteSettings {
  id: number;
  hero_title: string;
  hero_description: string;
  hero_bg_url: string;
  logo_nsbs_url: string;
  logo_unilesa_url: string;
  vision_statement: string;
  mission_statement: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  treasurer_whatsapp: string;
  dues_amount: number;
  contact_email_dept: string;
  contact_email_general: string;
  contact_whatsapp: string;
  footer_description: string;
}

export interface SocialMediaLink {
  id: string;
  platform: 'facebook' | 'instagram' | 'tiktok';
  url: string;
  username: string;
}

export interface LibraryResource {
  id: string;
  title: string;
  description: string;
  course_code: string;
  level: '100' | '200' | '300' | '400' | 'misc';
  semester: 'First' | 'Second';
  file_url: string;
  file_type: string;
  file_size: string;
  created_at: string;
}

export interface PastQuestion {
  id: string;
  title: string;
  course_code: string;
  level: string;
  semester: string;
  academic_session: string;
  file_url: string;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  featured_image: string;
  author: string;
  category: string;
  tags: string[];
  created_at: string;
}

export interface Comment {
  id: string;
  article_id: string;
  name: string;
  email: string;
  content: string;
  is_approved: boolean;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  title: string;
  description: string;
  venue: string;
  date: string;
  poster_url: string;
  registration_link?: string;
  created_at: string;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  status: 'upcoming' | 'open' | 'closed';
  created_at: string;
}

export interface Candidate {
  id: string;
  election_id: string;
  name: string;
  position: string;
  photo_url: string;
  manifesto: string;
}

export interface Vote {
  id: string;
  election_id: string;
  candidate_id: string;
  matric_number?: string;
  created_at: string;
}

export interface ElectionVoter {
  id: string;
  election_id: string;
  matric_number: string;
  full_name?: string;
  level?: string;
  department?: string;
  is_eligible: boolean;
  created_at?: string;
  has_voted?: boolean;
  voted_at?: string;
}

export interface VoterAccreditation {
  election_id: string;
  matric_number: string;
  reference_code: string;
  accredited_at: string;
  voted_at: string;
}

export interface ElectionBallot {
  id: string;
  election_id: string;
  position_id: string;
  candidate_id: string;
  created_at: string;
}

export interface ElectionCandidateTally {
  candidate_id: string;
  candidate_name: string;
  position_id: string;
  votes_received: number;
  percentage: number;
}

export interface ElectionPositionSummary {
  position_id: string;
  position_title: string;
  total_votes_for_position: number;
  candidates: ElectionCandidateTally[];
}

export interface ElectionCollationSummary {
  election_id: string;
  election_title: string;
  status: 'upcoming' | 'open' | 'closed';
  created_at?: string;
  registered_voters: number;
  eligible_voters: number;
  votes_cast: number;
  accredited_voters: number;
  total_ballots_cast: number;
  yet_to_vote: number;
  remaining_voters: number;
  turnout_percentage: number;
  positions: ElectionPositionSummary[];
  candidate_tallies: Record<string, number>;
}

export interface ElectionAuditLog {
  id: string;
  election_id?: string;
  actor_email: string;
  action: 'ELECTION_CREATED' | 'ELECTION_OPENED' | 'ELECTION_CLOSED' | 'ELECTION_DELETED' | 'CANDIDATE_ADDED' | 'CANDIDATE_REMOVED' | 'RESULTS_EXPORTED' | 'DEMO_RESET' | 'ADMIN_AUTH';
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  surname: string;
  first_name: string;
  middle_name?: string;
  email: string;
  mobile_number: string;
  matric_number: string;
  level: string;
  academic_session: string;
  due_item: string;
  amount_paid: number;
  payment_status: 'Pending Verification' | 'Approved' | 'Rejected';
  created_at: string;
  updated_at: string;
}

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  created_at: string;
}

