'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Search, CheckCircle, Clock, AlertTriangle, MessageSquare, Landmark, Info, HelpCircle } from 'lucide-react';
import { getSettings, addPaymentRecord, getPaymentByMatric } from '@/lib/db';
import { SiteSettings, PaymentRecord } from '@/lib/types';

export default function PaymentsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'pay' | 'track'>('pay');
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Form States
  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [level, setLevel] = useState('');
  const [academicSession, setAcademicSession] = useState('2025/2026');
  
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Track States
  const [trackSearchQuery, setTrackSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PaymentRecord[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setLoadingSettings(false);
    });
  }, []);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname || !firstName || !email || !mobileNumber || !matricNumber) {
      alert("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const record = {
        surname,
        first_name: firstName,
        middle_name: middleName || undefined,
        email,
        mobile_number: mobileNumber,
        matric_number: matricNumber.toUpperCase().trim(),
        level,
        academic_session: academicSession,
        due_item: "NSBS Departmental Due",
        amount_paid: settings?.dues_amount || 3000,
      };

      // 1. Save to local DB/localStorage as Pending
      await addPaymentRecord(record);

      // 2. Build WhatsApp deep link
      const studentName = `${surname} ${firstName} ${middleName}`.trim();
      const amountPaid = settings?.dues_amount || 3000;
      const treasurerPhone = settings?.treasurer_whatsapp || '2348105596459';
      
      const message = `Hello Treasurer, I have made payment for my NSBS Departmental Due. Kindly verify my payment.\n\n` + 
                      `*Details:*\n` +
                      `- Name: ${studentName}\n` +
                      `- Matric Number: ${matricNumber.toUpperCase()}\n` +
                      `- Level: ${level}L\n` +
                      `- Session: ${academicSession}\n` +
                      `- Amount: N${amountPaid}\n\n` +
                      `Thank you!`;
                      
      const encodedMsg = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${treasurerPhone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`;

      setFormSuccess(true);
      
      // Delay redirection slightly so the user sees success
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        // Reset form
        setSurname('');
        setFirstName('');
        setMiddleName('');
        setEmail('');
        setMobileNumber('');
        setMatricNumber('');
        setFormSuccess(false);
      }, 1500);

    } catch (err) {
      console.error(err);
      alert("Failed to submit payment record. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackSearchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await getPaymentByMatric(trackSearchQuery.toUpperCase().trim());
      setSearchResults(res);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const openTreasurerSupport = () => {
    const treasurerPhone = settings?.treasurer_whatsapp || '2348105596459';
    const message = `Hello Treasurer, I am experiencing issues tracking my NSBS payment. Kindly assist. My Matric Number is [Enter Matric]`;
    const whatsappUrl = `https://wa.me/${treasurerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loadingSettings) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary"></div>
      </div>
    );
  }

  const duesAmount = settings?.dues_amount || 3000;

  return (
    <div className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex p-3 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
          <CreditCard className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
          Departmental Dues Portal
        </h1>
        <p className="text-sm text-slate-500">
          Pay your annual biochemistry student dues and track your transaction verification status.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex justify-center">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab('pay')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-premium flex items-center gap-2 ${
              activeTab === 'pay'
                ? 'bg-white text-primary shadow'
                : 'text-slate-500 hover:text-primary'
            }`}
          >
            <Landmark className="w-4 h-4" /> Pay Dues
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-premium flex items-center gap-2 ${
              activeTab === 'track'
                ? 'bg-white text-primary shadow'
                : 'text-slate-500 hover:text-primary'
            }`}
          >
            <Clock className="w-4 h-4" /> Track Payment Status
          </button>
        </div>
      </div>

      {/* TAB Content */}
      <div className="max-w-3xl mx-auto">
        
        {/* Tab 1: Pay Dues Form */}
        {activeTab === 'pay' && (
          level === '' ? (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-md space-y-6 text-center transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mx-auto border border-secondary/20">
                <HelpCircle className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-primary">Select Your Level</h3>
                <p className="text-xs text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                  Please select your current academic level to display your departmental dues form and bank transfer details.
                </p>
              </div>
              
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-600 block mb-1">Academic Level *</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm font-semibold text-slate-700 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <option value="">-- Choose Level --</option>
                  <option value="100">100 Level (Freshman)</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level (Final Year)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Form Column */}
            <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-extrabold text-slate-800 text-lg">
                Student Information
              </h3>
              
              {formSuccess ? (
                <div className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl border border-emerald-100 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="font-bold text-sm">Record Saved Successfully!</h4>
                  <p className="text-xs text-emerald-600">
                    Opening WhatsApp to message the Treasurer... Please authorize.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePaySubmit} className="space-y-4">
                  
                  {/* Name Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Surname *</label>
                      <input
                        type="text"
                        required
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder="e.g. Adeboye"
                        className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">First Name *</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Tosin"
                        className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">Middle Name</label>
                    <input
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="e.g. Emmanuel"
                      className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                    />
                  </div>

                  {/* Email & Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tosin@unilesa.edu.ng"
                        className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="e.g. 08012345678"
                        className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                      />
                    </div>
                  </div>

                  {/* Matric & Level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Matric Number *</label>
                      <input
                        type="text"
                        required
                        value={matricNumber}
                        onChange={(e) => setMatricNumber(e.target.value)}
                        placeholder="e.g. 2023/1045"
                        className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm uppercase"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Level *</label>
                        <select
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
                          className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm font-semibold"
                        >
                          <option value="">Select Level</option>
                          <option value="100">100L</option>
                          <option value="200">200L</option>
                          <option value="300">300L</option>
                          <option value="400">400L</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Session *</label>
                        <select
                          value={academicSession}
                          onChange={(e) => setAcademicSession(e.target.value)}
                          className="block w-full px-2 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm"
                        >
                          <option value="2025/2026">25/26</option>
                          <option value="2024/2025">24/25</option>
                          <option value="2023/2024">23/24</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Due amount info banner */}
                  <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/15 flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-slate-700">Due Item: NSBS Departmental Due</span>
                    <span className="text-sm font-extrabold text-secondary">N{duesAmount.toLocaleString()}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-secondary hover:bg-emerald-600 text-white font-extrabold rounded-xl shadow-md transition-premium mt-4 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>I Have Made Payment</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Bank details info Column */}
            <div className="md:col-span-5 space-y-6">
              
              {/* Bank Transfer Box */}
              <div className="bg-primary text-white rounded-3xl p-6 border border-white/5 shadow-lg space-y-5">
                <h4 className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
                  <Landmark className="w-4 h-4" /> Bank Account Details
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Make your direct bank transfer of <span className="text-accent font-bold">N{duesAmount.toLocaleString()}</span> to the official departmental account listed below:
                </p>

                <div className="space-y-3 bg-white/5 rounded-2xl p-4 border border-white/10 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-slate-400">Bank Name</span>
                    <span className="font-bold text-slate-100">{settings?.bank_name || 'Wema Bank'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-white/5">
                    <span className="text-xs text-slate-400">Account Name</span>
                    <span className="font-bold text-slate-100 text-right max-w-[150px] leading-tight truncate">{settings?.account_name || 'NSBS UILESA'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-white/5">
                    <span className="text-xs text-slate-400">Account Number</span>
                    <span className="font-bold text-accent text-base select-all tracking-wider">{settings?.account_number || '0245678912'}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex items-start gap-2 bg-white/5 p-3 rounded-xl">
                  <Info className="w-4.5 h-4.5 text-accent shrink-0 mt-0.5" />
                  <p className="leading-normal">
                    Tip: Double-check the account number and name before confirming. Take a screenshot or save the transfer receipt as you will need it for verification.
                  </p>
                </div>
              </div>

              {/* Instructions banner */}
              <div className="bg-slate-100 rounded-3xl p-6 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-secondary" /> Step-by-Step Guide
                </h4>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
                  <li>Transfer the dues amount to the bank account above.</li>
                  <li>Fill out the Student Information Form accurately.</li>
                  <li>Click <span className="font-semibold text-slate-700">&quot;I Have Made Payment&quot;</span>.</li>
                  <li>This will save your verification record and open WhatsApp to send your payment receipt to the treasurer.</li>
                </ol>
              </div>

            </div>

          </div>
        )
      )}

        {/* Tab 2: Track Payments Search */}
        {activeTab === 'track' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            
            {/* Notice banner */}
            <div className="bg-amber-50 text-amber-900 border border-amber-100 rounded-2xl p-5 flex gap-3.5">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="font-bold text-sm text-slate-800">Verification Policy</h5>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Payments are verified manually. Kindly check your payment status at least 12 hours after making payment and notifying the Treasurer. Verification may take longer during weekends, holidays, or periods of high transaction volume.
                </p>
              </div>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleTrackSearch} className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase">Search by Student Matric Number</label>
              <div className="flex gap-3">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2023/1045"
                    value={trackSearchQuery}
                    onChange={(e) => setTrackSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-premium text-sm uppercase"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="px-6 py-3 bg-primary hover:bg-secondary text-white font-bold text-sm rounded-xl transition-premium shadow flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300"
                >
                  {searching ? 'Searching...' : 'Track'}
                </button>
              </div>
            </form>

            {/* Search Results Display */}
            {hasSearched && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                  Payment History ({searchResults.length} Records)
                </h4>

                {searchResults.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-sm">
                    No payment records found for matric number &quot;<span className="font-bold uppercase">{trackSearchQuery}</span>&quot;. Make sure you typed it correctly or file a dues form if you haven&apos;t already.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchResults.map((record) => (
                      <div 
                        key={record.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded uppercase">
                              {record.matric_number}
                            </span>
                            <span className="text-[10px] font-bold text-primary bg-slate-200/60 px-2 py-0.5 rounded">
                              {record.level}L
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">
                              Session: {record.academic_session}
                            </span>
                          </div>
                          <h5 className="font-bold text-sm text-slate-800">
                            {record.surname} {record.first_name} {record.middle_name || ''}
                          </h5>
                          <div className="text-[10px] text-slate-400 font-medium">
                            Paid: N{record.amount_paid.toLocaleString()} on {new Date(record.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Status pill */}
                        <div className="sm:self-center shrink-0">
                          {record.payment_status === 'Approved' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" /> Approved
                            </span>
                          )}
                          {record.payment_status === 'Pending Verification' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" /> Pending Verification
                            </span>
                          )}
                          {record.payment_status === 'Rejected' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payment issues support CTA */}
            <div className="pt-6 border-t border-slate-100 text-center space-y-3">
              <p className="text-xs text-slate-500">
                Having Payment Issues? Let us know so the Treasurer can help resolve it.
              </p>
              <button
                onClick={openTreasurerSupport}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 hover:text-secondary border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-premium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" /> Contact Treasurer
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
