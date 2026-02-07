"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";

export default function MerchandiseSuccessPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="max-w-lg mx-auto px-4 py-8">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
          <div className="inline-flex rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4 mb-4">
            <CheckCircle className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Payment submitted
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Your payment has been received. Your wallet will be credited with free wagering points once the payment is confirmed.
          </p>
          <button
            onClick={() => router.push("/wallet")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Wallet className="h-4 w-4" />
            View wallet
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
