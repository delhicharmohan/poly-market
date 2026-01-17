"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, LogOut, Mail, History, ChevronRight, Settings, Shield, HelpCircle, ArrowRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import TransactionsList from "@/components/TransactionsList";

export default function MorePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600"></div>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const menuItems = [
    { id: "transactions", label: "Transaction History", icon: History, color: "text-slate-900 dark:text-white", onClick: () => setShowTransactions(true) },
    { id: "security", label: "Security & Privacy", icon: Shield, color: "text-slate-900 dark:text-white" },
    { id: "settings", label: "App Settings", icon: Settings, color: "text-slate-900 dark:text-white" },
    { id: "support", label: "Help & Support", icon: HelpCircle, color: "text-slate-900 dark:text-white" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pb-24 selection:bg-indigo-100">
      <div className="max-w-xl mx-auto px-4 pt-8">

        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-10 px-2">
          <button
            onClick={() => showTransactions ? setShowTransactions(false) : router.push("/")}
            className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {showTransactions ? "History" : "Account"}
          </h1>
          <div className="w-10"></div>
        </div>

        {showTransactions ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <TransactionsList />
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-700">

            {/* Minimal Profile Section */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center shadow-xl shadow-slate-200/20 dark:shadow-none">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2rem] flex items-center justify-center p-0.5 shadow-2xl">
                  <div className="w-full h-full bg-slate-900 rounded-[1.8rem] flex items-center justify-center">
                    <User className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 border-4 border-slate-50 dark:border-slate-900 rounded-full"></div>
              </div>

              <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight mb-1">
                {user.displayName || user.email?.split("@")[0] || "User"}
              </h2>
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <Mail className="h-3 w-3" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{user.email}</span>
              </div>
            </div>

            {/* Menu Sections */}
            <div className="space-y-4">
              <div className="flex items-center px-4 mb-2">
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] px-4">Menu</span>
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
              </div>

              <div className="grid gap-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="w-full group flex items-center justify-between px-6 py-5 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-3xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-5 h-5 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transform -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-white dark:bg-slate-900/20 rounded-3xl border border-slate-100 dark:border-slate-800 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 hover:border-rose-100 dark:hover:border-rose-900/30 transition-all group"
              >
                <LogOut className="h-4 w-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                <span className="text-sm font-black text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 uppercase tracking-widest">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
