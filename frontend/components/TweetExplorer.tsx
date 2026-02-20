"use client";

import { useState, useMemo } from "react";
import { useTweets } from "@/lib/hooks";

function SentimentBadge({ label }: { label: string }) {
  const cls =
    label === "POSITIVE"
      ? "bg-green-100 text-green-800"
      : label === "NEGATIVE"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-600";
  return (
    <span className={`${cls} text-xs font-medium px-2 py-0.5 rounded-full`}>
      {label}
    </span>
  );
}

export default function TweetExplorer() {
  const { data, isLoading, error } = useTweets();
  const [localSearch, setLocalSearch] = useState("");

  const filteredTweets = useMemo(() => {
    if (!data?.tweets) return [];
    if (!localSearch) return data.tweets;
    const search = localSearch.toLowerCase();
    return data.tweets.filter(
      (tweet) =>
        tweet.text.toLowerCase().includes(search) ||
        tweet.user.toLowerCase().includes(search)
    );
  }, [data, localSearch]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Tweet Explorer</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Showing {filteredTweets.length}
            {data?.tweets ? ` of ${data.tweets.length}` : ""} tweets
          </span>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search within tweets..."
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
      </div>

      {isLoading && (
        <div className="h-[400px] bg-gray-100 rounded animate-pulse" />
      )}

      {error && (
        <div className="h-[400px] flex items-center justify-center text-sm text-red-500">
          Failed to load tweets
        </div>
      )}

      {!isLoading && !error && (
        <div className="max-h-[500px] overflow-y-auto tweet-table-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                  Sentiment
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                  Text
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTweets.map((tweet, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {tweet.created_at}
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    @{tweet.user}
                  </td>
                  <td className="px-3 py-2">
                    <SentimentBadge label={tweet.sentiment_label} />
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {tweet.sentiment_score.toFixed(3)}
                  </td>
                  <td
                    className="px-3 py-2 text-gray-700 max-w-md truncate"
                    title={tweet.text}
                  >
                    {tweet.text}
                  </td>
                </tr>
              ))}
              {filteredTweets.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-gray-400"
                  >
                    No tweets match your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
