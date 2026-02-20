"use client";

import { useEffect } from "react";
import { FilterProvider, useFilter } from "@/lib/FilterContext";
import { useDateRange, useSummary } from "@/lib/hooks";
import Sidebar from "@/components/Sidebar";
import KPICards from "@/components/KPICards";
import MoodMeter from "@/components/MoodMeter";
import SentimentTrendChart from "@/components/SentimentTrendChart";
import ScoreDistribution from "@/components/ScoreDistribution";
import WhyLayer from "@/components/WhyLayer";
import TweetExplorer from "@/components/TweetExplorer";

function DashboardContent() {
  const { dispatch } = useFilter();
  const { data: dateRange, isLoading: dateRangeLoading } = useDateRange();
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useSummary();

  useEffect(() => {
    if (dateRange) {
      dispatch({
        type: "INITIALIZE_DATES",
        minDate: dateRange.min_date,
        maxDate: dateRange.max_date,
      });
    }
  }, [dateRange, dispatch]);

  if (dateRangeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto ml-[280px]">
        <h1 className="text-2xl font-bold text-gray-900">
          Sentiment Tracker Dashboard
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-4">
            <KPICards
              data={summary ?? null}
              isLoading={summaryLoading}
              error={summaryError}
            />
          </div>
          <div className="lg:col-span-1">
            <MoodMeter data={summary ?? null} isLoading={summaryLoading} />
          </div>
        </div>

        <SentimentTrendChart />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScoreDistribution />
          <WhyLayer />
        </div>

        <TweetExplorer />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <FilterProvider>
      <DashboardContent />
    </FilterProvider>
  );
}
