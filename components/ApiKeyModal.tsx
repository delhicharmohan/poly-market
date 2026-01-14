"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { X, Key, Eye, EyeOff } from "lucide-react";

interface ApiKeyModalProps {
  onClose: () => void;
  onSave: () => void;
}

export default function ApiKeyModal({ onClose, onSave }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load existing API key and endpoint if available
    const existingKey = api.getApiKey();
    const existingEndpoint = api.getApiEndpoint();
    if (existingKey) {
      setApiKey(existingKey);
    }
    if (existingEndpoint) {
      setApiEndpoint(existingEndpoint);
    } else {
      // Set default endpoint
      setApiEndpoint("http://localhost:3001/v1");
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError("API key cannot be empty");
      return;
    }

    // Basic validation - prevent obviously wrong values
    if (apiKey.trim().toLowerCase().includes("npm") || apiKey.trim().toLowerCase().includes("run")) {
      setError("Please enter a valid API key, not a command");
      return;
    }

    // Validate endpoint URL format
    if (apiEndpoint.trim()) {
      try {
        new URL(apiEndpoint.trim());
      } catch {
        setError("Please enter a valid API endpoint URL");
        return;
      }
    }

    try {
      api.setApiKey(apiKey.trim());
      if (apiEndpoint.trim()) {
        api.setApiEndpoint(apiEndpoint.trim());
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              API Key Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Enter your Indimarket API key and endpoint URL. Your credentials are stored locally
            in your browser and are never shared.
          </p>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="apiEndpoint"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
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
                }}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="http://api.indimarket.network/api/v1"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                The base URL for the Indimarket API (e.g., http://api.indimarket.network/api/v1)
              </p>
            </div>

            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter your API key"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

