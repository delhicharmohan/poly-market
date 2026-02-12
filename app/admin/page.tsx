"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Receipt,
  ShoppingBag,
  ShieldAlert,
  LogOut,
  UserPlus,
  Trash2,
  ShieldBan,
  ShieldCheck,
  X,
  Loader2,
  Wallet,
  Plus,
  Minus,
  Search,
  Eye,
} from "lucide-react";
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

/* ─── Search Input ─────────────────────────────────────────────── */
function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search…"}
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ─── Add‑User Modal ───────────────────────────────────────────── */
function AddUserModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await dbClient.addUser(email, displayName || undefined);
    setSaving(false);
    if (res.success) {
      onAdded();
      onClose();
    } else {
      setError(res.message || "Failed to add user");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-500" />
            Add New User
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="John Doe"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition" />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Adding…</>) : (<><UserPlus className="h-4 w-4" />Add User</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Confirm Delete Modal ─────────────────────────────────────── */
function ConfirmDeleteModal({ userName, onConfirm, onCancel, deleting }: { userName: string; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30"><Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete User</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{userName}</strong>?
          This will also remove their wallet transactions and wagers. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2">
            {deleting ? (<><Loader2 className="h-4 w-4 animate-spin" />Deleting…</>) : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Fund Modal (Add / Remove Funds) ──────────────────────────── */
function FundModal({ user: targetUser, onClose, onDone }: { user: { id: string; email: string; balance: number }; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setError("Enter a valid positive amount"); return; }
    setSaving(true);
    const res = await dbClient.adminAdjustBalance(targetUser.id, type, num);
    setSaving(false);
    if (res.success) { onDone(); onClose(); } else { setError(res.message || "Failed"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Wallet className="h-5 w-5 text-indigo-500" />Manage Funds</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            User: <strong className="text-slate-900 dark:text-white">{targetUser.email}</strong><br />
            Current balance: <strong className="text-slate-900 dark:text-white">{formatINR(targetUser.balance)}</strong>
          </div>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button type="button" onClick={() => setType("deposit")} className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${type === "deposit" ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
              <Plus className="h-4 w-4" />Add Funds
            </button>
            <button type="button" onClick={() => setType("withdraw")} className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${type === "withdraw" ? "bg-red-600 text-white" : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
              <Minus className="h-4 w-4" />Remove Funds
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
            <input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition" />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 ${type === "deposit" ? "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400" : "bg-red-600 hover:bg-red-700 disabled:bg-red-400"}`}>
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Processing…</>) : type === "deposit" ? "Add Funds" : "Remove Funds"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── User Detail Modal (Sales + Transactions) ────────────────── */
function UserDetailModal({
  user: detailUser,
  transactions,
  sales,
  onClose,
}: {
  user: { id: string; email: string; displayName: string | null; balance: number; isBlocked: boolean; createdAt: string };
  transactions: any[];
  sales: any[];
  onClose: () => void;
}) {
  const [detailTab, setDetailTab] = useState<"transactions" | "sales">("transactions");

  const userTx = useMemo(
    () => transactions.filter((tx) => tx.userEmail === detailUser.email),
    [transactions, detailUser.email]
  );
  const userSales = useMemo(
    () => sales.filter((s) => s.userEmail === detailUser.email),
    [sales, detailUser.email]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-indigo-500" />
              {detailUser.displayName || detailUser.email}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{detailUser.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User stats */}
        <div className="grid grid-cols-3 gap-3 px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex-shrink-0">
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">Balance</p>
            <p className="font-semibold text-slate-900 dark:text-white">{formatINR(detailUser.balance)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">Transactions</p>
            <p className="font-semibold text-slate-900 dark:text-white">{userTx.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">Sales</p>
            <p className="font-semibold text-slate-900 dark:text-white">{userSales.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <button onClick={() => setDetailTab("transactions")} className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${detailTab === "transactions" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600" : "text-slate-500 dark:text-slate-400"}`}>
            <Receipt className="h-4 w-4" />Transactions ({userTx.length})
          </button>
          <button onClick={() => setDetailTab("sales")} className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${detailTab === "sales" ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600" : "text-slate-500 dark:text-slate-400"}`}>
            <ShoppingBag className="h-4 w-4" />Sales ({userSales.length})
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {detailTab === "transactions" && (
            <>
              {userTx.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">No transactions for this user.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/95 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Type</th>
                      <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Description</th>
                      <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">Amount</th>
                      <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTx.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="p-3 text-slate-600 dark:text-slate-400 capitalize">{tx.type}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={tx.description || ""}>{tx.description || "—"}</td>
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
              )}
            </>
          )}

          {detailTab === "sales" && (
            <>
              {userSales.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">No sales for this user.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/95 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Painting</th>
                      <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Invoice</th>
                      <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">Amount</th>
                      <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userSales.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="p-3 text-slate-900 dark:text-white">{s.paintingName}</td>
                        <td className="p-3">
                          <a href={`/api/admin/sales/${s.id}/invoice`} target="_blank" rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono text-xs">{s.invoiceNumber} (PDF)</a>
                        </td>
                        <td className="p-3 text-right font-medium text-indigo-600 dark:text-indigo-400">{formatINR(s.amountInr)}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{formatDate(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Admin Page ──────────────────────────────────────────── */
export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchUsers, setSearchUsers] = useState("");
  const [searchTx, setSearchTx] = useState("");
  const [searchSales, setSearchSales] = useState("");

  // Modal states
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fundTarget, setFundTarget] = useState<{ id: string; email: string; balance: number } | null>(null);
  const [detailUser, setDetailUser] = useState<any | null>(null);

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

  const loadData = async () => {
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

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  /* ─── Filtered lists ─────────────────────────────────── */
  const filteredUsers = useMemo(() => {
    if (!searchUsers.trim()) return users;
    const q = searchUsers.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q)
    );
  }, [users, searchUsers]);

  const filteredTx = useMemo(() => {
    if (!searchTx.trim()) return transactions;
    const q = searchTx.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.userEmail?.toLowerCase().includes(q) ||
        tx.userDisplayName?.toLowerCase().includes(q) ||
        tx.type?.toLowerCase().includes(q) ||
        tx.description?.toLowerCase().includes(q)
    );
  }, [transactions, searchTx]);

  const filteredSales = useMemo(() => {
    if (!searchSales.trim()) return sales;
    const q = searchSales.toLowerCase();
    return sales.filter(
      (s) =>
        s.userEmail?.toLowerCase().includes(q) ||
        s.userDisplayName?.toLowerCase().includes(q) ||
        s.paintingName?.toLowerCase().includes(q) ||
        s.invoiceNumber?.toLowerCase().includes(q)
    );
  }, [sales, searchSales]);

  /* ─── Action handlers ────────────────────────────────── */
  const handleBlock = async (userId: string, blocked: boolean) => {
    setActionLoading(userId);
    await dbClient.blockUser(userId, blocked);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isBlocked: blocked } : u)));
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await dbClient.deleteUser(deleteTarget.id);
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "users", label: "Users", icon: Users },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "sales", label: "Sales", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={user ? "/more" : "/"} className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Admin</span>
            </div>
            <button onClick={async () => { await fetch("/api/admin/logout", { method: "POST", credentials: "include" }); router.replace("/admin/login"); }}
              className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
              <LogOut className="h-4 w-4" />Log out
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Admin Dashboard</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* ══════════════ USERS TAB ══════════════ */}
            {tab === "users" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="flex-1 max-w-sm">
                    <SearchInput value={searchUsers} onChange={setSearchUsers} placeholder="Search by email or name…" />
                  </div>
                  <button onClick={() => setShowAddUser(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm self-end">
                    <UserPlus className="h-4 w-4" />Add User
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                          <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Email</th>
                          <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Name</th>
                          <th className="text-center p-3 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                          <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">Balance</th>
                          <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">Created</th>
                          <th className="text-center p-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} onClick={() => setDetailUser(u)} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                            <td className="p-3 text-slate-900 dark:text-white">{u.email}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{u.displayName || "—"}</td>
                            <td className="p-3 text-center">
                              {u.isBlocked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                  <ShieldBan className="h-3 w-3" />Blocked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                  <ShieldCheck className="h-3 w-3" />Active
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-medium text-slate-900 dark:text-white">{formatINR(u.balance)}</td>
                            <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{formatDate(u.createdAt)}</td>
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => handleBlock(u.id, !u.isBlocked)} disabled={actionLoading === u.id}
                                  title={u.isBlocked ? "Unblock user" : "Block user"}
                                  className={`p-1.5 rounded-lg transition-colors ${u.isBlocked ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"} disabled:opacity-40`}>
                                  {actionLoading === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : u.isBlocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
                                </button>
                                <button onClick={() => setFundTarget({ id: u.id, email: u.email, balance: u.balance })} title="Add / Remove funds"
                                  className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                  <Wallet className="h-4 w-4" />
                                </button>
                                <button onClick={() => setDeleteTarget({ id: u.id, name: u.email })} title="Delete user"
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                      {searchUsers ? "No users match your search." : "No users yet."}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════ TRANSACTIONS TAB ══════════════ */}
            {tab === "transactions" && (
              <div className="space-y-4">
                <div className="max-w-sm">
                  <SearchInput value={searchTx} onChange={setSearchTx} placeholder="Search by user, type, or description…" />
                </div>
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
                        {filteredTx.map((tx) => (
                          <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-700/50">
                            <td className="p-3">
                              <span className="text-slate-900 dark:text-white block">{tx.userEmail}</span>
                              {tx.userDisplayName && <span className="text-xs text-slate-500 dark:text-slate-400">{tx.userDisplayName}</span>}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 capitalize">{tx.type}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={tx.description || ""}>{tx.description || "—"}</td>
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
                  {filteredTx.length === 0 && (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                      {searchTx ? "No transactions match your search." : "No transactions yet."}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════ SALES TAB ══════════════ */}
            {tab === "sales" && (
              <div className="space-y-4">
                <div className="max-w-sm">
                  <SearchInput value={searchSales} onChange={setSearchSales} placeholder="Search by user, painting, or invoice…" />
                </div>
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
                        {filteredSales.map((s) => (
                          <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/50">
                            <td className="p-3">
                              <span className="text-slate-900 dark:text-white block">{s.userEmail}</span>
                              {s.userDisplayName && <span className="text-xs text-slate-500 dark:text-slate-400">{s.userDisplayName}</span>}
                            </td>
                            <td className="p-3 text-slate-900 dark:text-white">{s.paintingName}</td>
                            <td className="p-3">
                              <a href={`/api/admin/sales/${s.id}/invoice`} target="_blank" rel="noopener noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono text-xs">{s.invoiceNumber} (PDF)</a>
                            </td>
                            <td className="p-3 text-right font-medium text-indigo-600 dark:text-indigo-400">{formatINR(s.amountInr)}</td>
                            <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{formatDate(s.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredSales.length === 0 && (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                      {searchSales ? "No sales match your search." : "No sales yet."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />

      {/* ─── Modals ───────────────────────────────────────────── */}
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onAdded={loadData} />}
      {deleteTarget && <ConfirmDeleteModal userName={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />}
      {fundTarget && <FundModal user={fundTarget} onClose={() => setFundTarget(null)} onDone={loadData} />}
      {detailUser && <UserDetailModal user={detailUser} transactions={transactions} sales={sales} onClose={() => setDetailUser(null)} />}
    </div>
  );
}
