'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Mail, Lock, Eye, EyeOff, AlertCircle,
  ArrowLeft, KeyRound,
} from 'lucide-react';
import { createClient } from '@/lib/client';
import Link from 'next/link';

/**
 * NSBS Admin Login
 *
 * Authentication is performed exclusively via Supabase Auth
 * (supabase.auth.signInWithPassword). There are no master-password
 * overrides, no quick-access buttons, no hardcoded credentials, and no
 * sessionStorage-based authorization flags.
 *
 * A failed Supabase Auth call is always terminal — it never falls
 * through to a secondary check.
 */
export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If the user already has a valid Supabase session, send them straight
  // to the dashboard. The dashboard also verifies the session independently.
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getClaims();
      if (data?.claims) {
        router.replace('/admin/dashboard');
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    let rawEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!rawEmail || !cleanPass) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    // Allow shorthand usernames (e.g. "admin" → "admin@nsbs.unilesa.edu.ng").
    // This is purely a UX convenience; Supabase Auth still validates the
    // full email and password through its own secure backend.
    if (!rawEmail.includes('@')) {
      rawEmail = `${rawEmail}@nsbs.unilesa.edu.ng`;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: rawEmail,
        password: cleanPass,
      });

      if (authError || !authData.user) {
        // Fail closed — never fall through to any alternative path.
        setErrorMsg(
          authError?.message === 'Invalid login credentials'
            ? 'Incorrect email or password. Please try again.'
            : `Authentication failed: ${authError?.message ?? 'Unknown error'}.`
        );
        return;
      }

      // Supabase Auth succeeded. The session is stored in a secure cookie
      // by the browser client. The proxy at /admin/dashboard will verify
      // it on every subsequent request.
      router.replace('/admin/dashboard');
    } catch (err) {
      console.error('Unexpected authentication error:', err);
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 relative bg-slate-900 overflow-hidden">

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
        <div className="glass-dark rounded-3xl p-7 sm:p-8 border border-white/10 shadow-2xl text-white space-y-6">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 rounded-full bg-secondary/15 border border-secondary/35 text-secondary">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Portal Access Gateway
            </h1>
            <p className="text-xs text-slate-400 max-w-[320px] mx-auto leading-relaxed">
              Sign in with your verified administrator credentials to access the portal.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="admin-email"
                  type="text"
                  required
                  autoComplete="email"
                  placeholder="admin@nsbs.unilesa.edu.ng or admin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 border border-white/10 rounded-xl bg-white/5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-premium text-xs text-white"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl bg-white/5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-premium text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/35 rounded-xl text-[11px] text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-normal">{errorMsg}</span>
              </div>
            )}

            <button
              id="admin-login-submit"
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
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Access Dashboard</span>
                </>
              )}
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
