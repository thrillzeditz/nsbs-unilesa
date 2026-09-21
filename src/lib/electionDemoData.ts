// ====================================================================
// NSBS ELECTION 2026 - DEMO DATA & REPOSITORY LAYER
// Mock student records, candidate database, and election audit engine.
// Easily interchangeable with the production NSBS student database.
// ====================================================================

export interface DemoStudent {
  matric_number: string;
  name: string;
  level: string;
  department: string;
}

export interface DemoCandidate {
  id: string;
  name: string;
  position: string;
  level: string;
  photo_url: string;
  manifesto: string;
}

export interface DemoElectionPosition {
  id: string;
  title: string;
  required: boolean;
  candidates: DemoCandidate[];
}

export interface DemoVoteRecord {
  matric_number: string;
  reference_code: string;
  timestamp: string;
}

export interface DemoBallotVaultItem {
  id: string;
  position: string;
  candidate_id: string;
  candidate_name: string;
  timestamp: string;
}

export interface DemoElectionStats {
  registered_voters: number;
  eligible_voters: number;
  votes_cast: number;
  remaining_voters: number;
  turnout_percentage: number;
  status: 'open' | 'closed' | 'upcoming';
  election_title: string;
  candidate_tallies: Record<string, number>; // candidate_id -> count
}

// 1. MOCK STUDENT DIRECTORY (Biochemistry Department Roster)
export const MOCK_STUDENTS: DemoStudent[] = [
  {
    matric_number: '2023/0001',
    name: 'Adewale Daniel',
    level: '300 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2023/0002',
    name: 'Okafor Victory',
    level: '300 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2023/0003',
    name: 'Gbiri Emmanuel Temidayo',
    level: '300 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2022/0114',
    name: 'Bello Fatimah Ayomide',
    level: '400 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2022/0155',
    name: 'Adeleke Joshua Oluwaseun',
    level: '400 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2024/0201',
    name: 'Alabi Oluwatobiloba Samuel',
    level: '200 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2024/0245',
    name: 'Ogundele Blessing Chisom',
    level: '200 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2025/0012',
    name: 'Ibrahim Zainab Temiloluwa',
    level: '100 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2025/0088',
    name: 'Babatunde Kayode Favour',
    level: '100 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2023/0099',
    name: 'Balogun Ridwan',
    level: '300 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2023/0357',
    name: 'Adegoke Ayomide Victor',
    level: '300 Level',
    department: 'Biochemistry'
  },
  {
    matric_number: '2024/0189',
    name: 'Eze Priscilla Ngozi',
    level: '200 Level',
    department: 'Biochemistry'
  }
];

export const TOTAL_DEPARTMENT_REGISTERED_STUDENTS = 120;

// 2. MOCK CANDIDATE DIRECTORY (Grouped by Position)
export const MOCK_POSITIONS: DemoElectionPosition[] = [
  {
    id: 'president',
    title: 'President',
    required: true,
    candidates: [
      {
        id: 'cand-pres-1',
        name: 'Babalola Ayodeji',
        position: 'President',
        level: '400 Level',
        photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Promoting student welfare, pioneering biochemistry research symposia, and building stronger industry partnerships.'
      },
      {
        id: 'cand-pres-2',
        name: 'Oladipo Grace Morayo',
        position: 'President',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Transparent leadership, academic empowerment, comprehensive tutorial networks, and digital departmental services.'
      }
    ]
  },
  {
    id: 'vice-president',
    title: 'Vice President',
    required: true,
    candidates: [
      {
        id: 'cand-vp-1',
        name: 'Adeyemi Toluwalase',
        position: 'Vice President',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Bridging faculty-student communication, fostering academic mentorship, and coordinating impactful workshop series.'
      },
      {
        id: 'cand-vp-2',
        name: 'Ekechukwu Victor',
        position: 'Vice President',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Student inclusivity, enhanced laboratory welfare, and dedicated support for freshman transition programs.'
      }
    ]
  },
  {
    id: 'gen-sec',
    title: 'General Secretary',
    required: true,
    candidates: [
      {
        id: 'cand-gs-1',
        name: 'Fashola Olamide',
        position: 'General Secretary',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Accurate departmental documentation, timely meeting minutes publication, and digitized secretarial records.'
      },
      {
        id: 'cand-gs-2',
        name: 'Yusuf Maryam',
        position: 'General Secretary',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Proactive communications, seamless bulletin dissemination, and accessible executive contact channels.'
      }
    ]
  },
  {
    id: 'asst-gen-sec',
    title: 'Assistant General Secretary',
    required: true,
    candidates: [
      {
        id: 'cand-ags-1',
        name: 'Ajayi Peter Timilehin',
        position: 'Assistant General Secretary',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Diligent assistance to the secretariat, effective record organization, and student inquiry follow-up.'
      },
      {
        id: 'cand-ags-2',
        name: 'Bakare Eniola',
        position: 'Assistant General Secretary',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Speedy notice dispatches, reliable secretariat archiving, and active engagement with student representatives.'
      }
    ]
  },
  {
    id: 'treasurer',
    title: 'Treasurer',
    required: true,
    candidates: [
      {
        id: 'cand-trs-1',
        name: 'Ogunsola Samuel',
        position: 'Treasurer',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Uncompromising financial integrity, immediate digital receipt issuance, and open quarterly financial updates.'
      },
      {
        id: 'cand-trs-2',
        name: 'Nwosu Chidinma',
        position: 'Treasurer',
        level: '300 Level',
        photo_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Fiscal prudence, transparent dues allocation, and efficient resource management for student welfare.'
      }
    ]
  },
  {
    id: 'fin-sec',
    title: 'Financial Secretary',
    required: true,
    candidates: [
      {
        id: 'cand-fs-1',
        name: 'Salami Kehinde',
        position: 'Financial Secretary',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Precise financial book-keeping, real-time dues reconciliation, and automated payment receipts.'
      },
      {
        id: 'cand-fs-2',
        name: 'Lawal Qudus',
        position: 'Financial Secretary',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Zero-delay dues tracking, transparent ledger accountability, and regular financial reporting.'
      }
    ]
  },
  {
    id: 'pro',
    title: 'Public Relations Officer',
    required: true,
    candidates: [
      {
        id: 'cand-pro-1',
        name: 'Adeleke David',
        position: 'Public Relations Officer',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Expanding NSBS UNILESA brand reach, innovative media campaigns, and engaging departmental highlights.'
      },
      {
        id: 'cand-pro-2',
        name: 'Nwachukwu Faith',
        position: 'Public Relations Officer',
        level: '200 Level',
        photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400',
        manifesto: 'Vibrant event promotion, active social media engagement, and fast-track student announcement broadcasts.'
      }
    ]
  }
];

// Initial pre-seeded votes for realistic baseline analytics
const INITIAL_DEMO_VOTERS: DemoVoteRecord[] = [
  { matric_number: '2023/0099', reference_code: 'NSBS-2026-9A10K', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { matric_number: '2022/0114', reference_code: 'NSBS-2026-4B82X', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { matric_number: '2024/0201', reference_code: 'NSBS-2026-7C33L', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { matric_number: '2025/0012', reference_code: 'NSBS-2026-2E91M', timestamp: new Date(Date.now() - 3600000 * 1).toISOString() }
];

const INITIAL_DEMO_BALLOTS: DemoBallotVaultItem[] = [
  { id: '1', position: 'President', candidate_id: 'cand-pres-1', candidate_name: 'Babalola Ayodeji', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '2', position: 'President', candidate_id: 'cand-pres-2', candidate_name: 'Oladipo Grace Morayo', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: '3', position: 'President', candidate_id: 'cand-pres-1', candidate_name: 'Babalola Ayodeji', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '4', position: 'President', candidate_id: 'cand-pres-2', candidate_name: 'Oladipo Grace Morayo', timestamp: new Date(Date.now() - 3600000 * 1).toISOString() },

  { id: '5', position: 'Vice President', candidate_id: 'cand-vp-1', candidate_name: 'Adeyemi Toluwalase', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '6', position: 'Vice President', candidate_id: 'cand-vp-1', candidate_name: 'Adeyemi Toluwalase', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: '7', position: 'Vice President', candidate_id: 'cand-vp-2', candidate_name: 'Ekechukwu Victor', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '8', position: 'Vice President', candidate_id: 'cand-vp-2', candidate_name: 'Ekechukwu Victor', timestamp: new Date(Date.now() - 3600000 * 1).toISOString() },

  { id: '9', position: 'General Secretary', candidate_id: 'cand-gs-1', candidate_name: 'Fashola Olamide', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '10', position: 'General Secretary', candidate_id: 'cand-gs-2', candidate_name: 'Yusuf Maryam', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: '11', position: 'General Secretary', candidate_id: 'cand-gs-1', candidate_name: 'Fashola Olamide', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '12', position: 'General Secretary', candidate_id: 'cand-gs-1', candidate_name: 'Fashola Olamide', timestamp: new Date(Date.now() - 3600000 * 1).toISOString() },

  { id: '13', position: 'Assistant General Secretary', candidate_id: 'cand-ags-1', candidate_name: 'Ajayi Peter Timilehin', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '14', position: 'Assistant General Secretary', candidate_id: 'cand-ags-2', candidate_name: 'Bakare Eniola', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: '15', position: 'Assistant General Secretary', candidate_id: 'cand-ags-1', candidate_name: 'Ajayi Peter Timilehin', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '16', position: 'Assistant General Secretary', candidate_id: 'cand-ags-2', candidate_name: 'Bakare Eniola', timestamp: new Date(Date.now() - 3600000 * 1).toISOString() },

  { id: '17', position: 'Treasurer', candidate_id: 'cand-trs-1', candidate_name: 'Ogunsola Samuel', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '18', position: 'Treasurer', candidate_id: 'cand-trs-2', candidate_name: 'Nwosu Chidinma', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: '19', position: 'Treasurer', candidate_id: 'cand-trs-1', candidate_name: 'Ogunsola Samuel', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '20', position: 'Treasurer', candidate_id: 'cand-trs-1', candidate_name: 'Ogunsola Samuel', timestamp: new Date(Date.now() - 3600000 * 1).toISOString() },

  { id: '21', position: 'Financial Secretary', candidate_id: 'cand-fs-1', candidate_name: 'Salami Kehinde', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '22', position: 'Financial Secretary', candidate_id: 'cand-fs-2', candidate_name: 'Lawal Qudus', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: '23', position: 'Financial Secretary', candidate_id: 'cand-fs-1', candidate_name: 'Salami Kehinde', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '24', position: 'Financial Secretary', candidate_id: 'cand-fs-2', candidate_name: 'Lawal Qudus', timestamp: new Date(Date.now() - 3600000 * 1).toISOString() },

  { id: '25', position: 'Public Relations Officer', candidate_id: 'cand-pro-1', candidate_name: 'Adeleke David', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '26', position: 'Public Relations Officer', candidate_id: 'cand-pro-2', candidate_name: 'Nwachukwu Faith', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: '27', position: 'Public Relations Officer', candidate_id: 'cand-pro-1', candidate_name: 'Adeleke David', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '28', position: 'Public Relations Officer', candidate_id: 'cand-pro-1', candidate_name: 'Adeleke David', timestamp: new Date(Date.now() - 3600000 * 1).toISOString() }
];

// Local storage key constants
const STORAGE_VOTERS_KEY = 'nsbs_demo_voters_roster_2026';
const STORAGE_BALLOTS_KEY = 'nsbs_demo_ballots_vault_2026';

function getStoredVoters(): DemoVoteRecord[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_VOTERS;
  try {
    const raw = localStorage.getItem(STORAGE_VOTERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_VOTERS_KEY, JSON.stringify(INITIAL_DEMO_VOTERS));
      return INITIAL_DEMO_VOTERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_VOTERS;
  }
}

function getStoredBallots(): DemoBallotVaultItem[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_BALLOTS;
  try {
    const raw = localStorage.getItem(STORAGE_BALLOTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_BALLOTS_KEY, JSON.stringify(INITIAL_DEMO_BALLOTS));
      return INITIAL_DEMO_BALLOTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_BALLOTS;
  }
}

// Generate Reference Number
export function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NSBS-2026-${code}`;
}

// 3. SERVICE FUNCTIONS

/**
 * Verify if matric number exists in mock biochemistry roster
 */
export function verifyStudentMatric(rawMatric: string): {
  success: boolean;
  student?: DemoStudent;
  alreadyVoted: boolean;
  error?: string;
} {
  const normalized = rawMatric.trim().toUpperCase().replace(/\s+/g, '');
  
  // Look up student
  const student = MOCK_STUDENTS.find(s => s.matric_number.toUpperCase().replace(/\s+/g, '') === normalized);
  
  if (!student) {
    return {
      success: false,
      alreadyVoted: false,
      error: 'Matric number could not be verified. Please check the number and try again.'
    };
  }

  // Check if student has already voted
  const voters = getStoredVoters();
  const alreadyVoted = voters.some(v => v.matric_number.toUpperCase().replace(/\s+/g, '') === normalized);

  return {
    success: true,
    student,
    alreadyVoted
  };
}

/**
 * Check if a matric number has already voted
 */
export function hasStudentVoted(rawMatric: string): boolean {
  const normalized = rawMatric.trim().toUpperCase().replace(/\s+/g, '');
  const voters = getStoredVoters();
  return voters.some(v => v.matric_number.toUpperCase().replace(/\s+/g, '') === normalized);
}

/**
 * Record a vote with strict privacy separation:
 * 1. Accreditation Roster records the matric number and reference number (prevents duplicate vote).
 * 2. Anonymous Ballot Vault records candidate votes without any student identifier.
 */
export async function submitDemoVote(
  matricNumber: string,
  selections: Record<string, string> // { positionTitle: candidateId }
): Promise<{ success: boolean; referenceCode?: string; error?: string }> {
  // Simulate brief network latency for realistic demo feel
  await new Promise(resolve => setTimeout(resolve, 1000));

  const normalizedMatric = matricNumber.trim().toUpperCase().replace(/\s+/g, '');

  const voters = getStoredVoters();
  if (voters.some(v => v.matric_number.toUpperCase().replace(/\s+/g, '') === normalizedMatric)) {
    return {
      success: false,
      error: 'Your vote for this election has already been submitted.'
    };
  }

  const referenceCode = generateReferenceCode();
  const timestamp = new Date().toISOString();

  // 1. Record voter accreditation (Prevents second vote)
  const newVoter: DemoVoteRecord = {
    matric_number: normalizedMatric,
    reference_code: referenceCode,
    timestamp
  };
  const updatedVoters = [newVoter, ...voters];

  // 2. Record anonymous ballots in secret vault
  const currentBallots = getStoredBallots();
  const newBallotItems: DemoBallotVaultItem[] = [];

  for (const [posTitle, candId] of Object.entries(selections)) {
    let candName = 'Unknown Candidate';
    for (const pos of MOCK_POSITIONS) {
      const match = pos.candidates.find(c => c.id === candId);
      if (match) {
        candName = match.name;
        break;
      }
    }

    newBallotItems.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      position: posTitle,
      candidate_id: candId,
      candidate_name: candName,
      timestamp
    });
  }

  const updatedBallots = [...currentBallots, ...newBallotItems];

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_VOTERS_KEY, JSON.stringify(updatedVoters));
      localStorage.setItem(STORAGE_BALLOTS_KEY, JSON.stringify(updatedBallots));
      // Dispatch event to notify any active components (e.g., Admin Dashboard)
      window.dispatchEvent(new Event('demoElectionVotesUpdated'));
    } catch (err) {
      console.error('Storage error:', err);
    }
  }

  return {
    success: true,
    referenceCode
  };
}

/**
 * Get comprehensive election statistics for Admin Dashboard & Portal
 */
export function getDemoElectionStats(): DemoElectionStats {
  const voters = getStoredVoters();
  const ballots = getStoredBallots();

  const votesCastCount = voters.length;
  const eligibleVoters = TOTAL_DEPARTMENT_REGISTERED_STUDENTS;
  const remainingVoters = Math.max(0, eligibleVoters - votesCastCount);
  const turnoutPercentage = Math.round((votesCastCount / eligibleVoters) * 100);

  // Compute candidate tallies
  const tallies: Record<string, number> = {};
  for (const ballot of ballots) {
    tallies[ballot.candidate_id] = (tallies[ballot.candidate_id] || 0) + 1;
  }

  return {
    registered_voters: TOTAL_DEPARTMENT_REGISTERED_STUDENTS,
    eligible_voters: eligibleVoters,
    votes_cast: votesCastCount,
    remaining_voters: remainingVoters,
    turnout_percentage: turnoutPercentage,
    status: 'open',
    election_title: 'NSBS ELECTION 2026',
    candidate_tallies: tallies
  };
}

/**
 * Reset demo election state back to default baseline
 */
export function resetDemoElectionState(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_VOTERS_KEY, JSON.stringify(INITIAL_DEMO_VOTERS));
      localStorage.setItem(STORAGE_BALLOTS_KEY, JSON.stringify(INITIAL_DEMO_BALLOTS));
      window.dispatchEvent(new Event('demoElectionVotesUpdated'));
    } catch (err) {
      console.error(err);
    }
  }
}
