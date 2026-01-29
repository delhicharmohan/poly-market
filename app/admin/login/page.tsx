"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, User } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        setLoading(false);
        return;
      }
      router.replace("/admin");
    } catch (err: any) {
      setError(err?.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <ShieldCheck className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Admin Login</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Use your admin credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Admin username"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ← Back to app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
