"use client";

import type { SummaryResponse } from "@/lib/api";

interface MoodMeterProps {
  data: SummaryResponse | null;
  isLoading: boolean;
}

function getMoodConfig(avgScore: number) {
  if (avgScore > 0.2)
    return {
      bg: "bg-green-50",
      border: "border-green-500",
      text: "text-green-700",
      label: "POSITIVE",
    };
  if (avgScore < -0.2)
    return {
      bg: "bg-red-50",
      border: "border-red-500",
      text: "text-red-700",
      label: "NEGATIVE",
    };
  return {
    bg: "bg-amber-50",
    border: "border-amber-500",
    text: "text-amber-700",
    label: "NEUTRAL",
  };
}

export default function MoodMeter({ data, isLoading }: MoodMeterProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full animate-pulse">
        <div className="h-full bg-gray-200 rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex items-center justify-center text-sm text-gray-400">
        No data
      </div>
    );
  }

  const mood = getMoodConfig(data.avg_score);

  return (
    <div
      className={`${mood.bg} rounded-lg shadow-sm border-l-4 ${mood.border} border border-gray-200 p-4 h-full flex flex-col justify-center items-center`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
        Mood Meter
      </p>
      <p className={`text-xl font-bold ${mood.text}`}>{mood.label}</p>
      <p className="text-sm text-gray-600 mt-1">
        {data.avg_score.toFixed(3)}
      </p>
    </div>
  );
}
