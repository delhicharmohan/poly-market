"use client";

import { useState, useEffect } from "react";
import { wallet } from "@/lib/wallet";
import { triggerConfetti } from "@/lib/confetti";
import { X, Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, DollarSign } from "lucide-react";

interface WalletModalProps {
  onClose: () => void;
}

export default function WalletModal({ onClose }: WalletModalProps) {
  const [balance, setBalance] = useState(0);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    wallet.getBalance().then(setBalance);
  }, []);

  const refreshBalance = async () => {
    const newBalance = await wallet.getBalance();
    setBalance(newBalance);
  };

  const handleDeposit = async () => {
    setError(null);
    setSuccess(null);
    const depositAmount = parseFloat(amount);
    
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const success = await wallet.deposit(depositAmount);
    if (success) {
      setSuccess(`Successfully deposited $${depositAmount.toFixed(2)}`);
      setAmount("");
      await refreshBalance();
      
      // Trigger confetti celebration
      triggerConfetti();
      
      // Close modal and return to home after celebration
      setTimeout(() => {
        setShowDeposit(false);
        setSuccess(null);
        onClose();
      }, 2000);
    } else {
      setError("Failed to deposit. Please try again.");
    }
  };

  const handleWithdraw = async () => {
    setError(null);
    setSuccess(null);
    const withdrawAmount = parseFloat(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const canWithdraw = await wallet.canWithdraw(withdrawAmount);
    if (!canWithdraw) {
      setError("Insufficient balance");
      return;
    }

    const success = await wallet.withdraw(withdrawAmount);
    if (success) {
      setSuccess(`Successfully withdrew $${withdrawAmount.toFixed(2)}`);
      setAmount("");
      await refreshBalance();
      setTimeout(() => {
        setShowWithdraw(false);
        setSuccess(null);
      }, 1500);
    } else {
      setError("Failed to withdraw. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeInUp">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <WalletIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Wallet
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Balance Display */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 mb-6 border border-indigo-200 dark:border-indigo-800">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Available Balance</div>
          <div className="flex items-baseline space-x-2">
            <DollarSign className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span className="text-4xl font-bold text-slate-900 dark:text-white">
              {balance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {!showDeposit && !showWithdraw && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setShowDeposit(true);
                setError(null);
                setSuccess(null);
                setAmount("");
              }}
              className="flex flex-col items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <ArrowDownCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Deposit</span>
            </button>
            <button
              onClick={() => {
                setShowWithdraw(true);
                setError(null);
                setSuccess(null);
                setAmount("");
              }}
              disabled={balance === 0}
              className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                balance === 0
                  ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 cursor-not-allowed opacity-50"
                  : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:border-rose-300 dark:hover:border-rose-700"
              }`}
            >
              <ArrowUpCircle className={`h-8 w-8 mb-2 ${
                balance === 0
                  ? "text-gray-400 dark:text-gray-600"
                  : "text-rose-600 dark:text-rose-400"
              }`} />
              <span className={`font-semibold ${
                balance === 0
                  ? "text-gray-500 dark:text-gray-500"
                  : "text-rose-700 dark:text-rose-300"
              }`}>Withdraw</span>
            </button>
          </div>
        )}

        {/* Deposit Form */}
        {showDeposit && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Deposit Funds</h3>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <span className="text-sm text-green-600 dark:text-green-400">{success}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Amount ($)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeposit(false);
                  setAmount("");
                  setError(null);
                  setSuccess(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Deposit
              </button>
            </div>
          </div>
        )}

        {/* Withdraw Form */}
        {showWithdraw && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Withdraw Funds</h3>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <span className="text-sm text-green-600 dark:text-green-400">{success}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Amount ($)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                step="0.01"
                min="0.01"
                max={balance}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Maximum: ${balance.toFixed(2)}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowWithdraw(false);
                  setAmount("");
                  setError(null);
                  setSuccess(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={!amount || parseFloat(amount) > balance || parseFloat(amount) <= 0}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

