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
    iconText: string;
}

const UPI_APPS: UpiApp[] = [
    { name: "PhonePe", scheme: "phonepe://pay", color: "bg-[#5f259f]", iconText: "PP" },
    { name: "Google Pay", scheme: "tez://pay", color: "bg-[#4285F4]", iconText: "GP" },
    { name: "Paytm", scheme: "paytmmp://pay", color: "bg-[#00baf2]", iconText: "Py" },
    { name: "BHIM", scheme: "bhim://pay", color: "bg-[#e57d24]", iconText: "BH" },
];

export default function UpiAppChooser({ upiLink, onClose }: UpiAppChooserProps) {
    const [copied, setCopied] = useState(false);

    const getDeepLink = (scheme: string) => {
        // upiLink is typically "upi://pay?pa=...&pn=...&am=...&cu=INR"
        // To target specific apps, replace "upi://pay" with the app scheme
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

    const handleGenericPay = () => {
        window.location.href = upiLink;
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
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {UPI_APPS.map((app) => (
                            <button
                                key={app.name}
                                onClick={() => handleAppClick(app.scheme)}
                                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/50 transition-all active:scale-95 group"
                            >
                                <div className={`${app.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-black/10 transition-transform group-hover:scale-110`}>
                                    {app.iconText}
                                </div>
                                <span className="font-semibold text-slate-900 dark:text-white text-sm">{app.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleGenericPay}
                            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
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
                                {copied ? "Copied!" : "Copy UPI Link"}
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
