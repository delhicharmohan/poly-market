"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Key, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function ConfigPage() {
  const router = useRouter();
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load existing API endpoint if available
    // API key is now managed server-side via environment variables
    const existingEndpoint = api.getApiEndpoint();
    if (existingEndpoint) {
      setApiEndpoint(existingEndpoint);
    } else {
      // Set default endpoint
      setApiEndpoint("http://localhost:3000/api/v1");
    }
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    // Validate endpoint URL format
    if (apiEndpoint.trim()) {
      try {
        new URL(apiEndpoint.trim());
      } catch {
        setError("Please enter a valid API endpoint URL");
        return;
      }
    }

    setLoading(true);
    try {
      if (apiEndpoint.trim()) {
        api.setApiEndpoint(apiEndpoint.trim());
      }
      
      // Dispatch custom event to notify other pages that endpoint was updated
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("apiKeyUpdated"));
      }
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Markets
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Key className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Configuration
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage your API settings and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Settings saved successfully!
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* API Endpoint */}
            <div>
              <label
                htmlFor="apiEndpoint"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
              >
                API Endpoint URL
              </label>
              <input
                type="text"
                id="apiEndpoint"
                value={apiEndpoint}
                onChange={(e) => {
                  setApiEndpoint(e.target.value);
                  setError(null);
                  setSuccess(false);
                }}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="http://api.indimarket.network/api/v1"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                The base URL for the Indimarket API (e.g., http://api.indimarket.network/api/v1)
              </p>
            </div>

            {/* API Key Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                API Key Configuration
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-400">
                The API key is now configured server-side via the <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">MERCHANT_API_KEY</code> environment variable. 
                Please set this in your <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">.env.local</code> file.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save Settings"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            About API Configuration
          </h3>
          <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
            <li>• API key is configured server-side via MERCHANT_API_KEY environment variable</li>
            <li>• API endpoint is saved locally in your browser</li>
            <li>• Make sure your API endpoint URL is correct before saving</li>
            <li>• You can update the endpoint at any time</li>
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

