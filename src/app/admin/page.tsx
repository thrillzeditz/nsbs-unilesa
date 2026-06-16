'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase, getStaffAccounts } from '@/lib/db';
import Link from 'next/link';


export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check if already logged in
    const isLoggedIn = sessionStorage.getItem('nsbs_admin_session') === 'true';
    if (isLoggedIn) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Supabase Mode
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        // Check if email exists in staff_accounts
        const { data: staffData } = await supabase
          .from('staff_accounts')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .single();

        sessionStorage.setItem('nsbs_admin_session', 'true');
        if (staffData) {
          sessionStorage.setItem('nsbs_admin_role', 'staff');
          sessionStorage.setItem('nsbs_admin_name', staffData.name);
          sessionStorage.setItem('nsbs_admin_email', staffData.email);
        } else {
          sessionStorage.setItem('nsbs_admin_role', 'super_admin');
          sessionStorage.setItem('nsbs_admin_name', 'Super Admin');
          sessionStorage.setItem('nsbs_admin_email', email.trim().toLowerCase());
        }
        router.push('/admin/dashboard');
      } else {
        // 2. Mock Mode Fallback
        const mockEmail = 'admin@nsbs.unilesa.edu.ng';
        const mockPass = 'admin123';
        const trimmedEmail = email.trim().toLowerCase();

        if (trimmedEmail === mockEmail && password === mockPass) {
          sessionStorage.setItem('nsbs_admin_session', 'true');
          sessionStorage.setItem('nsbs_admin_role', 'super_admin');
          sessionStorage.setItem('nsbs_admin_name', 'Super Admin');
          sessionStorage.setItem('nsbs_admin_email', trimmedEmail);
          router.push('/admin/dashboard');
        } else {
          // Check mock staff accounts
          const staffAccounts = await getStaffAccounts();
          const matchedStaff = staffAccounts.find(
            (sa) => sa.email.toLowerCase() === trimmedEmail && sa.password === password
          );

          if (matchedStaff) {
            sessionStorage.setItem('nsbs_admin_session', 'true');
            sessionStorage.setItem('nsbs_admin_role', 'staff');
            sessionStorage.setItem('nsbs_admin_name', matchedStaff.name);
            sessionStorage.setItem('nsbs_admin_email', matchedStaff.email);
            router.push('/admin/dashboard');
          } else {
            setErrorMsg("Invalid administrator or staff credentials. Please check your inputs.");
          }
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex-grow flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 relative bg-slate-900 overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_30%,#10b981_0%,transparent_50%),radial-gradient(circle_at_70%_70%,#f59e0b_0%,transparent_50%)]" />
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        
        {/* Back Link */}
        <div className="text-left">
          <Link 
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold transition-premium cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Website Home
          </Link>
        </div>

        {/* Card Box */}
        <div className="glass-dark rounded-3xl p-8 border border-white/10 shadow-2xl text-white space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 rounded-full bg-secondary/15 border border-secondary/35 text-secondary">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Portal Access Gateway
            </h1>
            <p className="text-xs text-slate-400 max-w-[320px] mx-auto leading-relaxed">
              Sign in with your credentials to access the Super Admin CMS or Staff Portal.
            </p>

          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="Enter admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 border border-white/10 rounded-xl bg-white/5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-premium text-xs text-white"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Access Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 border border-white/10 rounded-xl bg-white/5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-premium text-xs text-white"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/35 rounded-xl text-[11px] text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-normal">{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-secondary hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-secondary/20 transition-premium cursor-pointer disabled:bg-slate-800 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Access Dashboard</span>
              )}
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
