"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Search
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Search functionality coming soon...
        </p>
      </div>
      <BottomNav />
    </div>
  );
}

