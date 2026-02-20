"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTrend } from "@/lib/hooks";

export default function SentimentTrendChart() {
  const { data, isLoading, error } = useTrend();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        Sentiment Trend
      </h2>

      {isLoading && (
        <div className="h-[350px] bg-gray-100 rounded animate-pulse" />
      )}

      {error && (
        <div className="h-[350px] flex items-center justify-center text-sm text-red-500">
          Failed to load trend data
        </div>
      )}

      {data && data.data.length > 0 && (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="POSITIVE"
              stackId="1"
              stroke="#2ecc71"
              fill="#2ecc71"
              fillOpacity={0.8}
            />
            <Area
              type="monotone"
              dataKey="NEUTRAL"
              stackId="1"
              stroke="#95a5a6"
              fill="#95a5a6"
              fillOpacity={0.8}
            />
            <Area
              type="monotone"
              dataKey="NEGATIVE"
              stackId="1"
              stroke="#e74c3c"
              fill="#e74c3c"
              fillOpacity={0.8}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {data && data.data.length === 0 && (
        <div className="h-[350px] flex items-center justify-center text-sm text-gray-400">
          No trend data for the current filter
        </div>
      )}
    </div>
  );
}
