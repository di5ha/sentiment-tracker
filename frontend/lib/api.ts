// --- Response Types ---

export interface SummaryResponse {
  total_tweets: number;
  avg_score: number;
  pct_positive: number;
  pct_negative: number;
  pct_neutral: number;
}

export interface TrendDataPoint {
  day: string;
  POSITIVE: number;
  NEGATIVE: number;
  NEUTRAL: number;
}

export interface TrendResponse {
  data: TrendDataPoint[];
}

export interface DistributionBucket {
  range: string;
  count: number;
}

export interface DistributionResponse {
  buckets: DistributionBucket[];
}

export interface Tweet {
  created_at: string;
  user: string;
  sentiment_label: string;
  sentiment_score: number;
  text: string;
}

export interface TweetsResponse {
  tweets: Tweet[];
}

export interface WhyRequest {
  sentiment_type: "NEGATIVE" | "POSITIVE";
  start_date: string;
  end_date: string;
  keyword?: string;
  force_refresh?: boolean;
}

export interface WhyResponse {
  bullets: string;
  from_cache: boolean;
  generated_at: string;
}

export interface DateRangeResponse {
  min_date: string;
  max_date: string;
}

export interface FilterParams {
  start_date: string;
  end_date: string;
  keyword?: string;
  sentiment_filter?: string;
}

// --- Helpers ---

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function buildUrl(
  path: string,
  params?: Record<string, string | undefined>
): string {
  const url = new URL(path, API_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json();
}

// --- GET endpoints ---

export async function fetchDateRange(): Promise<DateRangeResponse> {
  return fetchJson<DateRangeResponse>(buildUrl("/api/date-range"));
}

export async function fetchSummary(
  params: FilterParams
): Promise<SummaryResponse> {
  return fetchJson<SummaryResponse>(buildUrl("/api/summary", { ...params }));
}

export async function fetchTrend(
  params: FilterParams
): Promise<TrendResponse> {
  return fetchJson<TrendResponse>(buildUrl("/api/trend", { ...params }));
}

export async function fetchDistribution(
  params: FilterParams
): Promise<DistributionResponse> {
  return fetchJson<DistributionResponse>(
    buildUrl("/api/distribution", {
      start_date: params.start_date,
      end_date: params.end_date,
      keyword: params.keyword,
    })
  );
}

export async function fetchTweets(
  params: FilterParams & { limit?: number }
): Promise<TweetsResponse> {
  return fetchJson<TweetsResponse>(
    buildUrl("/api/tweets", {
      start_date: params.start_date,
      end_date: params.end_date,
      keyword: params.keyword,
      sentiment_filter: params.sentiment_filter,
      limit: params.limit?.toString(),
    })
  );
}

// --- POST endpoint ---

export async function fetchWhy(body: WhyRequest): Promise<WhyResponse> {
  return fetchJson<WhyResponse>(buildUrl("/api/why"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
