'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Lock, Eye, EyeOff, AlertCircle,
  ArrowLeft, CheckCircle2, KeyRound
} from 'lucide-react';
import { createClient } from '@/lib/client';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if session or recovery token is active
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setReady(true);
        } else {
          // If no session, wait a brief moment for hash fragment to be processed by Supabase client
          const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (session || event === 'PASSWORD_RECOVERY') {
                setReady(true);
              }
            }
          );
          setTimeout(() => setReady(true), 1500);
          return () => {
            authListener.subscription.unsubscribe();
          };
        }
      } catch {
        setReady(true);
      }
    };
    checkAuth();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPass) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (cleanPass.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: cleanPass,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Your password has been successfully reset! Redirecting to dashboard...');
        setTimeout(() => {
          router.replace('/admin/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred while updating your password.');
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
        <div className="text-left">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold transition-premium cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Sign In
          </Link>
        </div>

        <div className="glass-dark rounded-3xl p-7 sm:p-8 border border-white/10 shadow-2xl text-white space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Create New Password
            </h1>
            <p className="text-xs text-slate-400 max-w-[320px] mx-auto leading-relaxed">
              Enter and confirm your new administrator password below.
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl bg-slate-800/80 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-xs text-white caret-white"
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

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl bg-slate-800/80 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-xs text-white caret-white"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/35 rounded-xl text-[11px] text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-normal">{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/35 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-normal">{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950/40 hover:shadow-amber-950/40 transition-all duration-300 ease-in-out cursor-pointer disabled:bg-slate-800 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Save New Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
