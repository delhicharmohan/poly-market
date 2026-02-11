"use client";

import { useState } from "react";
import { X, Copy, Check, Smartphone, ExternalLink } from "lucide-react";

interface UpiAppChooserProps {
    upiLink: string;
    onClose: () => void;
}

interface UpiApp {
    name: string;
    scheme: string;
    color: string;
    logo: string;
}

const UPI_APPS: UpiApp[] = [
    { name: "PhonePe", scheme: "phonepe://pay", color: "bg-[#5f259f]", logo: "/images/PhonePe_Logo.svg.png" },
    { name: "Google Pay", scheme: "tez://pay", color: "bg-white", logo: "/images/Google_Pay_Logo.png" },
    { name: "Paytm", scheme: "paytmmp://pay", color: "bg-[#00baf2]", logo: "/images/Paytm_Logo_(standalone).png" },
];

export default function UpiAppChooser({ upiLink, onClose }: UpiAppChooserProps) {
    const [copied, setCopied] = useState(false);

    const getDeepLink = (scheme: string) => {
        return upiLink.replace(/^upi:\/\/pay/i, scheme);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(upiLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAppClick = (scheme: string) => {
        window.location.href = getDeepLink(scheme);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl">
                            <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">Select UPI App</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Choose your preferred way to pay</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="grid grid-cols-1 gap-4 mb-8">
                        {UPI_APPS.map((app) => (
                            <button
                                key={app.name}
                                onClick={() => handleAppClick(app.scheme)}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/50 transition-all active:scale-[0.98] group relative overflow-hidden"
                            >
                                <div className={`${app.color} w-16 h-12 rounded-xl flex items-center justify-center p-2 shadow-sm transition-transform group-hover:scale-105 overflow-hidden border border-slate-200 dark:border-slate-700`}>
                                    <img src={app.logo} alt={app.name} className="max-w-full max-h-full object-contain" />
                                </div>
                                <div className="flex-1 text-left">
                                    <span className="font-bold text-slate-900 dark:text-white text-lg block">{app.name}</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">Pay securely with {app.name}</span>
                                </div>
                                <div className="bg-indigo-50 dark:bg-indigo-900/40 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => window.location.href = upiLink}
                            className="w-full flex items-center justify-center gap-2 py-4 px-6 border-2 border-indigo-600/20 dark:border-indigo-400/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold text-lg transition-all active:scale-[0.98]"
                        >
                            Other UPI Apps
                            <ExternalLink className="w-5 h-5 opacity-70" />
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98]"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                {copied ? "UPI Link Copied!" : "Copy URL"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 text-center">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
                        Secure Payment Powered by xpaysafe
                    </p>
                </div>
            </div>
        </div>
    );
}
