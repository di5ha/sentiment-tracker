"use client";

import { useState } from "react";
import { useFilter } from "@/lib/FilterContext";
import { useSummary } from "@/lib/hooks";
import { fetchWhy, type WhyResponse } from "@/lib/api";

type SentimentTab = "NEGATIVE" | "POSITIVE";

export default function WhyLayer() {
  const { state: filters } = useFilter();
  const { data: summary } = useSummary();
  const [activeTab, setActiveTab] = useState<SentimentTab>("NEGATIVE");
  const [results, setResults] = useState<Record<string, WhyResponse | null>>({
    NEGATIVE: null,
    POSITIVE: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExplain(forceRefresh = false) {
    if (!filters.startDate || !filters.endDate) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWhy({
        sentiment_type: activeTab,
        start_date: filters.startDate,
        end_date: filters.endDate,
        keyword: filters.keyword || undefined,
        force_refresh: forceRefresh,
      });
      setResults((prev) => ({ ...prev, [activeTab]: response }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate explanation"
      );
    } finally {
      setLoading(false);
    }
  }

  const currentResult = results[activeTab];

  const tweetCount =
    activeTab === "NEGATIVE"
      ? summary
        ? Math.round((summary.total_tweets * summary.pct_negative) / 100)
        : null
      : summary
        ? Math.round((summary.total_tweets * summary.pct_positive) / 100)
        : null;

  const borderColor =
    activeTab === "NEGATIVE" ? "border-l-red-500" : "border-l-green-500";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        The Why Layer
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["NEGATIVE", "POSITIVE"] as SentimentTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              activeTab === tab
                ? tab === "NEGATIVE"
                  ? "bg-red-50 text-red-700 border-red-300"
                  : "bg-green-50 text-green-700 border-green-300"
                : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
            }`}
          >
            Why {tab === "NEGATIVE" ? "Negative" : "Positive"}?
          </button>
        ))}
      </div>

      {/* Tweet count */}
      {tweetCount !== null && (
        <p className="text-xs text-gray-500 mb-3">
          {tweetCount.toLocaleString()} {activeTab.toLowerCase()} tweets in
          current filter
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleExplain(false)}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Analyzing..." : "Explain"}
        </button>
        <button
          onClick={() => handleExplain(true)}
          disabled={loading || !currentResult}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Regenerate
        </button>
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          Generating root-cause analysis...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 mb-3">
          {error}
        </div>
      )}

      {/* Results */}
      {currentResult && !loading && (
        <div
          className={`border-l-4 ${borderColor} bg-gray-50 rounded-r-md p-4`}
        >
          {currentResult.from_cache && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full mb-2">
              Loaded from cache
            </span>
          )}
          <p className="text-xs text-gray-400 mb-2">
            Generated: {currentResult.generated_at}
          </p>
          <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
            {currentResult.bullets}
          </div>
        </div>
      )}
    </div>
  );
}
