"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDistribution } from "@/lib/hooks";

export default function ScoreDistribution() {
  const { data, isLoading, error } = useDistribution();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        Score Distribution
      </h2>

      {isLoading && (
        <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
      )}

      {error && (
        <div className="h-[300px] flex items-center justify-center text-sm text-red-500">
          Failed to load distribution data
        </div>
      )}

      {data && data.buckets.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.buckets}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 10 }}
              angle={-30}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {data && data.buckets.length === 0 && (
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
          No distribution data for the current filter
        </div>
      )}
    </div>
  );
}
