"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, LogOut, Mail, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import TransactionsList from "@/components/TransactionsList";

export default function MorePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [showTransactions, setShowTransactions] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600"></div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Arrow */}
        <button
          onClick={() => {
            if (showTransactions) {
              setShowTransactions(false);
            } else {
              router.push("/");
            }
          }}
          className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
        </button>

        {!showTransactions && (
          <>
            {/* User Profile Section */}
            <div className="mb-6 p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {user.displayName || user.email?.split("@")[0] || "User"}
                  </h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {showTransactions ? (
          /* Transactions View */
          <div>
            <TransactionsList />
          </div>
        ) : (
          /* Options Menu */
          <div className="space-y-4">
            <button
              onClick={() => setShowTransactions(true)}
              className="w-full flex items-center space-x-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-slate-900 dark:text-white font-medium">Transactions</span>
            </button>



            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400 font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

