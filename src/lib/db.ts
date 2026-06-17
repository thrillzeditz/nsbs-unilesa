import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SiteSettings, SocialMediaLink, LibraryResource, PastQuestion, NewsArticle, Comment, ActivityEvent, Election, Candidate, Vote, PaymentRecord, StaffAccount } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

function getClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
  }
  return supabase;
}

// ==========================================
// Site Settings
// ==========================================
export async function getSettings(): Promise<SiteSettings> {
  const db = getClient();
  const { data, error } = await db.from('site_settings').select('*').eq('id', 1).single();
  if (error) throw new Error(`Failed to fetch settings: ${error.message}`);
  return data as SiteSettings;
}

export async function updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const db = getClient();
  const { data, error } = await db.from('site_settings').update(settings).eq('id', 1).select().single();
  if (error) throw new Error(`Failed to update settings: ${error.message}`);
  return data as SiteSettings;
}

// ==========================================
// Social Media Links
// ==========================================
export async function getSocialLinks(): Promise<SocialMediaLink[]> {
  const db = getClient();
  const { data, error } = await db.from('social_media_links').select('*');
  if (error) throw new Error(`Failed to fetch social links: ${error.message}`);
  return (data as SocialMediaLink[]).filter(s => s.platform !== 'facebook');
}

export async function updateSocialLink(id: string, url: string, username: string): Promise<SocialMediaLink[]> {
  const db = getClient();
  await db.from('social_media_links').update({ url, username }).eq('id', id);
  const { data } = await db.from('social_media_links').select('*');
  return (data || []) as SocialMediaLink[];
}

// ==========================================
// Library Resources
// ==========================================
export async function getLibraryResources(): Promise<LibraryResource[]> {
  const db = getClient();
  const { data, error } = await db.from('library_resources').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch library resources: ${error.message}`);
  return data as LibraryResource[];
}

export async function addLibraryResource(resource: Omit<LibraryResource, 'id' | 'created_at'>): Promise<LibraryResource> {
  const db = getClient();
  const { data, error } = await db.from('library_resources').insert(resource).select().single();
  if (error) throw new Error(`Failed to add library resource: ${error.message}`);
  return data as LibraryResource;
}

export async function deleteLibraryResource(id: string): Promise<boolean> {
  const db = getClient();
  const { error } = await db.from('library_resources').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete library resource: ${error.message}`);
  return true;
}

// ==========================================
// Past Questions
// ==========================================
export async function getPastQuestions(): Promise<PastQuestion[]> {
  const db = getClient();
  const { data, error } = await db.from('past_questions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch past questions: ${error.message}`);
  return data as PastQuestion[];
}

export async function addPastQuestion(pq: Omit<PastQuestion, 'id' | 'created_at'>): Promise<PastQuestion> {
  const db = getClient();
  const { data, error } = await db.from('past_questions').insert(pq).select().single();
  if (error) throw new Error(`Failed to add past question: ${error.message}`);
  return data as PastQuestion;
}

export async function deletePastQuestion(id: string): Promise<boolean> {
  const db = getClient();
  const { error } = await db.from('past_questions').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete past question: ${error.message}`);
  return true;
}

// ==========================================
// News Articles
// ==========================================
export async function getNewsArticles(): Promise<NewsArticle[]> {
  const db = getClient();
  const { data, error } = await db.from('news_articles').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch news articles: ${error.message}`);
  return data as NewsArticle[];
}

export async function addNewsArticle(article: Omit<NewsArticle, 'id' | 'created_at' | 'slug'>): Promise<NewsArticle> {
  const db = getClient();
  const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await db.from('news_articles').insert({ ...article, slug }).select().single();
  if (error) throw new Error(`Failed to add news article: ${error.message}`);
  return data as NewsArticle;
}

export async function editNewsArticle(id: string, article: Partial<NewsArticle>): Promise<NewsArticle> {
  const db = getClient();
  const updatePayload = { ...article };
  if (article.title) {
    updatePayload.slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  const { data, error } = await db.from('news_articles').update(updatePayload).eq('id', id).select().single();
  if (error) throw new Error(`Failed to edit news article: ${error.message}`);
  return data as NewsArticle;
}

export async function deleteNewsArticle(id: string): Promise<boolean> {
  const db = getClient();
  const { error } = await db.from('news_articles').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete news article: ${error.message}`);
  return true;
}

// ==========================================
// Comments
// ==========================================
export async function getComments(articleId?: string): Promise<Comment[]> {
  const db = getClient();
  let query = db.from('comments').select('*').order('created_at', { ascending: false });
  if (articleId) {
    query = query.eq('article_id', articleId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch comments: ${error.message}`);
  return data as Comment[];
}

export async function addComment(comment: Omit<Comment, 'id' | 'created_at' | 'is_approved'>): Promise<Comment> {
  const db = getClient();
  const { data, error } = await db.from('comments').insert({ ...comment, is_approved: false }).select().single();
  if (error) throw new Error(`Failed to add comment: ${error.message}`);
  return data as Comment;
}

export async function approveComment(id: string): Promise<boolean> {
  const db = getClient();
  const { error } = await db.from('comments').update({ is_approved: true }).eq('id', id);
  if (error) throw new Error(`Failed to approve comment: ${error.message}`);
  return true;
}

export async function deleteComment(id: string): Promise<boolean> {
  const db = getClient();
  const { error } = await db.from('comments').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete comment: ${error.message}`);
  return true;
}

// ==========================================
// Events
// ==========================================
export async function getEvents(): Promise<ActivityEvent[]> {
  const db = getClient();
  const { data, error } = await db.from('events').select('*').order('date', { ascending: true });
  if (error) throw new Error(`Failed to fetch events: ${error.message}`);
  return data as ActivityEvent[];
}

export async function addEvent(event: Omit<ActivityEvent, 'id' | 'created_at'>): Promise<ActivityEvent> {
  const db = getClient();
  const { data, error } = await db.from('events').insert(event).select().single();
  if (error) throw new Error(`Failed to add event: ${error.message}`);
  return data as ActivityEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const db = getClient();
  const { error } = await db.from('events').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete event: ${error.message}`);
  return true;
}

export async function editEvent(id: string, event: Partial<ActivityEvent>): Promise<ActivityEvent> {
  const db = getClient();
  const { data, error } = await db.from('events').update(event).eq('id', id).select().single();
  if (error) throw new Error(`Failed to edit event: ${error.message}`);
  return data as ActivityEvent;
}

// ==========================================
// Elections
// ==========================================
export async function getElections(): Promise<Election[]> {
  const db = getClient();
  const { data, error } = await db.from('elections').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch elections: ${error.message}`);
  return data as Election[];
}

export async function addElection(election: Omit<Election, 'id' | 'created_at'>): Promise<Election> {
  const db = getClient();
  const { data, error } = await db.from('elections').insert(election).select().single();
  if (error) throw new Error(`Failed to add election: ${error.message}`);
  return data as Election;
}

export async function updateElectionStatus(id: string, status: 'upcoming' | 'open' | 'closed'): Promise<Election> {
  const db = getClient();
  const { data, error } = await db.from('elections').update({ status }).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update election status: ${error.message}`);
  return data as Election;
}

export async function deleteElection(id: string): Promise<boolean> {
  const db = getClient();
  // Candidates and votes are cascaded via foreign keys
  const { error } = await db.from('elections').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete election: ${error.message}`);
  return true;
}

// ==========================================
// Candidates
// ==========================================
export async function getCandidates(electionId?: string): Promise<Candidate[]> {
  const db = getClient();
  let query = db.from('candidates').select('*');
  if (electionId) query = query.eq('election_id', electionId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch candidates: ${error.message}`);
  return data as Candidate[];
}

export async function addCandidate(candidate: Omit<Candidate, 'id'>): Promise<Candidate> {
  const db = getClient();
  const { data, error } = await db.from('candidates').insert(candidate).select().single();
  if (error) throw new Error(`Failed to add candidate: ${error.message}`);
  return data as Candidate;
}

export async function deleteCandidate(id: string): Promise<boolean> {
  const db = getClient();
  const { error } = await db.from('candidates').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete candidate: ${error.message}`);
  return true;
}

// ==========================================
// Votes
// ==========================================
export async function getVotes(electionId?: string): Promise<Vote[]> {
  const db = getClient();
  let query = db.from('votes').select('*');
  if (electionId) query = query.eq('election_id', electionId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch votes: ${error.message}`);
  return data as Vote[];
}

export async function castVote(vote: Omit<Vote, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
  const db = getClient();
  const { error } = await db.from('votes').insert({ ...vote }).select();
  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      return { success: false, error: "You have already voted in this election!" };
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ==========================================
// Payment Records
// ==========================================
export async function getPaymentRecords(): Promise<PaymentRecord[]> {
  const db = getClient();
  const { data, error } = await db.from('payment_records').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch payment records: ${error.message}`);
  return data as PaymentRecord[];
}

export async function addPaymentRecord(record: Omit<PaymentRecord, 'id' | 'payment_status' | 'created_at' | 'updated_at'>): Promise<PaymentRecord> {
  const db = getClient();
  const { data, error } = await db.from('payment_records')
    .insert({ ...record, payment_status: 'Pending Verification' })
    .select().single();
  if (error) throw new Error(`Failed to add payment record: ${error.message}`);
  return data as PaymentRecord;
}

export async function verifyPayment(id: string, status: 'Approved' | 'Rejected'): Promise<PaymentRecord> {
  const db = getClient();
  const { data, error } = await db.from('payment_records')
    .update({ payment_status: status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single();
  if (error) throw new Error(`Failed to verify payment: ${error.message}`);
  return data as PaymentRecord;
}

export async function getPaymentByMatric(matric: string): Promise<PaymentRecord[]> {
  const db = getClient();
  const { data, error } = await db.from('payment_records')
    .select('*')
    .ilike('matric_number', matric.trim())
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch payment by matric: ${error.message}`);
  return data as PaymentRecord[];
}

// ==========================================
// Staff Accounts
// ==========================================
export async function getStaffAccounts(): Promise<StaffAccount[]> {
  const db = getClient();
  const { data, error } = await db.from('staff_accounts').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to fetch staff accounts: ${error.message}`);
  return data as StaffAccount[];
}

export async function addStaffAccount(account: Omit<StaffAccount, 'id' | 'created_at'>): Promise<StaffAccount> {
  const db = getClient();
  const { data, error } = await db.from('staff_accounts').insert(account).select().single();
  if (error) throw new Error(`Failed to add staff account: ${error.message}`);
  return data as StaffAccount;
}

export async function deleteStaffAccount(id: string): Promise<boolean> {
  const db = getClient();
  const { error } = await db.from('staff_accounts').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete staff account: ${error.message}`);
  return true;
}

// ==========================================
// Storage Upload Helpers
// ==========================================
export async function uploadFile(file: File, bucket: string, path: string): Promise<string> {
  const db = getClient();
  
  // Clean path to prevent double slashes or leading slashes
  const cleanPath = path.replace(/^\/+/, '');
  
  const { data, error } = await db.storage.from(bucket).upload(cleanPath, file, {
    cacheControl: '3600',
    upsert: true
  });
  
  if (error) {
    throw new Error(`Failed to upload file to storage: ${error.message}`);
  }
  
  const { data: publicUrlData } = db.storage.from(bucket).getPublicUrl(data.path);
  return publicUrlData.publicUrl;
}

