'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, Landmark, BookOpen, CreditCard, Newspaper, Calendar, MessageSquare, 
  Users, BarChart3, LogOut, Check, X, Plus, Trash2, Edit3, Settings, 
  Download, FileText, Vote, Sparkles, User, Mail, Info, Clock 
} from 'lucide-react';
import { 
  getSettings, updateSettings, getSocialLinks, updateSocialLink,
  getLibraryResources, addLibraryResource, deleteLibraryResource,
  getPastQuestions, addPastQuestion, deletePastQuestion,
  getNewsArticles, addNewsArticle, editNewsArticle, deleteNewsArticle,
  getComments, approveComment, deleteComment,
  getEvents, addEvent, deleteEvent, editEvent,
  getElections, addElection, updateElectionStatus, deleteElection,
  getCandidates, addCandidate, deleteCandidate,
  getVotes, getPaymentRecords, verifyPayment,
  getStaffAccounts, addStaffAccount, deleteStaffAccount
} from '@/lib/db';
import { 
  SiteSettings, SocialMediaLink, LibraryResource, PastQuestion, 
  NewsArticle, Comment, ActivityEvent, Election, Candidate, Vote as VoteType, PaymentRecord, StaffAccount 
} from '@/lib/types';


const DEFAULT_COURSE_FOLDERS: Record<string, Record<string, string[]>> = {
  '100': {
    'First': ['MTH 101', 'COS 101', 'PHY 101', 'CHM 101', 'BIO 101', 'GST 111', 'LIS 199', 'FRN 199'],
    'Second': ['MTH 102', 'COS 102', 'PHY 102', 'CHM 102', 'BIO 102', 'GST 112', 'EMT 192']
  },
  '200': {
    'First': [
      'ENT 211', 'BCH 201', 'STA 203', 'UNILESA-BIO 201', 
      'UNILESA-CHM 291', 'UNILESA-MCS 291', 'UNILESA-BIO 203', 'UNILESA-GSE 297'
    ],
    'Second': [
      'GST 212', 'BCH 202', 'UNILESA-BIO 294', 'UNILESA-CHM 290', 
      'UNILESA-CHM 292', 'UNILESA-BCH 294', 'UNILESA-BCH 296', 
      'UNILESA-BCH 298', 'UNILESA-BIO 292', 'UNILESA-GSE 298'
    ]
  },
  '300': {
    'First': ['MCB 309', 'BCH 303', 'BCH 305', 'BCH 307', 'UNILESA BCH 393', 'BCH 309', 'UNILESA BCH 395', 'BCH 301'],
    'Second': ['CHM 396', 'BCH 302', 'BCH 394', 'BCH 304', 'GST 312', 'BCH 306', 'BCH 308', 'BCH 390', 'ENT 312']
  }
};

export default function AdminDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'settings' | 'library' | 'payments' | 'news' | 'comments' | 'events' | 'staff_mgmt'>('analytics');

  // Role & profile states
  const [role, setRole] = useState<'super_admin' | 'staff'>('super_admin');
  const [userName, setUserName] = useState<string>('Super Admin');
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);

  // Staff registration inputs
  const [staffNameInput, setStaffNameInput] = useState('');
  const [staffEmailInput, setStaffEmailInput] = useState('');
  const [staffPasswordInput, setStaffPasswordInput] = useState('');

  // Premium file uploader states
  const [libFile, setLibFile] = useState<File | null>(null);
  const [libUploading, setLibUploading] = useState(false);
  const [libProgress, setLibProgress] = useState(0);

  const [pqFile, setPqFile] = useState<File | null>(null);
  const [pqUploading, setPqUploading] = useState(false);
  const [pqProgress, setPqProgress] = useState(0);
  const pqSizeStr = pqFile ? (pqFile.size / (1024 * 1024)).toFixed(1) + ' MB' : '';

  // Database States
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [socials, setSocials] = useState<SocialMediaLink[]>([]);
  const [library, setLibrary] = useState<LibraryResource[]>([]);
  const [pastQs, setPastQs] = useState<PastQuestion[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Selected Election for candidates management
  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const [electionCandidates, setElectionCandidates] = useState<Candidate[]>([]);
  const [electionVotes, setElectionVotes] = useState<VoteType[]>([]);

  // Refresh trigger state
  const [refreshKey, setRefreshKey] = useState(0);

  // Authenticate Admin & Set Role
  useEffect(() => {
    const session = sessionStorage.getItem('nsbs_admin_session');
    if (session !== 'true') {
      router.push('/admin');
    } else {
      const storedRole = sessionStorage.getItem('nsbs_admin_role') as 'super_admin' | 'staff' || 'super_admin';
      const storedName = sessionStorage.getItem('nsbs_admin_name') || 'Super Admin';
      setRole(storedRole);
      setUserName(storedName);
      setAuthorized(true);
    }
  }, [router]);

  // Automated cleanup for mistakenly added BCH 201 in 100 Level
  useEffect(() => {
    if (!authorized) return;
    
    const cleanupMistakenResource = async () => {
      try {
        const badLib = library.find(r => r.course_code.trim().toUpperCase() === 'BCH 201' && r.level === '100' && r.semester === 'First');
        if (badLib) {
          await deleteLibraryResource(badLib.id);
          triggerRefresh();
        }
        
        const badPq = pastQs.find(q => q.course_code.trim().toUpperCase() === 'BCH 201' && q.level === '100' && q.semester === 'First');
        if (badPq) {
          await deletePastQuestion(badPq.id);
          triggerRefresh();
        }
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    };
    cleanupMistakenResource();
  }, [authorized, library, pastQs]);

  // Fetch all dashboard data
  useEffect(() => {
    if (!authorized) return;

    const fetchAllData = async () => {
      try {
        const s = await getSettings();
        const sl = await getSocialLinks();
        const lib = await getLibraryResources();
        const pq = await getPastQuestions();
        const nw = await getNewsArticles();
        const comm = await getComments();
        const ev = await getEvents();
        const el = await getElections();
        const pay = await getPaymentRecords();

        setSettings(s);
        setSocials(sl);
        setLibrary(lib);
        setPastQs(pq);
        setNews(nw);
        setComments(comm);
        setEvents(ev);
        setElections(el);
        setPayments(pay);

        if (el.length > 0 && !selectedElectionId) {
          setSelectedElectionId(el[0].id);
        }

        // Fetch staff list if Super Admin
        const storedRole = sessionStorage.getItem('nsbs_admin_role');
        if (storedRole === 'super_admin') {
          const list = await getStaffAccounts();
          setStaffList(list);
        }
      } catch (err) {
        console.error("Dashboard failed loading:", err);
      }
    };
    fetchAllData();
  }, [authorized, refreshKey]);

  // Fetch candidates & votes for selected election
  useEffect(() => {
    if (selectedElectionId) {
      getCandidates(selectedElectionId).then(setElectionCandidates);
      getVotes(selectedElectionId).then(setElectionVotes);
    }
  }, [selectedElectionId, refreshKey]);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);


  const handleLogout = () => {
    sessionStorage.removeItem('nsbs_admin_session');
    router.push('/admin');
  };

  // ==========================================
  // TAB PANELS SUB-LOGIC
  // ==========================================

  // 1. SITE SETTINGS LOGIC
  const [editSettings, setEditSettings] = useState<Partial<SiteSettings>>({});
  useEffect(() => {
    if (settings) {
      setEditSettings(settings);
    }
  }, [settings]);

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings(editSettings);
      
      // Notify Header & Footer components to live-update layout settings
      window.dispatchEvent(new Event('settingsUpdated'));
      
      alert("Portal settings updated successfully!");
      triggerRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    }
  };

  const [igUrl, setIgUrl] = useState('');
  const [igUser, setIgUser] = useState('');
  const [tkUrl, setTkUrl] = useState('');
  const [tkUser, setTkUser] = useState('');

  useEffect(() => {
    if (socials.length > 0) {
      const ig = socials.find(s => s.platform === 'instagram');
      if (ig) { setIgUrl(ig.url); setIgUser(ig.username); }
      const tk = socials.find(s => s.platform === 'tiktok');
      if (tk) { setTkUrl(tk.url); setTkUser(tk.username); }
    }
  }, [socials]);

  const handleSocialsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ig = socials.find(s => s.platform === 'instagram');
      const tk = socials.find(s => s.platform === 'tiktok');
      
      if (ig) await updateSocialLink(ig.id, igUrl, igUser);
      if (tk) await updateSocialLink(tk.id, tkUrl, tkUser);

      alert("Social links updated successfully!");
      triggerRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to update social links.");
    }
  };

  // 2. LIBRARY & PAST QUESTIONS UPLOADS
  const [libTitle, setLibTitle] = useState('');
  const [libDesc, setLibDesc] = useState('');
  const [libCourse, setLibCourse] = useState('');
  const [libLevel, setLibLevel] = useState<'100' | '200' | '300' | '400' | 'misc'>('100');
  const [libSemester, setLibSemester] = useState<'First' | 'Second'>('First');
  const [libType, setLibType] = useState('PDF');
  const [libSize, setLibSize] = useState('2.5 MB');

  const [pqTitle, setPqTitle] = useState('');
  const [pqCourse, setPqCourse] = useState('');
  const [pqLevel, setPqLevel] = useState('100');
  const [pqSemester, setPqSemester] = useState('First');
  const [pqSession, setPqSession] = useState('2025/2026');
  const [libIsNewCourse, setLibIsNewCourse] = useState(false);
  const [pqIsNewCourse, setPqIsNewCourse] = useState(false);

  // Helper to fetch all unique course code folders for a given level and semester
  const getExistingCourseCodes = (level: string, semester: string) => {
    if (level === 'misc') return [];
    const staticCodes = DEFAULT_COURSE_FOLDERS[level]?.[semester] || [];
    
    // Dynamic codes from library materials
    const libCodes = library
      .filter(r => r.level === level && r.semester === semester)
      .map(r => r.course_code.trim().toUpperCase());
      
    // Dynamic codes from past questions
    const pqCodes = pastQs
      .filter(q => q.level === level && q.semester === semester)
      .map(q => q.course_code.trim().toUpperCase());
      
    const allUnique = Array.from(new Set([...staticCodes, ...libCodes, ...pqCodes]));
    return allUnique.filter(Boolean).sort();
  };

  // Sync course input forms when level or semester changes
  useEffect(() => {
    if (libLevel === 'misc') {
      setLibCourse('MISC');
      setLibIsNewCourse(false);
    } else {
      const existing = getExistingCourseCodes(libLevel, libSemester);
      if (existing.length > 0) {
        setLibIsNewCourse(false);
        setLibCourse('');
      } else {
        setLibIsNewCourse(true);
        setLibCourse('');
      }
    }
  }, [libLevel, libSemester, library, pastQs]);

  useEffect(() => {
    const existing = getExistingCourseCodes(pqLevel, pqSemester);
    if (existing.length > 0) {
      setPqIsNewCourse(false);
      setPqCourse('');
    } else {
      setPqIsNewCourse(true);
      setPqCourse('');
    }
  }, [pqLevel, pqSemester, library, pastQs]);

  // File selection and parsing helpers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, isPq: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
      const lastDot = file.name.lastIndexOf('.');
      const cleanName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
      
      if (isPq) {
        setPqFile(file);
        setPqTitle(cleanName);
      } else {
        setLibFile(file);
        setLibType(ext);
        setLibSize(sizeStr);
        setLibTitle(cleanName);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isPq: boolean) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
      const lastDot = file.name.lastIndexOf('.');
      const cleanName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
      
      if (isPq) {
        setPqFile(file);
        setPqTitle(cleanName);
      } else {
        setLibFile(file);
        setLibType(ext);
        setLibSize(sizeStr);
        setLibTitle(cleanName);
      }
    }
  };



  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffNameInput || !staffEmailInput || !staffPasswordInput) return;
    try {
      await addStaffAccount({
        name: staffNameInput,
        email: staffEmailInput,
        password: staffPasswordInput
      });
      alert(`Staff credentials created successfully for ${staffNameInput}!`);
      setStaffNameInput('');
      setStaffEmailInput('');
      setStaffPasswordInput('');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to create staff account.");
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff account? They will lose access immediately.")) return;
    try {
      await deleteStaffAccount(id);
      alert("Staff account deleted successfully!");
      triggerRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to delete staff account.");
    }
  };

  const handleLibUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libTitle || !libCourse) return;

    setLibUploading(true);
    setLibProgress(0);

    const interval = setInterval(() => {
      setLibProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    setTimeout(async () => {
      try {
        await addLibraryResource({
          title: libTitle,
          description: libDesc || 'No description provided.',
          course_code: libCourse.toUpperCase(),
          level: libLevel,
          semester: libSemester,
          file_url: '#', // Mock file URL
          file_type: libType,
          file_size: libSize
        });
        alert("Learning resource uploaded successfully!");
        setLibTitle('');
        setLibDesc('');
        setLibCourse('');
        setLibFile(null);
        triggerRefresh();
      } catch (err) {
        console.error(err);
      } finally {
        setLibUploading(false);
      }
    }, 1200);
  };

  const handlePqUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pqTitle || !pqCourse) return;

    setPqUploading(true);
    setPqProgress(0);

    const interval = setInterval(() => {
      setPqProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    setTimeout(async () => {
      try {
        await addPastQuestion({
          title: pqTitle,
          course_code: pqCourse.toUpperCase(),
          level: pqLevel,
          semester: pqSemester,
          academic_session: pqSession,
          file_url: '#'
        });
        alert("Exam past question uploaded successfully!");
        setPqTitle('');
        setPqCourse('');
        setPqFile(null);
        triggerRefresh();
      } catch (err) {
        console.error(err);
      } finally {
        setPqUploading(false);
      }
    }, 1200);
  };


  const handleResourceDelete = async (id: string, isPq: boolean) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    if (isPq) {
      await deletePastQuestion(id);
    } else {
      await deleteLibraryResource(id);
    }
    triggerRefresh();
  };

  // 3. PAYMENT APPROVALS
  const handleVerifyPayment = async (id: string, status: 'Approved' | 'Rejected') => {
    if (!confirm(`Are you sure you want to mark this transaction as ${status}?`)) return;
    try {
      await verifyPayment(id, status);
      alert(`Dues payment status updated to ${status}.`);
      triggerRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // 4. NEWS ARTICLES
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState('Departmental Announcements');
  const [newsContent, setNewsContent] = useState('');
  const [newsImg, setNewsImg] = useState('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800');
  const [newsAuthor, setNewsAuthor] = useState('NSBS Admin');
  const [newsTags, setNewsTags] = useState('News, Chemistry');

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle || !newsContent) return;
    try {
      await addNewsArticle({
        title: newsTitle,
        content: newsContent,
        category: newsCategory,
        featured_image: newsImg,
        author: newsAuthor,
        tags: newsTags.split(',').map(t => t.trim())
      });
      alert("News article published successfully!");
      setNewsTitle('');
      setNewsContent('');
      triggerRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article? All related comments will be deleted.")) return;
    await deleteNewsArticle(id);
    triggerRefresh();
  };

  // 5. COMMENTS MODERATION
  const handleApproveComment = async (id: string) => {
    await approveComment(id);
    alert("Comment approved!");
    triggerRefresh();
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Delete comment?")) return;
    await deleteComment(id);
    triggerRefresh();
  };

  // 6. EVENTS & ELECTIONS
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtVenue, setEvtVenue] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtImg, setEvtImg] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800');
  const [evtReg, setEvtReg] = useState('');

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle || !evtDate || !evtVenue) return;
    try {
      await addEvent({
        title: evtTitle,
        description: evtDesc || 'Join us for this event.',
        venue: evtVenue,
        date: new Date(evtDate).toISOString(),
        poster_url: evtImg,
        registration_link: evtReg || undefined
      });
      alert("Event added!");
      setEvtTitle('');
      setEvtDesc('');
      setEvtVenue('');
      setEvtDate('');
      setEvtReg('');
      triggerRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await deleteEvent(id);
    triggerRefresh();
  };

  // E-voting controls
  const [electTitle, setElectTitle] = useState('');
  const [electDesc, setElectDesc] = useState('');

  const handleAddElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!electTitle) return;
    try {
      await addElection({
        title: electTitle,
        description: electDesc,
        status: 'upcoming'
      });
      alert("New election board created!");
      setElectTitle('');
      setElectDesc('');
      triggerRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleElectionStatus = async (id: string, status: 'upcoming' | 'open' | 'closed') => {
    await updateElectionStatus(id, status);
    
    // Notify e-voting pages to refresh
    window.dispatchEvent(new Event('electionsUpdated'));
    
    alert(`Election is now: ${status.toUpperCase()}`);
    triggerRefresh();
  };

  const handleDeleteElection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this election? ALL candidates and votes will be permanently deleted!")) return;
    await deleteElection(id);
    setSelectedElectionId('');
    triggerRefresh();
  };

  // Candidates creation
  const [candName, setCandName] = useState('');
  const [candPos, setCandPos] = useState('President');
  const [candPhoto, setCandPhoto] = useState('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300');
  const [candManifesto, setCandManifesto] = useState('');

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName || !selectedElectionId) return;
    try {
      await addCandidate({
        election_id: selectedElectionId,
        name: candName,
        position: candPos,
        photo_url: candPhoto,
        manifesto: candManifesto
      });
      alert("Candidate added to ballot!");
      setCandName('');
      setCandManifesto('');
      triggerRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    if (!confirm("Delete candidate from ballot?")) return;
    await deleteCandidate(id);
    triggerRefresh();
  };

  // Export results to file
  const handleExportVotes = () => {
    const elect = elections.find(e => e.id === selectedElectionId);
    if (!elect) return;

    // Calculate aggregated results
    const results = electionCandidates.map(cand => {
      const voteCount = electionVotes.filter(v => v.candidate_id === cand.id).length;
      return {
        Candidate: cand.name,
        Position: cand.position,
        VotesCast: voteCount
      };
    });

    const fileData = {
      ElectionTitle: elect.title,
      Status: elect.status,
      TotalVotesRecorded: electionVotes.length,
      ResultsSummary: results,
      AuditedVotesLogs: electionVotes
    };

    const blob = new Blob([JSON.stringify(fileData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ELECTION_RESULTS_${elect.title.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate high-level Analytics KPI metrics
  const totalDuesCollected = payments.filter(p => p.payment_status === 'Approved').reduce((s, p) => s + Number(p.amount_paid), 0);
  const totalPendingPayments = payments.filter(p => p.payment_status === 'Pending Verification').length;
  const totalCommentsCount = comments.length;
  const pendingCommentsCount = comments.filter(c => !c.is_approved).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-white shrink-0 flex flex-col justify-between p-6 md:min-h-screen">
        <div className="space-y-8">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/15 border border-secondary/35 text-secondary">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-wider uppercase text-slate-100">NSBS CMS</h2>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">
                {role === 'super_admin' ? 'Super Admin Portal' : 'Staff Portal'}
              </span>
            </div>
          </div>

          {/* Nav list */}
          <nav className="flex flex-col gap-1 text-slate-300">
            {[
              { id: 'analytics', label: 'Dashboard Home', icon: BarChart3, visible: true },
              { id: 'settings', label: 'Site Settings', icon: Settings, visible: role === 'super_admin' },
              { id: 'library', label: 'Manage Library', icon: BookOpen, visible: true },
              { id: 'payments', label: 'Dues Payments', icon: CreditCard, count: totalPendingPayments, visible: role === 'super_admin' },
              { id: 'news', label: 'News Articles', icon: Newspaper, visible: role === 'super_admin' },
              { id: 'comments', label: 'Comment Mod', icon: MessageSquare, count: pendingCommentsCount, visible: role === 'super_admin' },
              { id: 'events', label: 'Events & Voting', icon: Calendar, visible: role === 'super_admin' },
              { id: 'staff_mgmt', label: 'Manage Staff', icon: Users, visible: role === 'super_admin' },
            ].filter(item => item.visible).map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-premium ${
                    active 
                      ? 'bg-secondary text-white shadow-md' 
                      : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4.5 h-4.5" /> {item.label}
                  </span>
                  {item.count && item.count > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-extrabold animate-pulse">
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="pt-6 border-t border-white/5 mt-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-premium cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" /> Logout Session
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <main className="flex-grow flex flex-col min-h-screen">
        
        {/* Workspace Header */}
        <header className="bg-white border-b border-slate-200 py-4.5 px-6 sm:px-8 flex items-center justify-between shadow-sm">
          <h2 className="font-extrabold text-slate-800 text-base sm:text-lg tracking-tight uppercase flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-secondary" /> {role === 'super_admin' ? 'Visual CMS Dashboard' : 'Staff Learning CMS'}
          </h2>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-extrabold text-slate-800">{userName}</p>
              <p className="text-[9px] text-slate-400 uppercase font-semibold">
                {role === 'super_admin' ? 'Super Administrator' : 'Departmental Staff'} &bull; NSBS UNILESA
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
              <User className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </header>


        {/* Tab Panel Render Grid */}
        <div className="flex-grow p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          
          {/* ========================================== */}
          {/* PANEL 1: ANALYTICS */}
          {/* ========================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Premium Welcome Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-white/10">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_30%_30%,#10b981_0%,transparent_50%),radial-gradient(circle_at_70%_70%,#f59e0b_0%,transparent_50%)]" />
                <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/15 px-3 py-1 rounded-full border border-secondary/35">
                      {role === 'super_admin' ? 'Super Administrator Access' : 'Departmental Staff Access'}
                    </span>
                    <h3 className="font-extrabold text-2xl tracking-tight text-white mt-3.5">
                      Welcome Back, {userName}
                    </h3>
                    <p className="text-slate-350 text-xs mt-1 max-w-xl leading-relaxed">
                      {role === 'super_admin'
                        ? 'Manage biochemistry students, approve departmental dues payments, edit settings, publish news, and coordinate elections from this super administration console.'
                        : 'Access tools to publish, edit, and categorize course lecture notes, syllabus resources, and past examination papers for students.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('library')}
                      className="px-4 py-2.5 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-premium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Upload Documents
                    </button>
                  </div>
                </div>
              </div>

              {role === 'super_admin' ? (
                <>
                  <h3 className="font-extrabold text-slate-800 text-lg">System Metrics Overview</h3>

                  {/* KPI Cards Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    
                    {/* Collected Dues */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                        <Landmark className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block leading-tight">Dues Revenue</span>
                        <span className="text-xl font-extrabold text-slate-800">N{totalDuesCollected.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Pending verification */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block leading-tight">Pending Verifies</span>
                        <span className="text-xl font-extrabold text-slate-800">{totalPendingPayments} students</span>
                      </div>
                    </div>

                    {/* Library items */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-sky-100 text-sky-600 rounded-xl">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block leading-tight">Library files</span>
                        <span className="text-xl font-extrabold text-slate-800">{library.length + pastQs.length} resources</span>
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block leading-tight">All Comments</span>
                        <span className="text-xl font-extrabold text-slate-800">{totalCommentsCount} ({pendingCommentsCount} pend)</span>
                      </div>
                    </div>

                  </div>

                  {/* Recent Dues Records Table */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-sm">Recent Student Payment Submissions</h4>
                    {payments.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400">No payment logs recorded.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-bold">
                              <th className="py-2.5">Matric Number</th>
                              <th className="py-2.5">Student Name</th>
                              <th className="py-2.5">Level/Session</th>
                              <th className="py-2.5">Date Submitted</th>
                              <th className="py-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {payments.slice(0, 5).map(pay => (
                              <tr key={pay.id} className="hover:bg-slate-50">
                                <td className="py-3 font-semibold uppercase">{pay.matric_number}</td>
                                <td className="py-3">{pay.surname} {pay.first_name}</td>
                                <td className="py-3">{pay.level}L ({pay.academic_session})</td>
                                <td className="py-3">{new Date(pay.created_at).toLocaleDateString()}</td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    pay.payment_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                    pay.payment_status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {pay.payment_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-extrabold text-slate-800 text-lg">Academic Repository Overview</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Course Resources */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-4 bg-emerald-50 text-secondary rounded-xl border border-emerald-100">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block leading-tight">Course Handouts</span>
                        <span className="text-2xl font-black text-slate-800 mt-1 block">{library.length} items</span>
                      </div>
                    </div>

                    {/* Past Questions */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-4 bg-amber-50 text-accent rounded-xl border border-amber-100">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block leading-tight">Past Examination Papers</span>
                        <span className="text-2xl font-black text-slate-800 mt-1 block">{pastQs.length} papers</span>
                      </div>
                    </div>

                    {/* Combined Repository Size */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-4 bg-sky-55 text-sky-600 rounded-xl border border-sky-100">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block leading-tight">Total catalog size</span>
                        <span className="text-2xl font-black text-slate-800 mt-1 block">{library.length + pastQs.length} assets</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Guide */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                      <Info className="w-4.5 h-4.5 text-secondary animate-bounce" /> Lecturer Quick Uploading Instructions
                    </h4>
                    <ul className="text-slate-600 text-xs space-y-3.5 pl-2 leading-relaxed list-disc">
                      <li>Use the <strong>Manage Library</strong> tab in the sidebar to upload files directly into the Academic Library and Past Questions folders.</li>
                      <li>For general lecture handouts, syllabus updates, or lab manuals, upload them under <strong>Upload Library Resource Material</strong>. You can categorize by level (100L-400L or Miscellaneous) and semester.</li>
                      <li>For past examination booklets or test questionnaires, upload them under <strong>Upload Examination Past Question</strong>.</li>
                      <li>Drag and drop files from your computer to automatically parse file names, extensions, and file sizes.</li>
                      <li>Once uploaded, documents are instantly available to students in real-time under the student portal's main catalog and search folders.</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}


          {/* ========================================== */}
          {/* PANEL 2: SITE SETTINGS */}
          {/* ========================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="font-extrabold text-slate-800 text-lg">Edit Website Content Blocks</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. General Config & Bank details */}
                <form onSubmit={handleSettingsSave} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Landmark className="w-4.5 h-4.5 text-secondary" /> Dues Price & Bank transfer Details
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Dues Price (Naira)</label>
                      <input
                        type="number"
                        value={editSettings.dues_amount || 0}
                        onChange={(e) => setEditSettings({ ...editSettings, dues_amount: Number(e.target.value) })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Treasurer WhatsApp</label>
                      <input
                        type="text"
                        value={editSettings.treasurer_whatsapp || ''}
                        onChange={(e) => setEditSettings({ ...editSettings, treasurer_whatsapp: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Bank Name</label>
                    <input
                      type="text"
                      value={editSettings.bank_name || ''}
                      onChange={(e) => setEditSettings({ ...editSettings, bank_name: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Account Name</label>
                      <input
                        type="text"
                        value={editSettings.account_name || ''}
                        onChange={(e) => setEditSettings({ ...editSettings, account_name: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Account Number</label>
                      <input
                        type="text"
                        value={editSettings.account_number || ''}
                        onChange={(e) => setEditSettings({ ...editSettings, account_number: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 pt-2 flex items-center gap-1.5">
                    <Sparkles className="w-4.5 h-4.5 text-secondary" /> Hero Section Content
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Welcome Title</label>
                    <input
                      type="text"
                      value={editSettings.hero_title || ''}
                      onChange={(e) => setEditSettings({ ...editSettings, hero_title: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Description Subtext</label>
                    <textarea
                      rows={3}
                      value={editSettings.hero_description || ''}
                      onChange={(e) => setEditSettings({ ...editSettings, hero_description: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Hero Background image Link</label>
                    <input
                      type="text"
                      value={editSettings.hero_bg_url || ''}
                      onChange={(e) => setEditSettings({ ...editSettings, hero_bg_url: e.target.value })}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">NSBS Logo URL / Path</label>
                      <input
                        type="text"
                        value={editSettings.logo_nsbs_url || ''}
                        onChange={(e) => setEditSettings({ ...editSettings, logo_nsbs_url: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">School Logo URL / Path</label>
                      <input
                        type="text"
                        value={editSettings.logo_unilesa_url || ''}
                        onChange={(e) => setEditSettings({ ...editSettings, logo_unilesa_url: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary hover:bg-secondary text-white font-extrabold text-xs rounded-xl shadow transition-premium cursor-pointer"
                  >
                    Save Site settings
                  </button>
                </form>

                {/* 2. Statements & Social links */}
                <div className="space-y-6">
                  
                  {/* Mission / Vision Statement editor */}
                  <form onSubmit={handleSettingsSave} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Info className="w-4.5 h-4.5 text-secondary" /> Mission & Vision Statements
                    </h4>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Vision Statement</label>
                      <textarea
                        rows={3}
                        value={editSettings.vision_statement || ''}
                        onChange={(e) => setEditSettings({ ...editSettings, vision_statement: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Mission Statement</label>
                      <textarea
                        rows={3}
                        value={editSettings.mission_statement || ''}
                        onChange={(e) => setEditSettings({ ...editSettings, mission_statement: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Footer Description</label>
                      <textarea
                        rows={2}
                        value={editSettings.footer_description || ''}
                        onChange={(e) => setEditSettings({ ...editSettings, footer_description: e.target.value })}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-primary hover:bg-secondary text-white font-extrabold text-xs rounded-xl shadow transition-premium cursor-pointer"
                    >
                      Save Statements
                    </button>
                  </form>

                  {/* Social links editor */}
                  <form onSubmit={handleSocialsSave} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Users className="w-4.5 h-4.5 text-secondary" /> Social Media Updates Channels
                    </h4>



                    {/* Instagram fields */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Instagram Username</label>
                        <input
                          type="text"
                          value={igUser}
                          onChange={(e) => setIgUser(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Instagram URL</label>
                        <input
                          type="text"
                          value={igUrl}
                          onChange={(e) => setIgUrl(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                        />
                      </div>
                    </div>

                    {/* TikTok fields */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">TikTok Username</label>
                        <input
                          type="text"
                          value={tkUser}
                          onChange={(e) => setTkUser(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">TikTok URL</label>
                        <input
                          type="text"
                          value={tkUrl}
                          onChange={(e) => setTkUrl(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-primary hover:bg-secondary text-white font-extrabold text-xs rounded-xl shadow transition-premium cursor-pointer"
                    >
                      Save Social Links
                    </button>
                  </form>

                </div>

              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* PANEL 3: LIBRARY MANAGEMENT */}
          {/* ========================================== */}
          {activeTab === 'library' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Upload Library Material form */}
                <form onSubmit={handleLibUpload} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4.5 h-4.5 text-secondary" /> Upload Library Resource Material
                  </h4>

                  {/* Drag-and-Drop Uploader for Library */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Document File *</label>
                    {libFile ? (
                      <div className="p-4 bg-emerald-55/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5.5 h-5.5 text-secondary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 truncate max-w-[200px]" title={libFile.name}>
                              {libFile.name}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                              {libSize} &bull; {libType}
                            </p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setLibFile(null); setLibTitle(''); }}
                          className="text-slate-450 hover:text-rose-500 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 hover:bg-rose-50 rounded-lg transition-premium cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div 
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={(e) => handleDrop(e, false)}
                        className="border-2 border-dashed border-slate-200 hover:border-secondary rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-premium"
                        onClick={() => document.getElementById('lib-file-input')?.click()}
                      >
                        <input 
                          id="lib-file-input"
                          type="file" 
                          className="hidden" 
                          onChange={(e) => handleFileChange(e, false)}
                          accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls"
                        />
                        <BookOpen className="w-8 h-8 text-slate-450 mx-auto mb-2 animate-pulse" />
                        <p className="text-xs font-bold text-slate-700">Drag & Drop Handout File here</p>
                        <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">or click to browse local folders</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Document Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Introduction to Biochemistry"
                      value={libTitle}
                      onChange={(e) => setLibTitle(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Course Code *</label>
                      {libLevel === 'misc' ? (
                        <input
                          type="text"
                          disabled
                          value="MISC"
                          className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-100 text-slate-400 font-bold"
                        />
                      ) : (() => {
                        const existingCourses = getExistingCourseCodes(libLevel, libSemester);
                        if (existingCourses.length > 0) {
                          return !libIsNewCourse ? (
                            <select
                              value={libCourse}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__new__') {
                                  setLibIsNewCourse(true);
                                  setLibCourse('');
                                } else {
                                  setLibCourse(val);
                                }
                              }}
                              required
                              className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-bold"
                            >
                              <option value="">-- Select Course --</option>
                              {existingCourses.map(code => (
                                <option key={code} value={code}>{code}</option>
                              ))}
                              <option value="__new__" className="text-secondary font-bold">+ Create New Course</option>
                            </select>
                          ) : (
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                required
                                placeholder="New Code (e.g. BCH 201)"
                                value={libCourse}
                                onChange={(e) => setLibCourse(e.target.value)}
                                className="block w-full min-w-0 px-2 py-2.5 border border-slate-200 rounded-xl text-[10px] bg-slate-50 uppercase"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLibIsNewCourse(false);
                                  setLibCourse('');
                                }}
                                className="px-2 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-xl shrink-0 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <input
                              type="text"
                              required
                              placeholder="e.g. BCH 201"
                              value={libCourse}
                              onChange={(e) => setLibCourse(e.target.value)}
                              className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 uppercase"
                            />
                          );
                        }
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Level</label>
                        <select
                          value={libLevel}
                          onChange={(e) => setLibLevel(e.target.value as any)}
                          className="block w-full px-2 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700"
                        >
                          <option value="100">100L</option>
                          <option value="200">200L</option>
                          <option value="300">300L</option>
                          <option value="400">400L</option>
                          <option value="misc">Misc</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Semester</label>
                        <select
                          value={libSemester}
                          disabled={libLevel === 'misc'}
                          onChange={(e) => setLibSemester(e.target.value as any)}
                          className="block w-full px-2 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="First">First</option>
                          <option value="Second">Second</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">File Type (PDF, DOCX, etc.)</label>
                      <input
                        type="text"
                        placeholder="PDF"
                        value={libType}
                        onChange={(e) => setLibType(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">File Size</label>
                      <input
                        type="text"
                        placeholder="2.5 MB"
                        value={libSize}
                        onChange={(e) => setLibSize(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Description / Syllabus</label>
                    <textarea
                      rows={3}
                      placeholder="Enter a brief summary of what notes cover..."
                      value={libDesc}
                      onChange={(e) => setLibDesc(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  {libUploading ? (
                    <div className="space-y-2 py-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-505">
                        <span>Uploading learning material...</span>
                        <span>{libProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary transition-all duration-150" style={{ width: `${libProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!libFile}
                      className="w-full py-2.5 bg-secondary hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow transition-premium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Upload Learning Material
                    </button>
                  )}
                </form>

                {/* 2. Upload Past Question form */}
                <form onSubmit={handlePqUpload} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <FileText className="w-4.5 h-4.5 text-accent" /> Upload Examination Past Question
                  </h4>

                  {/* Drag-and-Drop Uploader for PQ */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Question Paper PDF *</label>
                    {pqFile ? (
                      <div className="p-4 bg-amber-55/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5.5 h-5.5 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 truncate max-w-[200px]" title={pqFile.name}>
                              {pqFile.name}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                              {pqSizeStr} &bull; PDF
                            </p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setPqFile(null); setPqTitle(''); }}
                          className="text-slate-450 hover:text-rose-500 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 hover:bg-rose-50 rounded-lg transition-premium cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div 
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={(e) => handleDrop(e, true)}
                        className="border-2 border-dashed border-slate-200 hover:border-accent rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-premium"
                        onClick={() => document.getElementById('pq-file-input')?.click()}
                      >
                        <input 
                          id="pq-file-input"
                          type="file" 
                          className="hidden" 
                          onChange={(e) => handleFileChange(e, true)}
                          accept=".pdf"
                        />
                        <FileText className="w-8 h-8 text-slate-450 mx-auto mb-2 animate-pulse" />
                        <p className="text-xs font-bold text-slate-700">Drag & Drop Question Sheet here</p>
                        <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">or click to browse PDF files</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Exam Paper Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BCH 201 First Semester Exam"
                      value={pqTitle}
                      onChange={(e) => setPqTitle(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Course Code *</label>
                      {(() => {
                        const existingCourses = getExistingCourseCodes(pqLevel, pqSemester);
                        if (existingCourses.length > 0) {
                          return !pqIsNewCourse ? (
                            <select
                              value={pqCourse}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__new__') {
                                  setPqIsNewCourse(true);
                                  setPqCourse('');
                                } else {
                                  setPqCourse(val);
                                }
                              }}
                              required
                              className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-bold"
                            >
                              <option value="">-- Select Course --</option>
                              {existingCourses.map(code => (
                                <option key={code} value={code}>{code}</option>
                              ))}
                              <option value="__new__" className="text-secondary font-bold">+ Create New Course</option>
                            </select>
                          ) : (
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                required
                                placeholder="New Code (e.g. BCH 201)"
                                value={pqCourse}
                                onChange={(e) => setPqCourse(e.target.value)}
                                className="block w-full min-w-0 px-2 py-2.5 border border-slate-200 rounded-xl text-[10px] bg-slate-50 uppercase"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setPqIsNewCourse(false);
                                  setPqCourse('');
                                }}
                                className="px-2 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-xl shrink-0 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <input
                              type="text"
                              required
                              placeholder="e.g. BCH 201"
                              value={pqCourse}
                              onChange={(e) => setPqCourse(e.target.value)}
                              className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 uppercase"
                            />
                          );
                        }
                      })()}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Academic Session *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2024/2025"
                        value={pqSession}
                        onChange={(e) => setPqSession(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Level</label>
                      <select
                        value={pqLevel}
                        onChange={(e) => setPqLevel(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700"
                      >
                        <option value="100">100L</option>
                        <option value="200">200L</option>
                        <option value="300">300L</option>
                        <option value="400">400L</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Semester</label>
                      <select
                        value={pqSemester}
                        onChange={(e) => setPqSemester(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700"
                      >
                        <option value="First">First Semester</option>
                        <option value="Second">Second Semester</option>
                      </select>
                    </div>
                  </div>

                  {pqUploading ? (
                    <div className="space-y-2 py-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-505">
                        <span>Uploading question paper...</span>
                        <span>{pqProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent transition-all duration-150" style={{ width: `${pqProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!pqFile}
                      className="w-full py-2.5 bg-accent hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow transition-premium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Upload Exam Questionnaire
                    </button>
                  )}
                </form>

              </div>

              {/* Resource List Table */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm">Library Files Catalog ({library.length + pastQs.length} items)</h4>
                
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold">
                        <th className="py-2.5">Title</th>
                        <th className="py-2.5">Course</th>
                        <th className="py-2.5">Level / Semester</th>
                        <th className="py-2.5">Category</th>
                        <th className="py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {/* 1. Resources */}
                      {library.map(lib => (
                        <tr key={lib.id} className="hover:bg-slate-50">
                          <td className="py-3 font-semibold text-slate-800">{lib.title}</td>
                          <td className="py-3 uppercase font-bold text-secondary">{lib.course_code}</td>
                          <td className="py-3">
                            {lib.level === 'misc' ? (
                              <span className="font-semibold text-slate-500">Miscellaneous</span>
                            ) : (
                              <span>{lib.level}L &bull; {lib.semester} Sem</span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-55 text-emerald-800 font-semibold text-[10px]">
                              Course Material
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleResourceDelete(lib.id, false)}
                              className="p-1.5 text-rose-550 hover:bg-rose-50 rounded-lg transition-premium cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {/* 2. Exam PQs */}
                      {pastQs.map(pq => (
                        <tr key={pq.id} className="hover:bg-slate-50">
                          <td className="py-3 font-semibold text-slate-800">{pq.title} ({pq.academic_session})</td>
                          <td className="py-3 uppercase font-bold text-amber-500">{pq.course_code}</td>
                          <td className="py-3">{pq.level}L &bull; {pq.semester} Sem</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded bg-amber-55 text-amber-800 font-semibold text-[10px]">
                              Exam PQ
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleResourceDelete(pq.id, true)}
                              className="p-1.5 text-rose-550 hover:bg-rose-50 rounded-lg transition-premium cursor-pointer"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* PANEL 4: PAYMENTS APPROVAL */}
          {/* ========================================== */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <h3 className="font-extrabold text-slate-800 text-lg">Student Dues Verification Queue</h3>

              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                {payments.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">No payment records logged in system.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold">
                          <th className="py-3">Matric Number</th>
                          <th className="py-3">Student Name</th>
                          <th className="py-3">Email & Tel</th>
                          <th className="py-3">Level / Session</th>
                          <th className="py-3">Amount</th>
                          <th className="py-3">Status</th>
                          <th className="py-3 text-right">Verify Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {payments.map(pay => (
                          <tr key={pay.id} className="hover:bg-slate-50">
                            <td className="py-4 font-bold uppercase">{pay.matric_number}</td>
                            <td className="py-4 font-semibold text-slate-800">{pay.surname} {pay.first_name} {pay.middle_name || ''}</td>
                            <td className="py-4 text-slate-500">
                              <p>{pay.email}</p>
                              <p>{pay.mobile_number}</p>
                            </td>
                            <td className="py-4">{pay.level}L &bull; {pay.academic_session}</td>
                            <td className="py-4 font-bold text-slate-800">N{pay.amount_paid.toLocaleString()}</td>
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                pay.payment_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                pay.payment_status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {pay.payment_status}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              {pay.payment_status === 'Pending Verification' ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleVerifyPayment(pay.id, 'Approved')}
                                    className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-premium cursor-pointer"
                                    title="Approve Payment"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleVerifyPayment(pay.id, 'Rejected')}
                                    className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg shadow-sm transition-premium cursor-pointer"
                                    title="Reject Payment"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-400">Verified</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* PANEL 5: NEWS MANAGEMENT */}
          {/* ========================================== */}
          {activeTab === 'news' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* News creation form */}
                <form onSubmit={handleAddNews} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">
                    Publish News or Announcement
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Article Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Induction Ceremony announced"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                      <select
                        value={newsCategory}
                        onChange={(e) => setNewsCategory(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700"
                      >
                        <option value="Departmental Announcements">Announcements</option>
                        <option value="Academic Updates">Academic Updates</option>
                        <option value="Scholarships">Scholarships</option>
                        <option value="Research Opportunities">Research Opportunities</option>
                        <option value="Student Achievements">Achievements</option>
                        <option value="General News">General News</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Author Name</label>
                      <input
                        type="text"
                        value={newsAuthor}
                        onChange={(e) => setNewsAuthor(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="induction, 100level, notice"
                      value={newsTags}
                      onChange={(e) => setNewsTags(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Featured Image URL</label>
                    <input
                      type="text"
                      value={newsImg}
                      onChange={(e) => setNewsImg(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Article Content *</label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Write the news article text here..."
                      value={newsContent}
                      onChange={(e) => setNewsContent(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow transition-premium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Publish Article
                  </button>
                </form>

                {/* News Table List */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm">Published Articles ({news.length})</h4>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {news.map(art => (
                      <div key={art.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-250 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-secondary uppercase tracking-wider">{art.category}</span>
                          <h5 className="font-bold text-slate-800 text-xs line-clamp-1">{art.title}</h5>
                          <p className="text-[10px] text-slate-400">By {art.author} &bull; {new Date(art.created_at).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteNews(art.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-premium shrink-0"
                          title="Delete Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* PANEL 6: COMMENTS MODERATION */}
          {/* ========================================== */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              <h3 className="font-extrabold text-slate-800 text-lg">Student Comments Moderation Board</h3>

              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                {comments.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">No comments posted yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold">
                          <th className="py-2.5">Author</th>
                          <th className="py-2.5">Comment Content</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {comments.map(comm => (
                          <tr key={comm.id} className="hover:bg-slate-50">
                            <td className="py-3 font-semibold text-slate-850">
                              <p>{comm.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium font-mono">{comm.email}</p>
                            </td>
                            <td className="py-3 max-w-sm">
                              <p className="text-slate-600 truncate" title={comm.content}>{comm.content}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">Date: {new Date(comm.created_at).toLocaleString()}</p>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                comm.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {comm.is_approved ? 'Approved' : 'Pending Mod'}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex justify-end gap-1">
                                {!comm.is_approved && (
                                  <button
                                    onClick={() => handleApproveComment(comm.id)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    title="Approve Comment"
                                  >
                                    <Check className="w-4.5 h-4.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteComment(comm.id)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                  title="Delete Comment"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* PANEL 7: EVENTS & ELECTIONS */}
          {/* ========================================== */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              
              {/* Event Creation Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Event Creation Form */}
                <form onSubmit={handleAddEvent} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">
                    Create New Departmental Event
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Event Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Biochemistry Annual Symposium"
                      value={evtTitle}
                      onChange={(e) => setEvtTitle(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Date & Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={evtDate}
                        onChange={(e) => setEvtDate(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Venue *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Main Auditorium"
                        value={evtVenue}
                        onChange={(e) => setEvtVenue(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Poster Image URL</label>
                      <input
                        type="text"
                        value={evtImg}
                        onChange={(e) => setEvtImg(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Registration Link (Optional)</label>
                      <input
                        type="text"
                        placeholder="Google forms link..."
                        value={evtReg}
                        onChange={(e) => setEvtReg(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                    <textarea
                      rows={3}
                      value={evtDesc}
                      onChange={(e) => setEvtDesc(e.target.value)}
                      placeholder="Enter details about the event, theme, guest speakers..."
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow transition-premium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Create Event Card
                  </button>
                </form>

                {/* Events list */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm">Active Event Schedules ({events.length})</h4>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {events.map(ev => (
                      <div key={ev.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-250 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h5 className="font-bold text-slate-800 text-xs leading-tight">{ev.title}</h5>
                          <p className="text-[10px] text-slate-400 font-semibold">{ev.venue} &bull; {new Date(ev.date).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-premium shrink-0"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Elections and E-Voting Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
                
                {/* Left: Create Elections & Manage Candidates */}
                <div className="space-y-6">
                  
                  {/* Election Board Creator */}
                  <form onSubmit={handleAddElection} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">
                      Create E-Voting Board
                    </h4>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Election Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. NSBS Executive Elections 2026/2027"
                        value={electTitle}
                        onChange={(e) => setElectTitle(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                      <textarea
                        rows={2}
                        placeholder="Manifesto details, voting periods..."
                        value={electDesc}
                        onChange={(e) => setElectDesc(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow transition-premium flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Create Election Board
                    </button>
                  </form>

                  {/* Add Candidates to active election */}
                  {elections.length > 0 && (
                    <form onSubmit={handleAddCandidate} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                      <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">
                        Add Candidate to active Ballot
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Election Board</label>
                          <select
                            value={selectedElectionId}
                            onChange={(e) => setSelectedElectionId(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700"
                          >
                            {elections.map(el => (
                              <option key={el.id} value={el.id}>{el.title}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Office / Position</label>
                          <select
                            value={candPos}
                            onChange={(e) => setCandPos(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700"
                          >
                            <option value="President">President</option>
                            <option value="Vice President">Vice President</option>
                            <option value="General Secretary">General Secretary</option>
                            <option value="Treasurer">Treasurer</option>
                            <option value="Public Relations Officer">PRO</option>
                            <option value="Welfare Director">Welfare Director</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Candidate Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Odebunmi Babajide"
                          value={candName}
                          onChange={(e) => setCandName(e.target.value)}
                          className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Photo URL</label>
                        <input
                          type="text"
                          value={candPhoto}
                          onChange={(e) => setCandPhoto(e.target.value)}
                          className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Manifesto Summary</label>
                        <textarea
                          rows={3}
                          required
                          placeholder="Candidate's manifesto key points..."
                          value={candManifesto}
                          onChange={(e) => setCandManifesto(e.target.value)}
                          className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-accent hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow transition-premium flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Register Candidate
                      </button>
                    </form>
                  )}

                </div>

                {/* Right: Active Elections control board, results, and exporter */}
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">
                      Election Boards Registry
                    </h4>

                    {elections.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">No elections added yet.</div>
                    ) : (
                      <div className="space-y-4">
                        {elections.map((elect) => {
                          const isSelected = selectedElectionId === elect.id;
                          return (
                            <div 
                              key={elect.id} 
                              onClick={() => setSelectedElectionId(elect.id)}
                              className={`p-4 rounded-2xl border transition-premium cursor-pointer ${
                                isSelected 
                                  ? 'bg-slate-50 border-secondary' 
                                  : 'bg-white border-slate-200 hover:border-slate-350'
                              }`}
                            >
                              <div className="flex justify-between items-center flex-wrap gap-2">
                                <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm">{elect.title}</h5>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  elect.status === 'open' ? 'bg-emerald-100 text-emerald-800 animate-pulse' :
                                  elect.status === 'closed' ? 'bg-slate-200 text-slate-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {elect.status}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-500 leading-normal mt-1">{elect.description}</p>
                              
                              {/* Admin control buttons */}
                              <div className="flex items-center gap-2 pt-4 mt-3 border-t border-slate-150 justify-between">
                                <div className="flex gap-1">
                                  {elect.status !== 'open' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleElectionStatus(elect.id, 'open'); }}
                                      className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[9px] rounded-lg transition-premium cursor-pointer"
                                    >
                                      Open Polls
                                    </button>
                                  )}
                                  {elect.status !== 'closed' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleElectionStatus(elect.id, 'closed'); }}
                                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-black text-white font-bold text-[9px] rounded-lg transition-premium cursor-pointer"
                                    >
                                      Close Polls
                                    </button>
                                  )}
                                  {elect.status !== 'upcoming' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleElectionStatus(elect.id, 'upcoming'); }}
                                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] rounded-lg transition-premium cursor-pointer"
                                    >
                                      Set Draft
                                    </button>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteElection(elect.id); }}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-premium shrink-0"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Candidates & Votes Summary in Selected Election */}
                  {selectedElectionId && (
                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg space-y-5">
                      <div className="flex justify-between items-center border-b border-white/10 pb-3">
                        <div>
                          <h4 className="font-extrabold text-sm">Ballot Audit Summary</h4>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">{electionVotes.length} Total Votes Cast</span>
                        </div>
                        <button
                          onClick={handleExportVotes}
                          className="px-3 py-1.5 bg-secondary hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg shadow transition-premium flex items-center gap-1 cursor-pointer"
                          title="Export Tally Sheets"
                        >
                          <Download className="w-3.5 h-3.5" /> Export Results
                        </button>
                      </div>

                      {/* Candidates Listing */}
                      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 divide-y divide-white/5">
                        {electionCandidates.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-500">No candidates listed.</div>
                        ) : (
                          electionCandidates.map(cand => {
                            const candVoteCount = electionVotes.filter(v => v.candidate_id === cand.id).length;
                            return (
                              <div key={cand.id} className="flex items-center justify-between py-2.5 first:pt-0">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={cand.photo_url} alt={cand.name} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-100 leading-tight">{cand.name}</p>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">{cand.position}</span>
                                  </div>
                                </div>

                                <div className="text-right flex items-center gap-3">
                                  <span className="text-xs font-extrabold text-accent">{candVoteCount} votes</span>
                                  <button
                                    onClick={() => handleDeleteCandidate(cand.id)}
                                    className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition-premium"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                    </div>
                  )}

                </div>

              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* PANEL 8: STAFF MANAGEMENT */}
          {/* ========================================== */}
          {activeTab === 'staff_mgmt' && role === 'super_admin' && (
            <div className="space-y-6">
              <h3 className="font-extrabold text-slate-800 text-lg">Staff Accounts Registry</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Create Staff Form */}
                <form onSubmit={handleCreateStaff} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Users className="w-4.5 h-4.5 text-secondary" /> Register New Staff Account
                  </h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Staff Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Sarah Alao"
                      value={staffNameInput}
                      onChange={(e) => setStaffNameInput(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. staff@nsbs.unilesa.edu.ng"
                      value={staffEmailInput}
                      onChange={(e) => setStaffEmailInput(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Access Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="e.g. securepassword"
                      value={staffPasswordInput}
                      onChange={(e) => setStaffPasswordInput(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow transition-premium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Create Staff Credentials
                  </button>
                </form>

                {/* Staff List */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Users className="w-4.5 h-4.5 text-slate-500" /> Active Staff Accounts ({staffList.length})
                  </h4>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {staffList.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400">No staff credentials registered.</div>
                    ) : (
                      staffList.map(sa => (
                        <div key={sa.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h5 className="font-bold text-slate-800 text-xs leading-tight">{sa.name}</h5>
                            <p className="text-[10px] text-slate-505 font-semibold">{sa.email}</p>
                            <p className="text-[9px] text-slate-400">Created: {new Date(sa.created_at).toLocaleDateString()}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(sa.id)}
                            className="p-1.5 text-rose-505 hover:bg-rose-50 rounded-lg transition-premium shrink-0 cursor-pointer"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
