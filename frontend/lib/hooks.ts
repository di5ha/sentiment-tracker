"use client";

import useSWR from "swr";
import { useFilter } from "./FilterContext";
import {
  fetchSummary,
  fetchTrend,
  fetchDistribution,
  fetchTweets,
  fetchDateRange,
  type FilterParams,
  type SummaryResponse,
  type TrendResponse,
  type DistributionResponse,
  type TweetsResponse,
  type DateRangeResponse,
} from "./api";

function useFilterParams(): FilterParams | null {
  const { state } = useFilter();
  if (!state.dateRangeLoaded || !state.startDate || !state.endDate) {
    return null;
  }
  return {
    start_date: state.startDate,
    end_date: state.endDate,
    keyword: state.keyword || undefined,
    sentiment_filter:
      state.sentimentFilter.length > 0
        ? state.sentimentFilter.join(",")
        : undefined,
  };
}

export function useDateRange() {
  return useSWR<DateRangeResponse>("date-range", fetchDateRange, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
}

export function useSummary() {
  const params = useFilterParams();
  return useSWR<SummaryResponse>(
    params ? ["summary", JSON.stringify(params)] : null,
    () => fetchSummary(params!)
  );
}

export function useTrend() {
  const params = useFilterParams();
  return useSWR<TrendResponse>(
    params ? ["trend", JSON.stringify(params)] : null,
    () => fetchTrend(params!)
  );
}

export function useDistribution() {
  const params = useFilterParams();
  return useSWR<DistributionResponse>(
    params ? ["distribution", JSON.stringify(params)] : null,
    () => fetchDistribution(params!)
  );
}

export function useTweets() {
  const params = useFilterParams();
  return useSWR<TweetsResponse>(
    params ? ["tweets", JSON.stringify(params)] : null,
    () => fetchTweets({ ...params!, limit: 500 })
  );
}
