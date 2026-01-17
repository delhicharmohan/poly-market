"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { X, ArrowRight, ShieldCheck, Mail, Lock } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSignUp && !showPassword && email.trim()) {
      setShowPassword(true);
      return;
    }

    if (isSignUp && !password.trim()) {
      setError("Please enter a password (minimum 6 characters)");
      return;
    }

    if (!isSignUp && showPassword && !password.trim()) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading || authLoading) return;
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Google sign-in failed.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 selection:bg-indigo-100">
      <div className="w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-700">

        {/* Top Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/30">
            <ShieldCheck className="text-white h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 italic">
            INDIMARKET
          </h1>
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            {isSignUp ? "Create Secure Account" : "Identity Verification"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-4">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Google Button */}
          {!showPassword && !isSignUp && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading || authLoading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600">
                  <span className="px-4 bg-[#f8fafc] dark:bg-[#020617]">Proton Auth</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="Secure Email"
                required
                disabled={showPassword && !isSignUp}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
              />
            </div>

            {((!isSignUp && showPassword) || isSignUp) && (
              <div className="relative animate-in slide-in-from-top-2 duration-300">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Access Key"
                  required
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 group shadow-xl shadow-indigo-500/10"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
              ) : (
                <>
                  <span className="uppercase tracking-widest text-xs">
                    {isSignUp ? "Create Vault" : showPassword ? "Verify Identity" : "Continue"}
                  </span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setShowPassword(false); setError(null); }}
            className="w-full mt-8 text-[11px] font-black text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 uppercase tracking-widest transition-colors"
          >
            {isSignUp ? "Existng User? Sign In" : "New User? Register Vault"}
          </button>
        </div>

        {/* Bottom Security Note */}
        <div className="mt-10 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">End-to-End Encrypted</span>
          <span className="w-1 h-1 bg-slate-400 dark:bg-slate-600 rounded-full"></span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Indimarket Network</span>
        </div>
      </div>
    </div>
  );
}
