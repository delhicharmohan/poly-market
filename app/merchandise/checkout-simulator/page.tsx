"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Smartphone, CheckCircle, AlertTriangle, HelpCircle, ArrowRight, Loader2 } from "lucide-react";

function SimulatorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId") || "ORDER-MOCK";
  const amount = parseFloat(searchParams.get("amount") || "100");
  const returnUrl = searchParams.get("returnUrl") || "/merchandise/success";
  const txnId = searchParams.get("txnId") || "pay_mock";
  const renderDown = searchParams.get("renderDown") === "true";

  const [utr, setUtr] = useState("111112345678");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookResult, setWebhookResult] = useState<any>(null);

  const handleSubmit = async (simulatedStatus: "APPROVED" | "DECLINED") => {
    setLoading(true);
    setError(null);
    setWebhookResult(null);

    try {
      const res = await fetch("/api/payments/simulate-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status: simulatedStatus,
          utr,
          amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Simulation request failed");
      }

      setWebhookResult(data);

      // Wait 1.5 seconds to show the user the result, then redirect
      setTimeout(() => {
        window.location.href = returnUrl;
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to trigger simulation");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center relative">
          <div className="absolute top-3 left-3 bg-black/30 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full text-slate-300">
            Sandbox Simulator
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mb-1">
            P2P UPI Aggregator
          </h2>
          <p className="text-indigo-200 text-xs font-semibold">
            Merchant Transaction Gateway Simulation
          </p>
        </div>

        {renderDown && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-200/90 font-medium leading-normal">
              <span className="font-bold text-amber-400">Aggregator Offline:</span> The Render sandbox API returned a 502/connection error. Running in local simulation mode.
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-6 space-y-6">
          <div className="bg-slate-700/30 rounded-2xl p-4 border border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                Amount to Pay
              </span>
              <span className="text-3xl font-black text-white">
                ₹{amount.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                Order ID
              </span>
              <span className="text-sm font-semibold text-indigo-400">
                {orderId}
              </span>
            </div>
          </div>

          {/* QR / Method representation */}
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-700/50">
            <span className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
              Scan QR to pay ₹{amount.toFixed(2)}
            </span>
            <div className="bg-slate-100 p-2 rounded-xl mb-2">
              {/* Premium Vector simulated QR */}
              <div className="w-40 h-40 bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=merchant@p2pupi&am=')]" style={{ backgroundSize: 'cover' }}>
                <div className="w-full h-full flex items-center justify-center bg-slate-900/5 backdrop-blur-[0.5px]">
                  <Smartphone className="w-8 h-8 text-indigo-600 drop-shadow-md" />
                </div>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              VPA: merchant@platformupi · Ref: {txnId.slice(0, 12)}
            </span>
          </div>

          {/* UTR Input Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Bank Reference Number (12-digit UTR)
              </label>
              <input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="Enter 12-digit UTR"
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Tip: Enter any UTR starting with <span className="text-emerald-400 font-semibold">1111...</span> for approval, or <span className="text-rose-400 font-semibold">0000...</span> for decline.
              </p>
            </div>

            {error && (
              <div className="bg-rose-900/20 border border-rose-800 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {webhookResult && (
              <div className="bg-emerald-950/30 border border-emerald-800 text-emerald-300 p-3 rounded-xl text-xs flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">Simulated Webhook Dispatched!</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1 break-all">
                  To: {webhookResult.webhookUrl} ({webhookResult.status})
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={loading || utr.length < 12}
                onClick={() => handleSubmit("DECLINED")}
                className="py-3.5 bg-slate-750 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm border border-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                Simulate Decline
              </button>
              <button
                disabled={loading || utr.length < 12}
                onClick={() => handleSubmit("APPROVED")}
                className="py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:scale-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Simulate Success
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/40 text-center border-t border-slate-800/80">
          <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
            Platform Gateway Simulator v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSimulatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-800 border-t-indigo-600" />
        </div>
      }
    >
      <SimulatorContent />
    </Suspense>
  );
}
