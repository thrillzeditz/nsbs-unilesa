'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, ExternalLink, Vote as VoteIcon, User, Info, CheckCircle, ShieldAlert, Award, BarChart3, Clock } from 'lucide-react';
import { getEvents, getElections, getCandidates, castVote, getVotes } from '@/lib/db';
import { ActivityEvent, Election, Candidate, Vote } from '@/lib/types';

export default function EventsPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  // Voting form states
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [voterMatric, setVoterMatric] = useState('');
  const [voterEmail, setVoterEmail] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({}); // { position: candidateId }
  const [votingSubmitting, setVotingSubmitting] = useState(false);
  const [voteMessage, setVoteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const evs = await getEvents();
      const elcts = await getElections();
      setEvents(evs);
      setElections(elcts);

      // Find the first open or closed election to show details
      const activeElection = elcts.find(e => e.status === 'open') || elcts.find(e => e.status === 'closed') || elcts[0];
      
      if (activeElection) {
        setSelectedElection(activeElection);
        const cands = await getCandidates(activeElection.id);
        setCandidates(cands);
        const vts = await getVotes(activeElection.id);
        setVotes(vts);
      }
    } catch (err) {
      console.error("Error loading events and elections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleElectionUpdate = () => {
      fetchData();
    };
    window.addEventListener('electionsUpdated', handleElectionUpdate);
    return () => window.removeEventListener('electionsUpdated', handleElectionUpdate);
  }, []);

  // Update candidates & votes when active election tab changes
  const handleElectionChange = async (election: Election) => {
    setLoading(true);
    setSelectedElection(election);
    try {
      const cands = await getCandidates(election.id);
      setCandidates(cands);
      const vts = await getVotes(election.id);
      setVotes(vts);
      setSelectedCandidates({});
      setVoteMessage(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Group candidates by position
  const candidatesByPosition = candidates.reduce((acc, cand) => {
    if (!acc[cand.position]) acc[cand.position] = [];
    acc[cand.position].push(cand);
    return acc;
  }, {} as Record<string, Candidate[]>);

  // Group votes by candidate to calculate totals (for closed elections)
  const votesByCandidate = votes.reduce((acc, vote) => {
    acc[vote.candidate_id] = (acc[vote.candidate_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElection) return;
    if (!voterMatric || !voterEmail) {
      alert("Please fill in your Matric Number and Email Address to vote.");
      return;
    }

    // Verify student selected a candidate for at least one position
    const positions = Object.keys(candidatesByPosition);
    if (positions.length === 0) return;
    
    const selectedCount = Object.keys(selectedCandidates).length;
    if (selectedCount === 0) {
      setVoteMessage({ type: 'error', text: "Please select at least one candidate before casting your vote." });
      return;
    }

    setVotingSubmitting(true);
    setVoteMessage(null);

    try {
      let castCount = 0;
      let errorOccurred = false;
      let errorMessage = '';

      // Cast a vote record for each selected position candidate
      for (const position of positions) {
        const candidateId = selectedCandidates[position];
        if (!candidateId) continue;

        const res = await castVote({
          election_id: selectedElection.id,
          candidate_id: candidateId,
          matric_number: voterMatric.toUpperCase().trim(),
          email: voterEmail.toLowerCase().trim()
        });

        if (!res.success) {
          errorOccurred = true;
          errorMessage = res.error || 'Failed to submit vote.';
          break; // Stop casting further votes
        }
        castCount++;
      }

      if (errorOccurred) {
        setVoteMessage({ type: 'error', text: errorMessage });
      } else {
        setVoteMessage({ 
          type: 'success', 
          text: `Thank you! Your votes have been recorded successfully for ${castCount} position(s).` 
        });
        
        // Refresh votes
        const vts = await getVotes(selectedElection.id);
        setVotes(vts);

        // Reset form
        setVoterMatric('');
        setVoterEmail('');
        setSelectedCandidates({});
      }

    } catch (err) {
      console.error(err);
      setVoteMessage({ type: 'error', text: "A system error occurred. Please try again." });
    } finally {
      setVotingSubmitting(false);
    }
  };

  // Split events into upcoming and past
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.date) >= now);
  const pastEvents = events.filter(e => new Date(e.date) < now);

  return (
    <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-secondary text-sm font-bold uppercase tracking-wider">
          <Calendar className="w-4 h-4" /> Student Activities
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight mt-1">
          Events & E-Voting Hub
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Stay updated on student chapter events and exercise your democratic rights in elections securely.
        </p>
      </div>

      {/* Main Grid: Left Events, Right Voting */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Events Listing */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Upcoming Events */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-5 h-5 text-secondary" /> Upcoming Activities
            </h3>

            {loading ? (
              <div className="py-10 text-center animate-pulse text-slate-400 text-xs">Loading events...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                No upcoming events scheduled at the moment. Check back soon!
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingEvents.map(event => (
                  <div 
                    key={event.id}
                    className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col sm:flex-row shadow-sm hover:shadow-md hover:border-slate-300 transition-premium group"
                  >
                    {/* Poster */}
                    <div className="sm:w-48 h-48 sm:h-auto relative bg-slate-100 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-150">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={event.poster_url} 
                        alt={event.title} 
                        className="w-full h-full object-cover group-hover:scale-102 transition-premium duration-500" 
                      />
                    </div>
                    {/* Details */}
                    <div className="p-6 flex flex-col justify-between space-y-4 flex-grow">
                      <div className="space-y-2">
                        <span className="text-[9px] font-extrabold text-white bg-secondary px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Upcoming Event
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-base leading-tight pt-1">
                          {event.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {event.description}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-400 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-secondary shrink-0" />
                          <span>{new Date(event.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-secondary shrink-0" />
                          <span className="truncate max-w-[250px]">{event.venue}</span>
                        </div>
                      </div>

                      {event.registration_link && (
                        <a
                          href={event.registration_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit px-4 py-2 bg-primary hover:bg-secondary text-white font-bold text-xs rounded-xl shadow-sm transition-premium flex items-center gap-1"
                        >
                          Register Now <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Events */}
          <div className="space-y-4 pt-4">
            <h3 className="font-extrabold text-slate-600 text-base flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-4.5 h-4.5 text-slate-400" /> Past Events & Archive
            </h3>

            {loading ? null : pastEvents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl text-xs">
                No past event records archived yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pastEvents.map(event => (
                  <div 
                    key={event.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm opacity-85 hover:opacity-100 transition-premium"
                  >
                    <div className="h-32 bg-slate-100 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover filter grayscale" />
                    </div>
                    <div className="p-4 space-y-2">
                      <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{event.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">{event.description}</p>
                      <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-50">
                        Held on {new Date(event.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: E-Voting Center */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <VoteIcon className="w-5 h-5 text-secondary animate-bounce" /> E-Voting Center
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Secure election module for accredited students of NSBS UILESA.
              </p>
            </div>

            {/* Loading elections */}
            {loading ? (
              <div className="py-10 text-center text-slate-400 text-xs animate-pulse">Loading elections...</div>
            ) : elections.length === 0 ? (
              <div className="text-center py-10 space-y-2 bg-slate-50 rounded-2xl border border-slate-100 p-4">
                <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">No Active Elections</h4>
                <p className="text-xs text-slate-500 leading-normal max-w-[200px] mx-auto">
                  There are no electronic voting exercises active or scheduled right now.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Select Election dropdown if multiple */}
                {elections.length > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Select Election Activity</label>
                    <select
                      value={selectedElection?.id || ''}
                      onChange={(e) => {
                        const el = elections.find(el => el.id === e.target.value);
                        if (el) handleElectionChange(el);
                      }}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                    >
                      {elections.map(el => (
                        <option key={el.id} value={el.id}>{el.title} ({el.status})</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedElection && (
                  <div className="space-y-6">
                    
                    {/* Active Election Title */}
                    <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Current Election</span>
                        {selectedElection.status === 'open' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-200 uppercase tracking-wider animate-pulse">
                            Live Voting Open
                          </span>
                        )}
                        {selectedElection.status === 'closed' && (
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[9px] font-bold uppercase tracking-wider">
                            Voting Closed
                          </span>
                        )}
                        {selectedElection.status === 'upcoming' && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase border border-amber-200 tracking-wider">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-800 leading-snug">
                        {selectedElection.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        {selectedElection.description}
                      </p>
                    </div>

                    {/* Scenario 1: Election is LIVE OPEN */}
                    {selectedElection.status === 'open' && (
                      <form onSubmit={handleVoteSubmit} className="space-y-6">
                        
                        {/* Accredited details input */}
                        <div className="space-y-4 bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
                          <h4 className="font-bold text-xs uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                            <User className="w-4.5 h-4.5 text-secondary" /> Accredited Voter Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-slate-800">
                            <div className="space-y-1 text-white">
                              <label className="text-[10px] font-bold text-slate-300">Matric Number</label>
                              <input
                                type="text"
                                required
                                placeholder="2023/1045"
                                value={voterMatric}
                                onChange={(e) => setVoterMatric(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-700 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-secondary text-xs uppercase"
                              />
                            </div>
                            <div className="space-y-1 text-white">
                              <label className="text-[10px] font-bold text-slate-300">Email Address</label>
                              <input
                                type="email"
                                required
                                placeholder="student@unilesa.edu.ng"
                                value={voterEmail}
                                onChange={(e) => setVoterEmail(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-700 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-secondary text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Candidates Gridgrouped by position */}
                        <div className="space-y-6">
                          <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">
                            Candidates & Ballot Papers
                          </h4>

                          {Object.keys(candidatesByPosition).length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-400">No candidates added yet.</div>
                          ) : (
                            Object.keys(candidatesByPosition).map((position) => (
                              <div key={position} className="space-y-3 bg-slate-50 border border-slate-150 p-4 rounded-2xl shadow-sm">
                                <span className="text-xs font-extrabold text-primary uppercase bg-slate-200/50 px-2.5 py-1 rounded">
                                  Office: {position}
                                </span>
                                
                                <div className="grid grid-cols-1 gap-3">
                                  {candidatesByPosition[position].map((cand) => {
                                    const isSelected = selectedCandidates[position] === cand.id;
                                    return (
                                      <div
                                        key={cand.id}
                                        onClick={() => {
                                          setSelectedCandidates(prev => ({ ...prev, [position]: cand.id }));
                                        }}
                                        className={`flex gap-3.5 p-3 rounded-xl border transition-premium cursor-pointer ${
                                          isSelected
                                            ? 'bg-secondary/5 border-secondary shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                      >
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={cand.photo_url} alt={cand.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-grow space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800 text-xs sm:text-sm">{cand.name}</span>
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                              isSelected ? 'bg-secondary border-secondary text-white' : 'border-slate-300 bg-white'
                                            }`}>
                                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                          </div>
                                          <p className="text-[10px] text-slate-500 leading-relaxed font-light line-clamp-2">
                                            &quot;{cand.manifesto}&quot;
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Status Message */}
                        {voteMessage && (
                          <div className={`p-4 rounded-2xl border text-xs text-center flex items-center justify-center gap-2 ${
                            voteMessage.type === 'success'
                              ? 'bg-emerald-50 border-emerald-150 text-emerald-800'
                              : 'bg-rose-50 border-rose-150 text-rose-800'
                          }`}>
                            {voteMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />}
                            <span>{voteMessage.text}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={votingSubmitting}
                          className="w-full py-3 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-sm rounded-xl shadow-md transition-premium cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {votingSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4.5 w-4.5 border-t-2 border-white"></div>
                              <span>Casting Ballot...</span>
                            </>
                          ) : (
                            <>
                              <VoteIcon className="w-4.5 h-4.5" />
                              <span>Submit My Votes</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}

                    {/* Scenario 2: Election is CLOSED (Show Results) */}
                    {selectedElection.status === 'closed' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <BarChart3 className="w-4.5 h-4.5 text-secondary" />
                          <h4 className="font-extrabold text-slate-800 text-sm">Certified Results</h4>
                        </div>

                        {Object.keys(candidatesByPosition).length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-400">No candidates added.</div>
                        ) : (
                          Object.keys(candidatesByPosition).map((position) => {
                            const positionCandidates = candidatesByPosition[position];
                            // Find total votes casted for this position
                            const totalPosVotes = positionCandidates.reduce((sum, cand) => sum + (votesByCandidate[cand.id] || 0), 0);

                            return (
                              <div key={position} className="space-y-4 bg-slate-50 border border-slate-150 p-5 rounded-2xl shadow-sm">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-extrabold text-primary uppercase bg-slate-200/50 px-2 py-0.5 rounded">
                                    Office: {position}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    {totalPosVotes} Total Votes
                                  </span>
                                </div>

                                <div className="space-y-3.5">
                                  {positionCandidates.map((cand) => {
                                    const voteCount = votesByCandidate[cand.id] || 0;
                                    const percentage = totalPosVotes > 0 ? Math.round((voteCount / totalPosVotes) * 100) : 0;
                                    
                                    return (
                                      <div key={cand.id} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold text-slate-700">
                                          <span>{cand.name}</span>
                                          <span>{voteCount} votes ({percentage}%)</span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                                          <div 
                                            className="bg-secondary h-full rounded-full transition-all duration-700"
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}

                        <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl text-[10px] text-emerald-800 flex items-start gap-2">
                          <Award className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <p className="leading-normal">
                            These results have been dynamically tallied, audited, and verified by the NSBS Electoral Committee chapter as final.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Scenario 3: Election is UPCOMING */}
                    {selectedElection.status === 'upcoming' && (
                      <div className="text-center py-10 space-y-3 bg-slate-50 rounded-2xl border border-slate-100 p-6">
                        <Clock className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
                        <h4 className="font-bold text-slate-800 text-sm">Voting Exercise Upcoming</h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-[250px] mx-auto">
                          The voting portal for this election has not opened yet. Candidates can promote manifestos in the meantime. Stay tuned!
                        </p>
                      </div>
                    )}

                  </div>
                )}

              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
