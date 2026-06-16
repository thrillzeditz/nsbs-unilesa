import { createClient } from '@supabase/supabase-js';
import { SiteSettings, SocialMediaLink, LibraryResource, PastQuestion, NewsArticle, Comment, ActivityEvent, Election, Candidate, Vote, PaymentRecord, StaffAccount } from './types';


import * as seeds from './mockData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Helpers for localStorage (Mock Mode)
const getLocalStorage = <T>(key: string, defaultVal: T): T => {
  if (typeof window === 'undefined') return defaultVal;
  const val = localStorage.getItem(key);
  if (!val) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(val) as T;
  } catch {
    return defaultVal;
  }
};

const setLocalStorage = <T>(key: string, data: T): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// Site Settings
export async function getSettings(): Promise<SiteSettings> {
  if (supabase) {
    const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
    if (!error && data) {
      const s = data as SiteSettings;
      if (s.logo_nsbs_url && s.logo_nsbs_url.includes('unsplash.com')) s.logo_nsbs_url = '/logo_nsbs.jpg';
      if (s.logo_unilesa_url && s.logo_unilesa_url.includes('unsplash.com')) s.logo_unilesa_url = '/logo_unilesa.jpg';
      if (s.hero_bg_url && s.hero_bg_url.includes('unsplash.com')) s.hero_bg_url = '/hero_bg.jpg';
      return s;
    }
    // Fall back to seed if table empty
  }
  const local = getLocalStorage<SiteSettings>('nsbs_settings', seeds.initialSiteSettings);
  let updated = false;
  if (local.logo_nsbs_url && local.logo_nsbs_url.includes('unsplash.com')) {
    local.logo_nsbs_url = '/logo_nsbs.jpg';
    updated = true;
  }
  if (local.logo_unilesa_url && local.logo_unilesa_url.includes('unsplash.com')) {
    local.logo_unilesa_url = '/logo_unilesa.jpg';
    updated = true;
  }
  if (local.hero_bg_url && local.hero_bg_url.includes('unsplash.com')) {
    local.hero_bg_url = '/hero_bg.jpg';
    updated = true;
  }
  if (local.contact_whatsapp === '2348123456789') {
    local.contact_whatsapp = '2347054083339';
    updated = true;
  }
  if (local.treasurer_whatsapp === '2348123456789') {
    local.treasurer_whatsapp = '2348105596459';
    updated = true;
  }
  if (updated) {
    setLocalStorage('nsbs_settings', local);
  }
  return local;
}

export async function updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  if (supabase) {
    const { data, error } = await supabase.from('site_settings').update(settings).eq('id', 1).select().single();
    if (!error && data) return data as SiteSettings;
  }
  const current = getLocalStorage<SiteSettings>('nsbs_settings', seeds.initialSiteSettings);
  const updated = { ...current, ...settings };
  setLocalStorage('nsbs_settings', updated);
  return updated;
}

// Social Media Links
export async function getSocialLinks(): Promise<SocialMediaLink[]> {
  if (supabase) {
    const { data, error } = await supabase.from('social_media_links').select('*');
    if (!error && data) return (data as SocialMediaLink[]).filter(s => s.platform !== 'facebook');
  }
  const local = getLocalStorage<SocialMediaLink[]>('nsbs_social_links', seeds.initialSocialMediaLinks);
  const filtered = local.filter(s => s.platform !== 'facebook');
  if (filtered.length !== local.length) {
    setLocalStorage('nsbs_social_links', filtered);
  }
  return filtered;
}

export async function updateSocialLink(id: string, url: string, username: string): Promise<SocialMediaLink[]> {
  if (supabase) {
    await supabase.from('social_media_links').update({ url, username }).eq('id', id);
    const { data } = await supabase.from('social_media_links').select('*');
    if (data) return data as SocialMediaLink[];
  }
  const current = getLocalStorage<SocialMediaLink[]>('nsbs_social_links', seeds.initialSocialMediaLinks);
  const updated = current.map(link => link.id === id ? { ...link, url, username } : link);
  setLocalStorage('nsbs_social_links', updated);
  return updated;
}

// Library Resources
export async function getLibraryResources(): Promise<LibraryResource[]> {
  if (supabase) {
    const { data, error } = await supabase.from('library_resources').select('*').order('created_at', { ascending: false });
    if (!error && data) return data as LibraryResource[];
  }
  const local = getLocalStorage<LibraryResource[]>('nsbs_library', seeds.initialLibraryResources);
  const hasBeenCleaned = getLocalStorage<boolean>('nsbs_library_cleaned_v2', false);
  
  if (!hasBeenCleaned) {
    // Keep ONLY the miscellaneous files and filter out any other legacy/leftover files
    const cleanList = local.filter(r => r.level === 'misc' && !['lib-1', 'lib-2', 'lib-3', 'lib-4', 'lib-5', 'lib-6'].includes(r.id));
    const seedMisc = seeds.initialLibraryResources.filter(r => r.level === 'misc');
    const existingMiscIds = new Set(cleanList.map(r => r.id));
    const missingMisc = seedMisc.filter(r => !existingMiscIds.has(r.id));
    const merged = [...cleanList, ...missingMisc];
    
    setLocalStorage('nsbs_library', merged);
    setLocalStorage('nsbs_library_cleaned_v2', true);
    return merged;
  }
  
  // Normal mode: sync misc files if seeds changed, but preserve user-uploaded files
  const seedMisc = seeds.initialLibraryResources.filter(r => r.level === 'misc');
  const localMisc = local.filter(r => r.level === 'misc');
  const needsSync = localMisc.length !== seedMisc.length || 
                    seedMisc.some(sm => {
                      const lm = localMisc.find(m => m.id === sm.id);
                      return !lm || lm.file_url !== sm.file_url || lm.file_size !== sm.file_size;
                    });
  
  if (needsSync) {
    const nonMiscUploaded = local.filter(r => r.level !== 'misc');
    const merged = [...nonMiscUploaded, ...seedMisc];
    setLocalStorage('nsbs_library', merged);
    return merged;
  }
  
  return local;
}

export async function addLibraryResource(resource: Omit<LibraryResource, 'id' | 'created_at'>): Promise<LibraryResource> {
  const newResource: LibraryResource = {
    ...resource,
    id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
    created_at: new Date().toISOString()
  };
  
  if (supabase) {
    const { data, error } = await supabase.from('library_resources').insert(resource).select().single();
    if (!error && data) return data as LibraryResource;
  }
  
  const current = getLocalStorage<LibraryResource[]>('nsbs_library', seeds.initialLibraryResources);
  const updated = [newResource, ...current];
  setLocalStorage('nsbs_library', updated);
  return newResource;
}

export async function deleteLibraryResource(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('library_resources').delete().eq('id', id);
    if (!error) return true;
  }
  const current = getLocalStorage<LibraryResource[]>('nsbs_library', seeds.initialLibraryResources);
  const updated = current.filter(r => r.id !== id);
  setLocalStorage('nsbs_library', updated);
  return true;
}

// Past Questions
export async function getPastQuestions(): Promise<PastQuestion[]> {
  if (supabase) {
    const { data, error } = await supabase.from('past_questions').select('*').order('created_at', { ascending: false });
    if (!error && data) return data as PastQuestion[];
  }
  const local = getLocalStorage<PastQuestion[]>('nsbs_past_questions', seeds.initialPastQuestions);
  const hasBeenCleaned = getLocalStorage<boolean>('nsbs_pq_cleaned_v2', false);
  
  if (!hasBeenCleaned) {
    setLocalStorage('nsbs_past_questions', []);
    setLocalStorage('nsbs_pq_cleaned_v2', true);
    return [];
  }
  
  return local;
}

export async function addPastQuestion(pq: Omit<PastQuestion, 'id' | 'created_at'>): Promise<PastQuestion> {
  const newPq: PastQuestion = {
    ...pq,
    id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
    created_at: new Date().toISOString()
  };
  
  if (supabase) {
    const { data, error } = await supabase.from('past_questions').insert(pq).select().single();
    if (!error && data) return data as PastQuestion;
  }
  
  const current = getLocalStorage<PastQuestion[]>('nsbs_past_questions', seeds.initialPastQuestions);
  const updated = [newPq, ...current];
  setLocalStorage('nsbs_past_questions', updated);
  return newPq;
}

export async function deletePastQuestion(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('past_questions').delete().eq('id', id);
    if (!error) return true;
  }
  const current = getLocalStorage<PastQuestion[]>('nsbs_past_questions', seeds.initialPastQuestions);
  const updated = current.filter(pq => pq.id !== id);
  setLocalStorage('nsbs_past_questions', updated);
  return true;
}

// News Articles
export async function getNewsArticles(): Promise<NewsArticle[]> {
  if (supabase) {
    const { data, error } = await supabase.from('news_articles').select('*').order('created_at', { ascending: false });
    if (!error && data) return data as NewsArticle[];
  }
  const local = getLocalStorage<NewsArticle[]>('nsbs_news', seeds.initialNewsArticles);
  const filtered = local.filter(a => !['news-1', 'news-2', 'news-3'].includes(a.id));
  if (filtered.length !== local.length) {
    setLocalStorage('nsbs_news', filtered);
  }
  return filtered;
}

export async function addNewsArticle(article: Omit<NewsArticle, 'id' | 'created_at' | 'slug'>): Promise<NewsArticle> {
  const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const newArticle: NewsArticle = {
    ...article,
    slug,
    id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
    created_at: new Date().toISOString()
  };
  
  if (supabase) {
    const { data, error } = await supabase.from('news_articles').insert({ ...article, slug }).select().single();
    if (!error && data) return data as NewsArticle;
  }
  
  const current = getLocalStorage<NewsArticle[]>('nsbs_news', seeds.initialNewsArticles);
  const updated = [newArticle, ...current];
  setLocalStorage('nsbs_news', updated);
  return newArticle;
}

export async function editNewsArticle(id: string, article: Partial<NewsArticle>): Promise<NewsArticle> {
  if (supabase) {
    const { data, error } = await supabase.from('news_articles').update(article).eq('id', id).select().single();
    if (!error && data) return data as NewsArticle;
  }
  const current = getLocalStorage<NewsArticle[]>('nsbs_news', seeds.initialNewsArticles);
  const index = current.findIndex(a => a.id === id);
  if (index === -1) throw new Error("Article not found");
  
  let slug = current[index].slug;
  if (article.title) {
    slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  
  const updatedArticle = { ...current[index], ...article, slug };
  current[index] = updatedArticle;
  setLocalStorage('nsbs_news', current);
  return updatedArticle;
}

export async function deleteNewsArticle(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('news_articles').delete().eq('id', id);
    if (!error) return true;
  }
  const current = getLocalStorage<NewsArticle[]>('nsbs_news', seeds.initialNewsArticles);
  const updated = current.filter(a => a.id !== id);
  setLocalStorage('nsbs_news', updated);
  return true;
}

// Comments
export async function getComments(articleId?: string): Promise<Comment[]> {
  if (supabase) {
    let query = supabase.from('comments').select('*').order('created_at', { ascending: false });
    if (articleId) {
      query = query.eq('article_id', articleId);
    }
    const { data, error } = await query;
    if (!error && data) return data as Comment[];
  }
  const all = getLocalStorage<Comment[]>('nsbs_comments', seeds.initialComments);
  const filtered = all.filter(c => !['comm-1', 'comm-2', 'comm-3'].includes(c.id));
  if (filtered.length !== all.length) {
    setLocalStorage('nsbs_comments', filtered);
  }
  if (articleId) {
    return filtered.filter(c => c.article_id === articleId);
  }
  return filtered;
}

export async function addComment(comment: Omit<Comment, 'id' | 'created_at' | 'is_approved'>): Promise<Comment> {
  const newComment: Comment = {
    ...comment,
    id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
    is_approved: false, // Moderated by default
    created_at: new Date().toISOString()
  };
  
  if (supabase) {
    const { data, error } = await supabase.from('comments').insert({ ...comment, is_approved: false }).select().single();
    if (!error && data) return data as Comment;
  }
  
  const current = getLocalStorage<Comment[]>('nsbs_comments', seeds.initialComments);
  const updated = [newComment, ...current];
  setLocalStorage('nsbs_comments', updated);
  return newComment;
}

export async function approveComment(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('comments').update({ is_approved: true }).eq('id', id);
    if (!error) return true;
  }
  const current = getLocalStorage<Comment[]>('nsbs_comments', seeds.initialComments);
  const updated = current.map(c => c.id === id ? { ...c, is_approved: true } : c);
  setLocalStorage('nsbs_comments', updated);
  return true;
}

export async function deleteComment(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (!error) return true;
  }
  const current = getLocalStorage<Comment[]>('nsbs_comments', seeds.initialComments);
  const updated = current.filter(c => c.id !== id);
  setLocalStorage('nsbs_comments', updated);
  return true;
}

// Events
export async function getEvents(): Promise<ActivityEvent[]> {
  if (supabase) {
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (!error && data) return data as ActivityEvent[];
  }
  const local = getLocalStorage<ActivityEvent[]>('nsbs_events', seeds.initialEvents);
  const filtered = local.filter(e => !['evt-1', 'evt-2'].includes(e.id));
  if (filtered.length !== local.length) {
    setLocalStorage('nsbs_events', filtered);
  }
  return filtered;
}

export async function addEvent(event: Omit<ActivityEvent, 'id' | 'created_at'>): Promise<ActivityEvent> {
  const newEvent: ActivityEvent = {
    ...event,
    id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
    created_at: new Date().toISOString()
  };
  
  if (supabase) {
    const { data, error } = await supabase.from('events').insert(event).select().single();
    if (!error && data) return data as ActivityEvent;
  }
  
  const current = getLocalStorage<ActivityEvent[]>('nsbs_events', seeds.initialEvents);
  const updated = [...current, newEvent];
  setLocalStorage('nsbs_events', updated);
  return newEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) return true;
  }
  const current = getLocalStorage<ActivityEvent[]>('nsbs_events', seeds.initialEvents);
  const updated = current.filter(e => e.id !== id);
  setLocalStorage('nsbs_events', updated);
  return true;
}

export async function editEvent(id: string, event: Partial<ActivityEvent>): Promise<ActivityEvent> {
  if (supabase) {
    const { data, error } = await supabase.from('events').update(event).eq('id', id).select().single();
    if (!error && data) return data as ActivityEvent;
  }
  const current = getLocalStorage<ActivityEvent[]>('nsbs_events', seeds.initialEvents);
  const idx = current.findIndex(e => e.id === id);
  if (idx === -1) throw new Error("Event not found");
  const updated = { ...current[idx], ...event };
  current[idx] = updated;
  setLocalStorage('nsbs_events', current);
  return updated;
}

// Elections
export async function getElections(): Promise<Election[]> {
  if (supabase) {
    const { data, error } = await supabase.from('elections').select('*').order('created_at', { ascending: false });
    if (!error && data) return data as Election[];
  }
  const local = getLocalStorage<Election[]>('nsbs_elections', seeds.initialElections);
  const filtered = local.filter(e => e.id !== 'elect-1');
  if (filtered.length !== local.length) {
    setLocalStorage('nsbs_elections', filtered);
  }
  return filtered;
}

export async function addElection(election: Omit<Election, 'id' | 'created_at'>): Promise<Election> {
  const newElection: Election = {
    ...election,
    id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
    created_at: new Date().toISOString()
  };
  
  if (supabase) {
    const { data, error } = await supabase.from('elections').insert(election).select().single();
    if (!error && data) return data as Election;
  }
  
  const current = getLocalStorage<Election[]>('nsbs_elections', seeds.initialElections);
  const updated = [newElection, ...current];
  setLocalStorage('nsbs_elections', updated);
  return newElection;
}

export async function updateElectionStatus(id: string, status: 'upcoming' | 'open' | 'closed'): Promise<Election> {
  if (supabase) {
    const { data, error } = await supabase.from('elections').update({ status }).eq('id', id).select().single();
    if (!error && data) return data as Election;
  }
  const current = getLocalStorage<Election[]>('nsbs_elections', seeds.initialElections);
  const idx = current.findIndex(e => e.id === id);
  if (idx === -1) throw new Error("Election not found");
  const updated = { ...current[idx], status };
  current[idx] = updated;
  setLocalStorage('nsbs_elections', current);
  return updated;
}

export async function deleteElection(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('elections').delete().eq('id', id);
    if (!error) return true;
  }
  const current = getLocalStorage<Election[]>('nsbs_elections', seeds.initialElections);
  const updated = current.filter(e => e.id !== id);
  setLocalStorage('nsbs_elections', updated);
  
  // Clean up candidates & votes
  const cand = getLocalStorage<Candidate[]>('nsbs_candidates', seeds.initialCandidates);
  setLocalStorage('nsbs_candidates', cand.filter(c => c.election_id !== id));
  const v = getLocalStorage<Vote[]>('nsbs_votes', []);
  setLocalStorage('nsbs_votes', v.filter(vote => vote.election_id !== id));
  
  return true;
}

// Candidates
export async function getCandidates(electionId?: string): Promise<Candidate[]> {
  if (supabase) {
    let query = supabase.from('candidates').select('*');
    if (electionId) query = query.eq('election_id', electionId);
    const { data, error } = await query;
    if (!error && data) return data as Candidate[];
  }
  const all = getLocalStorage<Candidate[]>('nsbs_candidates', seeds.initialCandidates);
  const filtered = all.filter(c => !['cand-1', 'cand-2', 'cand-3'].includes(c.id));
  if (filtered.length !== all.length) {
    setLocalStorage('nsbs_candidates', filtered);
  }
  if (electionId) return filtered.filter(c => c.election_id === electionId);
  return filtered;
}

export async function addCandidate(candidate: Omit<Candidate, 'id'>): Promise<Candidate> {
  const newCandidate: Candidate = {
    ...candidate,
    id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString()
  };
  
  if (supabase) {
    const { data, error } = await supabase.from('candidates').insert(candidate).select().single();
    if (!error && data) return data as Candidate;
  }
  
  const current = getLocalStorage<Candidate[]>('nsbs_candidates', seeds.initialCandidates);
  const updated = [...current, newCandidate];
  setLocalStorage('nsbs_candidates', updated);
  return newCandidate;
}

export async function deleteCandidate(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (!error) return true;
  }
  const current = getLocalStorage<Candidate[]>('nsbs_candidates', seeds.initialCandidates);
  const updated = current.filter(c => c.id !== id);
  setLocalStorage('nsbs_candidates', updated);
  return true;
}

// Votes
export async function getVotes(electionId?: string): Promise<Vote[]> {
  if (supabase) {
    let query = supabase.from('votes').select('*');
    if (electionId) query = query.eq('election_id', electionId);
    const { data, error } = await query;
    if (!error && data) return data as Vote[];
  }
  const all = getLocalStorage<Vote[]>('nsbs_votes', []);
  if (electionId) return all.filter(v => v.election_id === electionId);
  return all;
}

export async function castVote(vote: Omit<Vote, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
  // Validate eligibility: only vote once per election per matric number
  if (supabase) {
    const { data, error } = await supabase.from('votes')
      .insert({ ...vote })
      .select();
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: "You have already voted in this election!" };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  }
  
  const current = getLocalStorage<Vote[]>('nsbs_votes', []);
  const alreadyVoted = current.some(v => v.election_id === vote.election_id && v.matric_number.toLowerCase() === vote.matric_number.toLowerCase());
  
  if (alreadyVoted) {
    return { success: false, error: "You have already voted in this election!" };
  }
  
  const newVote: Vote = {
    ...vote,
    id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
    created_at: new Date().toISOString()
  };
  
  current.push(newVote);
  setLocalStorage('nsbs_votes', current);
  return { success: true };
}

// Payment Records
export async function getPaymentRecords(): Promise<PaymentRecord[]> {
  if (supabase) {
    const { data, error } = await supabase.from('payment_records').select('*').order('created_at', { ascending: false });
    if (!error && data) return data as PaymentRecord[];
  }
  return getLocalStorage<PaymentRecord[]>('nsbs_payments', seeds.initialPaymentRecords);
}

export async function addPaymentRecord(record: Omit<PaymentRecord, 'id' | 'payment_status' | 'created_at' | 'updated_at'>): Promise<PaymentRecord> {
  const newRecord: PaymentRecord = {
    ...record,
    id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
    payment_status: 'Pending Verification',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  if (supabase) {
    const { data, error } = await supabase.from('payment_records')
      .insert({ ...record, payment_status: 'Pending Verification' })
      .select().single();
    if (!error && data) return data as PaymentRecord;
  }
  
  const current = getLocalStorage<PaymentRecord[]>('nsbs_payments', seeds.initialPaymentRecords);
  const updated = [newRecord, ...current];
  setLocalStorage('nsbs_payments', updated);
  return newRecord;
}

export async function verifyPayment(id: string, status: 'Approved' | 'Rejected'): Promise<PaymentRecord> {
  if (supabase) {
    const { data, error } = await supabase.from('payment_records')
      .update({ payment_status: status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select().single();
    if (!error && data) return data as PaymentRecord;
  }
  const current = getLocalStorage<PaymentRecord[]>('nsbs_payments', seeds.initialPaymentRecords);
  const idx = current.findIndex(p => p.id === id);
  if (idx === -1) throw new Error("Payment record not found");
  
  const updated = {
    ...current[idx],
    payment_status: status,
    updated_at: new Date().toISOString()
  };
  current[idx] = updated;
  setLocalStorage('nsbs_payments', current);
  return updated;
}

export async function getPaymentByMatric(matric: string): Promise<PaymentRecord[]> {
  if (supabase) {
    const { data, error } = await supabase.from('payment_records')
      .select('*')
      .ilike('matric_number', matric.trim())
      .order('created_at', { ascending: false });
    if (!error && data) return data as PaymentRecord[];
  }
  const all = getLocalStorage<PaymentRecord[]>('nsbs_payments', seeds.initialPaymentRecords);
  return all.filter(p => p.matric_number.toLowerCase().trim() === matric.toLowerCase().trim());
}

// Staff Accounts
export async function getStaffAccounts(): Promise<StaffAccount[]> {
  if (supabase) {
    const { data, error } = await supabase.from('staff_accounts').select('*').order('created_at', { ascending: false });
    if (!error && data) return data as StaffAccount[];
  }
  return getLocalStorage<StaffAccount[]>('nsbs_staff', seeds.initialStaffAccounts);
}

export async function addStaffAccount(account: Omit<StaffAccount, 'id' | 'created_at'>): Promise<StaffAccount> {
  const newAccount: StaffAccount = {
    ...account,
    id: typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString(),
    created_at: new Date().toISOString()
  };
  
  if (supabase) {
    const { data, error } = await supabase.from('staff_accounts').insert(account).select().single();
    if (!error && data) return data as StaffAccount;
  }
  
  const current = getLocalStorage<StaffAccount[]>('nsbs_staff', seeds.initialStaffAccounts);
  const updated = [newAccount, ...current];
  setLocalStorage('nsbs_staff', updated);
  return newAccount;
}

export async function deleteStaffAccount(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('staff_accounts').delete().eq('id', id);
    if (!error) return true;
  }
  const current = getLocalStorage<StaffAccount[]>('nsbs_staff', seeds.initialStaffAccounts);
  const updated = current.filter(sa => sa.id !== id);
  setLocalStorage('nsbs_staff', updated);
  return true;
}

