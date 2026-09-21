'use client';

import React, { useState, useEffect } from 'react';
import { 
  Vote as VoteIcon, ShieldCheck, AlertCircle, CheckCircle, ArrowRight, 
  ArrowLeft, Lock, RefreshCw, UserCheck, Check, Sparkles, AlertTriangle,
  Info, ExternalLink, Award, FileText, ChevronRight
} from 'lucide-react';
import { 
  MOCK_STUDENTS, MOCK_POSITIONS, DemoStudent, DemoCandidate,
  verifyStudentMatric, submitDemoVote, getDemoElectionStats, resetDemoElectionState
} from '@/lib/electionDemoData';

type PortalStep = 'landing' | 'verify' | 'verified_confirm' | 'already_voted' | 'voting' | 'review' | 'success';

export default function ElectionPortal() {
  const [currentStep, setCurrentStep] = useState<PortalStep>('landing');
  const [matricInput, setMatricInput] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedStudent, setVerifiedStudent] = useState<DemoStudent | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({}); // { positionTitle: candidateId }
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [stats, setStats] = useState(getDemoElectionStats());

  // Listen for demo storage updates
  useEffect(() => {
    const handleUpdate = () => {
      setStats(getDemoElectionStats());
    };
    window.addEventListener('demoElectionVotesUpdated', handleUpdate);
    return () => window.removeEventListener('demoElectionVotesUpdated', handleUpdate);
  }, []);

  // 1. VERIFICATION HANDLER
  const handleVerifyMatric = (matricToTest?: string) => {
    const value = matricToTest || matricInput;
    if (!value.trim()) {
      setVerificationError('Please enter your matriculation number.');
      return;
    }

    setVerificationError(null);
    const result = verifyStudentMatric(value);

    if (!result.success) {
      setVerificationError(result.error || 'Matric number could not be verified. Please check the number and try again.');
      return;
    }

    if (result.alreadyVoted) {
      setVerifiedStudent(result.student || null);
      setCurrentStep('already_voted');
      return;
    }

    if (result.student) {
      setVerifiedStudent(result.student);
      setCurrentStep('verified_confirm');
    }
  };

  // 2. CANDIDATE SELECTION
  const handleSelectCandidate = (positionTitle: string, candidateId: string) => {
    setSelectedCandidates(prev => ({
      ...prev,
      [positionTitle]: candidateId
    }));
    setValidationError(null);
  };

  // 3. PROCEED TO REVIEW
  const handleProceedToReview = () => {
    // Validate all positions are chosen
    const unselectedPositions = MOCK_POSITIONS.filter(pos => !selectedCandidates[pos.title]);
    
    if (unselectedPositions.length > 0) {
      setValidationError(`Please select a candidate for all positions. Missing: ${unselectedPositions.map(p => p.title).join(', ')}.`);
      // Scroll to the first missing element if possible
      return;
    }

    setValidationError(null);
    setCurrentStep('review');
  };

  // 4. SUBMIT BALLOT
  const handleConfirmSubmit = async () => {
    if (!verifiedStudent) return;
    setIsSubmitting(true);

    try {
      const res = await submitDemoVote(verifiedStudent.matric_number, selectedCandidates);
      if (res.success && res.referenceCode) {
        setReferenceCode(res.referenceCode);
        setShowConfirmModal(false);
        setCurrentStep('success');
      } else {
        alert(res.error || 'Failed to submit vote.');
        setShowConfirmModal(false);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while submitting vote.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset entire flow for demonstration
  const handleResetFlow = () => {
    setCurrentStep('landing');
    setMatricInput('');
    setVerificationError(null);
    setVerifiedStudent(null);
    setSelectedCandidates({});
    setValidationError(null);
    setShowConfirmModal(false);
    setReferenceCode('');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      
      {/* Portal Header / Brand Bar */}
      <div className="bg-slate-900 text-white p-6 sm:p-7 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-secondary/15 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                NSBS ELECTION 2026
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Official E-Voting</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <VoteIcon className="w-6 h-6 text-secondary" /> Student Election Portal
            </h3>
            <p className="text-xs text-slate-300 font-normal max-w-lg">
              Participate in the election of the next NSBS executive team.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:self-center bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-2xl shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-300">Voting Open</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LANDING PHASE */}
      {/* ========================================================================= */}
      {currentStep === 'landing' && (
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Status banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
            <div className="p-2 bg-emerald-500 text-white rounded-xl shrink-0 shadow-sm">
              <VoteIcon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
                  Election Status: Voting Open
                </span>
              </div>
              <p className="text-xs text-emerald-800/90 leading-relaxed font-normal">
                Accredited Biochemistry students can now cast their democratic ballot for the 2026/2027 NSBS Departmental Executive Council.
              </p>
            </div>
          </div>

          {/* Important Information Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-3.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Info className="w-4 h-4 text-secondary" /> Important Voting Guidelines
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <li className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <span>Only eligible Biochemistry students can vote.</span>
              </li>
              <li className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <UserCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <span>Your matric number will be verified before voting.</span>
              </li>
              <li className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <Lock className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <span>Each eligible student can vote once.</span>
              </li>
              <li className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>Submitted votes cannot be changed.</span>
              </li>
            </ul>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900 text-white rounded-2xl text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Accredited Seats</span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-400">7 Offices</span>
            </div>
            <div className="border-x border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Turnout</span>
              <span className="text-base sm:text-lg font-extrabold text-white">{stats.turnout_percentage}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Votes Logged</span>
              <span className="text-base sm:text-lg font-extrabold text-accent">{stats.votes_cast}</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              onClick={() => setCurrentStep('verify')}
              className="w-full py-4 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg hover:shadow-emerald-500/20 transition-premium flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Proceed to Vote</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MATRIC NUMBER VERIFICATION PHASE */}
      {/* ========================================================================= */}
      {currentStep === 'verify' && (
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-secondary text-white text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-xs font-extrabold text-slate-800">Student Identity Verification</span>
            </div>
            <button
              onClick={() => setCurrentStep('landing')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-premium flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-xl font-extrabold text-primary tracking-tight">
              Verify Your Student Identity
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your matriculation number to verify your eligibility to vote in the NSBS 2026 departmental election.
            </p>
          </div>

          {/* Verification Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyMatric();
            }} 
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                Matric Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Example: 2023/0357"
                  value={matricInput}
                  onChange={(e) => {
                    setMatricInput(e.target.value);
                    if (verificationError) setVerificationError(null);
                  }}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Verification Error Box */}
            {verificationError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Verification Failed</p>
                  <p>{verificationError}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-primary hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl shadow-md transition-premium flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4.5 h-4.5 text-secondary" />
              <span>Verify Matric Number</span>
            </button>
          </form>

          {/* Staff Adviser Demo Helper Shortcuts */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-accent" /> Demo Quick Test Records
              </span>
              <span className="text-[10px] text-slate-400">Click to auto-fill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOCK_STUDENTS.slice(0, 4).map(s => (
                <button
                  key={s.matric_number}
                  type="button"
                  onClick={() => {
                    setMatricInput(s.matric_number);
                    handleVerifyMatric(s.matric_number);
                  }}
                  className="text-left p-2.5 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 border border-slate-200 rounded-xl transition-premium cursor-pointer group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">{s.matric_number}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{s.level}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{s.name}</div>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2B. STUDENT VERIFIED CONFIRMATION */}
      {/* ========================================================================= */}
      {currentStep === 'verified_confirm' && verifiedStudent && (
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">✓</span>
            <span className="text-xs font-extrabold text-emerald-800">Student Identity Verified</span>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-150 px-2 py-0.5 rounded-full">
                  Verified Accredited Voter
                </span>
                <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  ✓ Student Verified
                </h4>
              </div>
            </div>

            {/* Student Details Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white p-4.5 rounded-2xl border border-emerald-100 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Full Name</span>
                <p className="font-extrabold text-slate-900 text-sm">{verifiedStudent.name}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Matric Number</span>
                <p className="font-extrabold text-emerald-700 text-sm tracking-wide">{verifiedStudent.matric_number}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Level</span>
                <p className="font-bold text-slate-800">{verifiedStudent.level}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                <p className="font-bold text-slate-800">{verifiedStudent.department}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Please confirm that these details belong to you before proceeding to the ballot voting interface.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setCurrentStep('verify')}
              className="sm:w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm rounded-2xl transition-premium cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <button
              onClick={() => setCurrentStep('voting')}
              className="sm:w-2/3 py-3.5 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-emerald-500/20 transition-premium cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Yes, Continue to Voting</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ALREADY VOTED STATE */}
      {/* ========================================================================= */}
      {currentStep === 'already_voted' && (
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-300 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                Ballot Record Confirmed
              </span>
              <h4 className="text-xl sm:text-2xl font-extrabold text-slate-900 pt-1">
                You Have Already Voted
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Your vote for this election has already been submitted and audited. Under the NSBS Electoral Charter, each accredited student is permitted exactly one ballot submission.
              </p>
            </div>

            {verifiedStudent && (
              <div className="max-w-xs mx-auto bg-white p-3.5 rounded-xl border border-amber-200 text-xs text-left space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Accredited Student</div>
                <div className="font-bold text-slate-800">{verifiedStudent.name} ({verifiedStudent.matric_number})</div>
                <div className="text-[11px] text-slate-500">{verifiedStudent.level} &bull; {verifiedStudent.department}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleResetFlow}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow transition-premium flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Return to Election Portal
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VOTING INTERFACE */}
      {/* ========================================================================= */}
      {currentStep === 'voting' && verifiedStudent && (
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Progress Indicator Steps */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="flex flex-col items-center gap-1 text-emerald-600 font-bold">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</div>
                <span className="text-[10px] hidden sm:inline">1. Verification</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-primary font-extrabold">
                <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs ring-4 ring-primary/20">2</div>
                <span className="text-[10px] hidden sm:inline">2. Voting</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-slate-400 font-semibold">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">3</div>
                <span className="text-[10px] hidden sm:inline">3. Review</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-slate-400 font-semibold">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">4</div>
                <span className="text-[10px] hidden sm:inline">4. Submit</span>
              </div>
            </div>
          </div>

          {/* Section Header */}
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-extrabold text-secondary uppercase tracking-widest">
                NSBS ELECTION 2026
              </span>
              <h4 className="text-2xl font-extrabold text-primary tracking-tight">
                Cast Your Vote
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Voter: <strong className="text-slate-800">{verifiedStudent.name}</strong> ({verifiedStudent.matric_number})
              </p>
            </div>
            <div className="bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600">
              {Object.keys(selectedCandidates).length} of {MOCK_POSITIONS.length} positions selected
            </div>
          </div>

          {/* Position Cards Grid */}
          <div className="space-y-8">
            {MOCK_POSITIONS.map((position) => {
              const selectedCandidateId = selectedCandidates[position.title];

              return (
                <div 
                  key={position.id} 
                  className={`rounded-3xl border transition-premium overflow-hidden ${
                    selectedCandidateId ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-slate-250'
                  }`}
                >
                  {/* Position Title Bar */}
                  <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                        OFFICE:
                      </span>
                      <h5 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                        {position.title.toUpperCase()}
                      </h5>
                    </div>
                    {selectedCandidateId ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Candidate Selected
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold">
                        Selection Required
                      </span>
                    )}
                  </div>

                  {/* Candidates List for this Position */}
                  <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {position.candidates.map((candidate) => {
                      const isSelected = selectedCandidateId === candidate.id;

                      return (
                        <div
                          key={candidate.id}
                          onClick={() => handleSelectCandidate(position.title, candidate.id)}
                          className={`rounded-2xl p-4.5 border transition-premium cursor-pointer flex flex-col justify-between gap-4 ${
                            isSelected
                              ? 'bg-emerald-50/70 border-secondary shadow-md ring-2 ring-secondary/20'
                              : 'bg-white border-slate-200 hover:border-slate-350 hover:shadow-2xs'
                          }`}
                        >
                          {/* Candidate Bio Header */}
                          <div className="flex items-start gap-3.5">
                            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={candidate.photo_url}
                                alt={candidate.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-grow space-y-1">
                              <div className="flex items-center justify-between">
                                <h6 className="font-extrabold text-slate-900 text-sm leading-snug">
                                  {candidate.name}
                                </h6>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {candidate.level}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  Biochemistry
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Manifesto Quote */}
                          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-150">
                            <p className="text-[11px] text-slate-600 italic leading-relaxed">
                              &ldquo;{candidate.manifesto}&rdquo;
                            </p>
                          </div>

                          {/* Select Action Radio / Button */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-150">
                            <span className="text-[11px] font-bold text-slate-500">
                              {isSelected ? 'Selected Ballot Choice' : 'Click card to vote'}
                            </span>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-premium ${
                              isSelected
                                ? 'bg-secondary text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}>
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Selected</span>
                                </>
                              ) : (
                                <span>Select</span>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Validation Error Alert */}
          {validationError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-bold">{validationError}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep('verified_confirm')}
              className="sm:w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm rounded-2xl transition-premium cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Verification
            </button>
            <button
              onClick={handleProceedToReview}
              className="sm:w-2/3 py-4 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-emerald-500/20 transition-premium cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Proceed to Review Votes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REVIEW PAGE */}
      {/* ========================================================================= */}
      {currentStep === 'review' && verifiedStudent && (
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Progress Indicator Steps */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="flex flex-col items-center gap-1 text-emerald-600 font-bold">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</div>
                <span className="text-[10px] hidden sm:inline">1. Verification</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-emerald-600 font-bold">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</div>
                <span className="text-[10px] hidden sm:inline">2. Voting</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-primary font-extrabold">
                <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs ring-4 ring-primary/20">3</div>
                <span className="text-[10px] hidden sm:inline">3. Review</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-slate-400 font-semibold">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">4</div>
                <span className="text-[10px] hidden sm:inline">4. Submit</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-secondary uppercase tracking-widest">
              STEP 3 OF 4 &bull; AUDIT BALLOT SELECTIONS
            </span>
            <h4 className="text-2xl font-extrabold text-primary tracking-tight">
              Review Your Votes
            </h4>
            <p className="text-xs text-slate-500">
              Please inspect your choices for all {MOCK_POSITIONS.length} executive positions carefully before final submission.
            </p>
          </div>

          {/* Selected Candidates Summary List */}
          <div className="divide-y divide-slate-150 border border-slate-200 rounded-3xl bg-slate-50 overflow-hidden shadow-2xs">
            {MOCK_POSITIONS.map((pos) => {
              const chosenCandId = selectedCandidates[pos.title];
              const cand = pos.candidates.find(c => c.id === chosenCandId);

              return (
                <div key={pos.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                  <div className="space-y-1 sm:w-1/3">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Position</span>
                    <h5 className="font-extrabold text-slate-800 text-sm">{pos.title}</h5>
                  </div>

                  <div className="flex items-center gap-3 sm:w-2/3">
                    {cand ? (
                      <>
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={cand.photo_url} alt={cand.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-0.5 flex-grow">
                          <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{cand.name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{cand.level} &bull; Biochemistry</p>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full shrink-0">
                          Confirmed
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-rose-500 font-bold">No selection made</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Important Warning Alert */}
          <div className="p-4.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Irreversible Action Notice</p>
              <p className="leading-relaxed">
                Please review your selections carefully. You cannot change your vote after final submission.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setCurrentStep('voting')}
              className="sm:w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm rounded-2xl transition-premium cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Edit
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="sm:w-2/3 py-4 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-emerald-500/20 transition-premium cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Continue to Confirmation</span>
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. FINAL CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showConfirmModal && verifiedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6 text-center">
            
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 border border-secondary/30 text-secondary flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-extrabold text-slate-900">
                Confirm Your Vote
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Once your vote is submitted, it cannot be changed. Are you sure you are ready to seal your electronic ballot?
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-left space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Submitting Accredited Student</div>
              <div className="font-bold text-slate-800">{verifiedStudent.name}</div>
              <div className="text-[11px] text-slate-500">{verifiedStudent.matric_number} &bull; {verifiedStudent.level}</div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-premium cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="w-1/2 py-3 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow transition-premium flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-400"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Submit Vote</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SUCCESS PAGE */}
      {/* ========================================================================= */}
      {currentStep === 'success' && (
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="bg-gradient-to-b from-emerald-500 to-emerald-700 text-white rounded-3xl p-8 text-center space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            
            <div className="w-16 h-16 rounded-2xl bg-white text-emerald-700 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/30 inline-block">
                Ballot Sealed & Audited
              </span>
              <h4 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                ✓ Vote Submitted Successfully
              </h4>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-md mx-auto leading-relaxed">
                Thank you for participating in the NSBS Election 2026. Your democratic participation powers our biochemistry community.
              </p>
            </div>

            {/* Reference Number Box (Candidate selections are strictly NOT shown as required) */}
            <div className="bg-white/10 backdrop-blur-md p-4.5 rounded-2xl border border-white/25 max-w-sm mx-auto space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider block">
                Official Ballot Reference Number
              </span>
              <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-widest block">
                {referenceCode}
              </span>
              <span className="text-[10px] text-emerald-100 font-light block">
                Keep this reference number for election verification audits.
              </span>
            </div>
          </div>

          {/* Privacy & Anonymity Guarantee Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 text-xs text-slate-600 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Ballot Anonymity Guarantee:</strong> In accordance with constitutional secrecy standards, your student matriculation number is recorded only to certify accreditation, while your cast votes are encrypted and separated anonymously in the ballot vault.
            </p>
          </div>

          {/* Presentation Reset / Return Options */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleResetFlow}
              className="sm:w-1/2 py-3.5 bg-primary hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow transition-premium flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Return to Portal Home
            </button>
            <button
              onClick={() => {
                handleResetFlow();
                setCurrentStep('verify');
              }}
              className="sm:w-1/2 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs sm:text-sm rounded-2xl transition-premium flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-secondary" /> Test Another Student (Demo Mode)
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
