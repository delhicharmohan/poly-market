"use client";

import { useState, useEffect } from "react";
import { dbClient } from "@/lib/db-client";
import { ShoppingBag, Mail, FileText, User, Download } from "lucide-react";

interface Sale {
  id: string;
  invoiceNumber: string;
  paintingId: string;
  paintingName: string;
  paintingImageUrl: string | null;
  amountInr: number;
  emailSentAt: string | null;
  createdAt: string;
  userEmail?: string;
  userDisplayName?: string | null;
}

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

export default function SalesList() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const list = await dbClient.getAdminSales();
      setSales(list);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mx-auto" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Loading sales…</p>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No sales yet</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Your painting purchases and invoices will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Sales / Orders
        </h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {sales.map((sale) => (
          <div
            key={sale.id}
            className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex gap-4">
              {sale.paintingImageUrl ? (
                <img
                  src={sale.paintingImageUrl}
                  alt={sale.paintingName}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="h-6 w-6 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {sale.paintingName}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{sale.invoiceNumber}</span>
                </div>
                <a
                  href={`/api/admin/sales/${sale.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download invoice (PDF)
                </a>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{sale.emailSentAt ? "Invoice & painting sent to email" : "Email pending"}</span>
                </div>
                {sale.userEmail && (
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    <span>{sale.userDisplayName || sale.userEmail}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {formatINR(sale.amountInr)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {formatDate(sale.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 text-center border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          End of list
        </p>
      </div>
    </div>
  );
}
