"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { wallet } from "@/lib/wallet";
import { dbClient } from "@/lib/db-client";
import { triggerConfetti } from "@/lib/confetti";
import { X, Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";

interface WalletModalProps {
  onClose: () => void;
}

interface SavedBank {
  beneficiaryName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

const BANK_STORAGE_KEY = "indimarket_saved_bank";

function loadSavedBank(): SavedBank | null {
  try {
    const raw = localStorage.getItem(BANK_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedBank;
  } catch { return null; }
}

function saveBankDetails(details: SavedBank) {
  try { localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(details)); } catch { /* ignore */ }
}

export default function WalletModal({ onClose }: WalletModalProps) {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [hasSavedBank, setHasSavedBank] = useState(false);
  const [useSaved, setUseSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applySavedBank = () => {
    const saved = loadSavedBank();
    if (saved) {
      setBeneficiaryName(saved.beneficiaryName);
      setAccountNumber(saved.accountNumber);
      setIfsc(saved.ifsc);
      setBankName(saved.bankName);
      setUseSaved(true);
    }
  };

  useEffect(() => {
    wallet.getBalance(true).then(setBalance);
    setHasSavedBank(!!loadSavedBank());
  }, []);

  const refreshBalance = async () => {
    const newBalance = await wallet.getBalance(true);
    setBalance(newBalance);
  };

  const handleDeposit = () => {
    setError(null); setSuccess(null);
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) { setError("Please enter a valid amount"); return; }
    setShowDeposit(false); setAmount(""); onClose();
    router.push(`/merchandise?amount=${depositAmount.toFixed(2)}`);
  };

  const handleWithdraw = async () => {
    setError(null); setSuccess(null);
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) { setError("Please enter a valid amount"); return; }
    if (!beneficiaryName.trim()) { setError("Please enter the account holder name"); return; }
    if (!accountNumber.trim()) { setError("Please enter the bank account number"); return; }
    if (!ifsc.trim()) { setError("Please enter the IFSC code"); return; }

    const canWithdrawOk = await wallet.canWithdraw(withdrawAmount);
    if (!canWithdrawOk) { setError("Insufficient balance"); return; }

    setProcessing(true);
    try {
      const trimmedName = beneficiaryName.trim();
      const trimmedAccount = accountNumber.trim();
      const trimmedIfsc = ifsc.trim().toUpperCase();
      const trimmedBank = bankName.trim();

      const result = await dbClient.initiatePayout({
        amount: withdrawAmount,
        beneficiaryName: trimmedName,
        accountNumber: trimmedAccount,
        ifsc: trimmedIfsc,
        bankName: trimmedBank || undefined,
      });

      saveBankDetails({ beneficiaryName: trimmedName, accountNumber: trimmedAccount, ifsc: trimmedIfsc, bankName: trimmedBank });
      setHasSavedBank(true);
      setSuccess(result.message || `Withdrawal of ₹${withdrawAmount.toFixed(2)} initiated`);
      setAmount("");
      await refreshBalance();
      setTimeout(() => { setShowWithdraw(false); setSuccess(null); }, 2500);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Payout failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const resetWithdrawFields = () => {
    setShowWithdraw(false); setAmount(""); setBeneficiaryName(""); setAccountNumber(""); setIfsc(""); setBankName("");
    setError(null); setSuccess(null); setUseSaved(false);
  };

  /* ── Input style helpers ── */
  const inputCls = "w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base";
  const labelCls = "block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1";

  /* ── Shared wallet content ── */
  const walletContent = (
    <>
      {/* Balance */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 mb-5 border border-indigo-200 dark:border-indigo-800">
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Available Balance</div>
        <div className="flex items-baseline space-x-1">
          <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">₹</span>
          <span className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums">{balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Action buttons */}
      {!showDeposit && !showWithdraw && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setShowDeposit(true); setError(null); setSuccess(null); setAmount(""); }}
            className="flex flex-col items-center justify-center p-5 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl active:scale-95 transition-transform">
            <ArrowDownCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
            <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">Add funds</span>
          </button>
          <button onClick={() => { setShowWithdraw(true); setError(null); setSuccess(null); setAmount(""); }}
            disabled={balance === 0}
            className={`flex flex-col items-center justify-center p-5 border-2 rounded-2xl active:scale-95 transition-transform ${balance === 0
              ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 cursor-not-allowed opacity-50"
              : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"}`}>
            <ArrowUpCircle className={`h-8 w-8 mb-2 ${balance === 0 ? "text-gray-400" : "text-rose-600 dark:text-rose-400"}`} />
            <span className={`font-semibold text-sm ${balance === 0 ? "text-gray-500" : "text-rose-700 dark:text-rose-300"}`}>Withdraw</span>
          </button>
        </div>
      )}

      {/* ── Deposit ── */}
      {showDeposit && !success && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Funds</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Buy a painting to get free wagering points (same amount).</p>
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3"><span className="text-sm text-red-600 dark:text-red-400">{error}</span></div>}
          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(null); }}
              step="0.01" min="0.01" placeholder="0.00" className={inputCls} autoFocus inputMode="decimal" />
          </div>
          <div className="flex space-x-3">
            <button onClick={() => { setShowDeposit(false); setAmount(""); setError(null); }}
              className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl transition-colors">Cancel</button>
            <button onClick={handleDeposit}
              className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors">Continue</button>
          </div>
        </div>
      )}

      {showDeposit && success && (
        <div className="py-10 text-center">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <ArrowDownCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Funds Added!</h3>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {success.split('$')[1] ? `+$${success.split('$')[1]}` : success}
          </div>
        </div>
      )}

      {/* ── Withdraw ── */}
      {showWithdraw && !success && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Withdraw to Bank</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Enter your bank details. Funds will be transferred via xpaysafe.</p>

          {hasSavedBank && !useSaved && (
            <button type="button" onClick={applySavedBank}
              className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">💳</span>
                <div className="text-left">
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Use saved bank details</span>
                  <p className="text-[11px] text-indigo-500 dark:text-indigo-400">
                    {(() => { const s = loadSavedBank(); return s ? `${s.beneficiaryName} · ****${s.accountNumber.slice(-4)}` : ""; })()}
                  </p>
                </div>
              </div>
              <span className="text-indigo-400 text-lg">›</span>
            </button>
          )}
          {useSaved && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Using saved bank details</span>
              <button type="button" onClick={() => { setUseSaved(false); setBeneficiaryName(""); setAccountNumber(""); setIfsc(""); setBankName(""); }}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline">Change</button>
            </div>
          )}

          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3"><span className="text-sm text-red-600 dark:text-red-400">{error}</span></div>}

          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(null); }}
              step="0.01" min="0.01" max={balance} placeholder="0.00" inputMode="decimal"
              className={inputCls} autoFocus />
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Available: ₹{balance.toFixed(2)}</p>
          </div>
          <div>
            <label className={labelCls}>Account Holder Name</label>
            <input type="text" value={beneficiaryName} onChange={(e) => { setBeneficiaryName(e.target.value); setError(null); }}
              placeholder="John Doe" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Bank Account Number</label>
            <input type="text" value={accountNumber} onChange={(e) => { setAccountNumber(e.target.value); setError(null); }}
              placeholder="1234567890" inputMode="numeric" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>IFSC Code</label>
              <input type="text" value={ifsc} onChange={(e) => { setIfsc(e.target.value); setError(null); }}
                placeholder="SBIN0001234" className={`${inputCls} uppercase`} />
            </div>
            <div>
              <label className={labelCls}>Bank <span className="text-slate-400">(optional)</span></label>
              <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                placeholder="State Bank" className={inputCls} />
            </div>
          </div>
          <div className="flex space-x-3 pt-2">
            <button onClick={resetWithdrawFields}
              className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl transition-colors">Cancel</button>
            <button onClick={handleWithdraw}
              disabled={processing || !amount || parseFloat(amount) > balance || parseFloat(amount) <= 0 || !beneficiaryName.trim() || !accountNumber.trim() || !ifsc.trim()}
              className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              {processing ? "Processing…" : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      {showWithdraw && success && (
        <div className="py-10 text-center">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <ArrowUpCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Payout Initiated</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{success}</p>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ── Mobile: full-screen page ── */}
      <div className="sm:hidden fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <WalletIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Wallet</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full active:bg-slate-100 dark:active:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-8">
          {walletContent}
        </div>
      </div>

      {/* ── Desktop: centered modal ── */}
      <div className="hidden sm:flex fixed inset-0 bg-black/50 items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <WalletIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Wallet</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          {walletContent}
        </div>
      </div>
    </>
  );
}
