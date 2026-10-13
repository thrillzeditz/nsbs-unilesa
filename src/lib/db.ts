import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SiteSettings, SocialMediaLink, LibraryResource, PastQuestion, NewsArticle, Comment, ActivityEvent, Election, Candidate, Vote, PaymentRecord, StaffAccount, ElectionCollationSummary, ElectionAuditLog, ElectionVoter } from './types';
import { isElectoralBodyExempt, EXEMPTION_MESSAGE, normalizeMatric } from './electionSecurity';

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
// Election Voters (Roster Management)
// ==========================================

/**
 * Fetch registered & eligible voters for an election, including their accreditation (voted) status
 * PRIVACY GUARANTEE: Only shows whether voter has voted, NEVER shows their ballot choices.
 */
export async function getElectionVoters(electionId: string): Promise<ElectionVoter[]> {
  const db = getClient();
  const { data: voters, error: votersError } = await db
    .from('election_voters')
    .select('*')
    .eq('election_id', electionId)
    .order('matric_number', { ascending: true });

  if (votersError) {
    console.error('Failed to fetch election voters:', votersError.message);
    return [];
  }

  // Get accredited matric numbers to annotate voted status
  const { data: accs } = await db
    .from('voter_accreditations')
    .select('matric_number, voted_at')
    .eq('election_id', electionId);

  const accMap = new Map<string, string>();
  if (accs) {
    accs.forEach(a => accMap.set(a.matric_number.toUpperCase().trim(), a.voted_at));
  }

  return (voters || []).map(v => ({
    ...v,
    has_voted: accMap.has(v.matric_number.toUpperCase().trim()),
    voted_at: accMap.get(v.matric_number.toUpperCase().trim())
  })) as ElectionVoter[];
}

export async function addElectionVoter(voter: Omit<ElectionVoter, 'id' | 'created_at'>): Promise<ElectionVoter> {
  const db = getClient();
  const normalizedMatric = voter.matric_number.trim().toUpperCase();
  const { data, error } = await db
    .from('election_voters')
    .insert({
      election_id: voter.election_id,
      matric_number: normalizedMatric,
      full_name: voter.full_name?.trim() || null,
      level: voter.level || null,
      department: voter.department || 'Biochemistry',
      is_eligible: voter.is_eligible !== false
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add voter: ${error.message}`);
  return data as ElectionVoter;
}

export async function batchAddElectionVoters(
  electionId: string, 
  voters: { matric_number: string; full_name?: string; level?: string; department?: string; is_eligible?: boolean }[]
): Promise<number> {
  const db = getClient();
  const records = voters
    .map(v => ({
      election_id: electionId,
      matric_number: v.matric_number.trim().toUpperCase(),
      full_name: v.full_name?.trim() || null,
      level: v.level || null,
      department: v.department || 'Biochemistry',
      is_eligible: v.is_eligible !== false
    }))
    .filter(v => v.matric_number.length > 0);

  if (records.length === 0) return 0;

  const { data, error } = await db
    .from('election_voters')
    .upsert(records, { onConflict: 'election_id,matric_number' })
    .select();

  if (error) throw new Error(`Batch upload failed: ${error.message}`);
  return data ? data.length : records.length;
}

export async function deleteElectionVoter(id: string): Promise<boolean> {
  const db = getClient();
  const { error } = await db.from('election_voters').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete voter: ${error.message}`);
  return true;
}

export async function toggleElectionVoterEligibility(id: string, isEligible: boolean): Promise<ElectionVoter> {
  const db = getClient();
  const { data, error } = await db
    .from('election_voters')
    .update({ is_eligible: isEligible })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update voter eligibility: ${error.message}`);
  return data as ElectionVoter;
}

// ==========================================
// Election Security, Accreditation & Atomic Balloting (RPC Layer)
// ==========================================

/**
 * Check if a matriculation number has already voted/accredited in this election.
 * Enforces Electoral Body Exemption checks.
 */
export async function checkVoterAccreditationStatus(
  electionId: string, 
  matricNumber: string
): Promise<{ accredited: boolean; referenceCode?: string; isExempt?: boolean; error?: string }> {
  // Security Enforcer: Reject exempted voters immediately
  if (isElectoralBodyExempt(matricNumber)) {
    return {
      accredited: false,
      isExempt: true,
      error: EXEMPTION_MESSAGE
    };
  }

  const db = getClient();
  const normalizedMatric = normalizeMatric(matricNumber);
  const { data, error } = await db
    .from('voter_accreditations')
    .select('reference_code')
    .eq('election_id', electionId)
    .eq('matric_number', normalizedMatric)
    .maybeSingle();

  if (error) {
    console.error('Accreditation check error:', error.message);
    return { accredited: false };
  }

  return { 
    accredited: !!data,
    referenceCode: data?.reference_code
  };
}

/**
 * Submit full ballot atomically via PostgreSQL stored procedure.
 * Guarantees all-or-nothing submission and locks voter out from duplicate attempts.
 */
export async function submitElectionBallotRPC(
  electionId: string,
  matricNumber: string,
  ballotItems: { position_id: string; candidate_id: string }[],
  referenceCode: string
): Promise<{ success: boolean; referenceCode?: string; error?: string }> {
  // Backend Security Enforcer: Reject exempted voters immediately
  if (isElectoralBodyExempt(matricNumber)) {
    return {
      success: false,
      error: EXEMPTION_MESSAGE
    };
  }

  const db = getClient();
  const normalizedMatric = normalizeMatric(matricNumber);

  const { data, error } = await db.rpc('submit_election_ballot', {
    p_election_id: electionId,
    p_matric_number: normalizedMatric,
    p_ballot_items: ballotItems,
    p_reference_code: referenceCode
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success === false) {
    return { success: false, error: data.error || 'Failed to submit ballot.' };
  }

  return {
    success: true,
    referenceCode: data?.reference_code || referenceCode
  };
}

/**
 * Fetch neutral certified election results computed strictly from anonymous ballots.
 */
export async function getElectionResultsRPC(electionId: string): Promise<ElectionCollationSummary | null> {
  const db = getClient();
  
  // Try calling the SQL RPC procedure first
  try {
    const { data, error } = await db.rpc('get_election_results', {
      p_election_id: electionId
    });

    if (!error && data && !data.error) {
      return data as ElectionCollationSummary;
    }
  } catch (err) {
    console.warn('RPC get_election_results failed, falling back to direct table queries:', err);
  }

  // Fallback: Compute authoritative statistics directly via SQL queries
  try {
    const { data: electData, error: electErr } = await db.from('elections').select('*').eq('id', electionId).single();
    if (electErr || !electData) return null;

    // 1. Registered and eligible voter counts
    const { count: regCount } = await db
      .from('election_voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId);

    const { count: eligCount } = await db
      .from('election_voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId)
      .eq('is_eligible', true);

    // 2. Accredited votes cast
    const { count: accCount } = await db
      .from('voter_accreditations')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId);

    const votesCast = accCount || 0;
    const registeredVoters = (regCount && regCount > 0) ? regCount : votesCast;
    const eligibleVoters = (eligCount && eligCount > 0) ? eligCount : registeredVoters;
    const yetToVote = Math.max(0, eligibleVoters - votesCast);
    const turnoutPct = eligibleVoters > 0 ? Number(((votesCast / eligibleVoters) * 100).toFixed(2)) : 0;

    // 3. Candidates and Ballots
    const { data: candidates } = await db.from('candidates').select('*').eq('election_id', electionId);
    const { data: ballots } = await db.from('election_ballots').select('position_id, candidate_id').eq('election_id', electionId);

    const distinctPositions = Array.from(new Set((candidates || []).map(c => c.position)));
    const candidateTallies: Record<string, number> = {};
    (ballots || []).forEach(b => {
      candidateTallies[b.candidate_id] = (candidateTallies[b.candidate_id] || 0) + 1;
    });

    const positions = distinctPositions.map(posTitle => {
      const posCandidates = (candidates || []).filter(c => c.position === posTitle);
      const posBallots = (ballots || []).filter(b => b.position_id === posTitle);
      const totalPosVotes = posBallots.length;

      return {
        position_id: posTitle,
        position_title: posTitle,
        total_votes_for_position: totalPosVotes,
        candidates: posCandidates.map(c => {
          const votesReceived = candidateTallies[c.id] || 0;
          const percentage = totalPosVotes > 0 ? Number(((votesReceived / totalPosVotes) * 100).toFixed(2)) : 0;
          return {
            candidate_id: c.id,
            candidate_name: c.name,
            position_id: posTitle,
            votes_received: votesReceived,
            percentage
          };
        })
      };
    });

    return {
      election_id: electData.id,
      election_title: electData.title,
      status: electData.status,
      created_at: electData.created_at,
      registered_voters: registeredVoters,
      eligible_voters: eligibleVoters,
      votes_cast: votesCast,
      accredited_voters: votesCast,
      total_ballots_cast: votesCast,
      yet_to_vote: yetToVote,
      remaining_voters: yetToVote,
      turnout_percentage: turnoutPct,
      positions,
      candidate_tallies: candidateTallies
    };
  } catch (fallbackErr) {
    console.error('Failed computing fallback election results:', fallbackErr);
    return null;
  }
}

/**
 * Record an administrative audit event without voter linkage
 */
export async function logElectionAuditEvent(
  electionId: string | undefined,
  actorEmail: string,
  action: ElectionAuditLog['action'],
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const db = getClient();
    await db.from('election_audit_logs').insert({
      election_id: electionId || null,
      actor_email: actorEmail,
      action,
      details: details || {}
    });
  } catch (err) {
    console.error('Failed to write election audit log:', err);
  }
}

/**
 * Fetch election audit logs for administrative review
 */
export async function getElectionAuditLogs(electionId?: string): Promise<ElectionAuditLog[]> {
  const db = getClient();
  let query = db.from('election_audit_logs').select('*').order('created_at', { ascending: false });
  if (electionId) query = query.eq('election_id', electionId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);
  return (data || []) as ElectionAuditLog[];
}

/**
 * Legacy getVotes query for backwards compatibility (queries ballots without voter identity)
 */
export async function getVotes(electionId?: string): Promise<Vote[]> {
  const db = getClient();
  let query = db.from('election_ballots').select('id, election_id, candidate_id, created_at');
  if (electionId) query = query.eq('election_id', electionId);
  const { data, error } = await query;
  if (error) {
    // If table not migrated yet, attempt fallback
    return [];
  }
  return (data || []) as Vote[];
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
  const normalizedAccount = {
    ...account,
    email: account.email.trim().toLowerCase()
  };
  const { data, error } = await db.from('staff_accounts').insert(normalizedAccount).select().single();
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

