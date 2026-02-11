"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import TransactionsList from "@/components/TransactionsList";
import BottomNav from "@/components/BottomNav";

export default function TransactionsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

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

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 pb-24 selection:bg-indigo-100">
            <div className="max-w-xl mx-auto px-4 pt-8">
                {/* Navigation Header */}
                <div className="flex items-center justify-between mb-10 px-2">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                        History
                    </h1>
                    <div className="w-10"></div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <TransactionsList />
                </div>
            </div>
            <BottomNav />
        </div>
    );
}
