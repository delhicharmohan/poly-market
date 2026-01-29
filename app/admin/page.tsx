"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Receipt, ShoppingBag, ShieldAlert, LogOut } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { dbClient } from "@/lib/db-client";

type Tab = "users" | "transactions" | "sales";

function formatINR(amount: number): string {
  return `₹${amount >= 1000 ? amount.toLocaleString("en-IN") : amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const r = await dbClient.getAdminMe();
      setIsAdmin(r.isAdmin);
      if (!r.isAdmin) {
        if (!authLoading && !user) router.replace("/admin/login");
        else router.replace("/");
      }
    };
    check();
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      setLoading(true);
      const [u, t, s] = await Promise.all([
        dbClient.getAdminUsers(),
        dbClient.getAdminTransactions(),
        dbClient.getAdminSales(),
      ]);
      setUsers(u);
      setTransactions(t);
      setSales(s);
      setLoading(false);
    };
    load();
  }, [isAdmin]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "users", label: "Users", icon: Users },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "sales", label: "Sales", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link
            href={user ? "/more" : "/"}
            className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Admin</span>
            </div>
            <button
              onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
                router.replace("/admin/login");
              }}
              className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          Admin Dashboard
        </h1>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {tab === "users" && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Email</th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Name</th>
                        <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">Balance</th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="p-3 text-slate-900 dark:text-white">{u.email}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{u.displayName || "—"}</td>
                          <td className="p-3 text-right font-medium text-slate-900 dark:text-white">{formatINR(u.balance)}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{formatDate(u.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {users.length === 0 && (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">No users yet.</div>
                )}
              </div>
            )}

            {tab === "transactions" && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/95 z-10">
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">User</th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Type</th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Description</th>
                        <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">Amount</th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="p-3">
                            <span className="text-slate-900 dark:text-white block">{tx.userEmail}</span>
                            {tx.userDisplayName && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">{tx.userDisplayName}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 capitalize">{tx.type}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={tx.description || ""}>
                            {tx.description || "—"}
                          </td>
                          <td className="p-3 text-right font-medium tabular-nums">
                            <span className={tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}>
                              {tx.amount >= 0 ? "+" : ""}${tx.amount?.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{formatDate(new Date(tx.timestamp).toISOString())}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {transactions.length === 0 && (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">No transactions yet.</div>
                )}
              </div>
            )}

            {tab === "sales" && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">User</th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Painting</th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Invoice / PDF</th>
                        <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">Amount</th>
                        <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((s) => (
                        <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="p-3">
                            <span className="text-slate-900 dark:text-white block">{s.userEmail}</span>
                            {s.userDisplayName && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">{s.userDisplayName}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-900 dark:text-white">{s.paintingName}</td>
                          <td className="p-3">
                            <a
                              href={`/api/admin/sales/${s.id}/invoice`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono text-xs"
                            >
                              {s.invoiceNumber} (PDF)
                            </a>
                          </td>
                          <td className="p-3 text-right font-medium text-indigo-600 dark:text-indigo-400">{formatINR(s.amountInr)}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{formatDate(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sales.length === 0 && (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">No sales yet.</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
