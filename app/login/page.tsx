"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { X } from "lucide-react";
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

  // Redirect if user is already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Clear errors when component mounts or when switching auth methods
  useEffect(() => {
    setError(null);
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // For sign-in: If password field is not shown and email is entered, show password field
    if (!isSignUp && !showPassword && email.trim()) {
      setShowPassword(true);
      return;
    }

    // For sign-up: Always require password
    if (isSignUp && !password.trim()) {
      setError("Please enter a password (minimum 6 characters)");
      return;
    }

    // For sign-in: Validate password when shown
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
      console.error("Email auth error:", err);
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading || authLoading) return;

    // FORCE CLEAR ERROR
    setError(null);
    setLoading(true);

    try {
      await signInWithGoogle();
      // If popup succeeds, the user state change will trigger the redirect in useEffect
      // If redirect happens, the page will reload
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      
      // Filter out email/password related errors
      if (err.code === "auth/missing-password" || 
          err.code === "auth/invalid-email" ||
          err.code === "auth/user-not-found" ||
          err.code === "auth/wrong-password") {
        setLoading(false);
        setError(null);
        return;
      }

      // If it was cancelled by user, just stop loading
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        setLoading(false);
        return;
      }
      
      setError(err.message || "Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-800 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {/* Close Button */}
        <Link
          href="/"
          className="absolute top-0 left-0 text-white hover:text-slate-300 transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </Link>

        <div className="bg-slate-800 dark:bg-slate-900 rounded-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
          </div>

          {/* Welcome Text */}
          <h1 className="text-3xl font-bold text-white text-center mb-8">
            Welcome to Indimarket
          </h1>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Google Sign In */}
          <div
            role="button"
            onClick={handleGoogleSignIn}
            className={`w-full bg-blue-600 hover:bg-blue-700 ${loading || authLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} text-white font-medium py-3 px-4 rounded-lg mb-6 flex items-center justify-center space-x-3 transition-colors`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </div>

          {/* OR Separator */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 dark:bg-slate-900 text-white">OR</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4" id="email-form">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="Email address"
                required
                disabled={showPassword}
                className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            {((!isSignUp && showPassword) || isSignUp) && (
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Password"
                  required
                  minLength={6}
                  autoFocus={showPassword}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || (showPassword && !password)}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? "Loading..." : isSignUp ? "Sign Up" : showPassword ? "Continue" : "Continue"}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setShowPassword(false);
                setPassword("");
                setError(null);
              }}
              className="text-sm text-white hover:text-slate-300 transition-colors"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              Terms • Privacy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

