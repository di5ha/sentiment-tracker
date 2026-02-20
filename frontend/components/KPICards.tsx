"use client";

import type { SummaryResponse } from "@/lib/api";

interface KPICardsProps {
  data: SummaryResponse | null;
  isLoading: boolean;
  error: Error | undefined;
}

function Skeleton() {
  return <div className="h-16 bg-gray-200 rounded animate-pulse" />;
}

export default function KPICards({ data, isLoading, error }: KPICardsProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        Failed to load metrics: {error.message}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Tweets",
      value: data ? data.total_tweets.toLocaleString() : "-",
    },
    {
      label: "Avg Score",
      value: data ? data.avg_score.toFixed(3) : "-",
    },
    {
      label: "% Positive",
      value: data ? `${data.pct_positive.toFixed(1)}%` : "-",
      color: "text-green-600",
    },
    {
      label: "% Negative",
      value: data ? `${data.pct_negative.toFixed(1)}%` : "-",
      color: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) =>
        isLoading ? (
          <Skeleton key={card.label} />
        ) : (
          <div
            key={card.label}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {card.label}
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${card.color || "text-gray-900"}`}
            >
              {card.value}
            </p>
          </div>
        )
      )}
    </div>
  );
}
