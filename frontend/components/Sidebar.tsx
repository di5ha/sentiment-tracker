"use client";

import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parseISO, format } from "date-fns";
import { useFilter } from "@/lib/FilterContext";

const SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

export default function Sidebar() {
  const { state, dispatch } = useFilter();
  const [localKeyword, setLocalKeyword] = useState(state.keyword);

  // Debounce keyword dispatch
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "SET_KEYWORD", keyword: localKeyword });
    }, 300);
    return () => clearTimeout(timer);
  }, [localKeyword, dispatch]);

  function handleDateChange(type: "start" | "end", date: Date | null) {
    if (!date || !state.startDate || !state.endDate) return;
    const formatted = format(date, "yyyy-MM-dd");
    dispatch({
      type: "SET_DATE_RANGE",
      startDate: type === "start" ? formatted : state.startDate,
      endDate: type === "end" ? formatted : state.endDate,
    });
  }

  function handleSentimentToggle(label: string) {
    const current = state.sentimentFilter;
    const updated = current.includes(label)
      ? current.filter((s) => s !== label)
      : [...current, label];
    dispatch({ type: "SET_SENTIMENT_FILTER", sentimentFilter: updated });
  }

  function handleReset() {
    if (state.minDate && state.maxDate) {
      dispatch({
        type: "SET_DATE_RANGE",
        startDate: state.minDate,
        endDate: state.maxDate,
      });
    }
    setLocalKeyword("");
    dispatch({ type: "SET_KEYWORD", keyword: "" });
    dispatch({ type: "SET_SENTIMENT_FILTER", sentimentFilter: [] });
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-white border-r border-gray-200 p-5 space-y-6 overflow-y-auto z-10">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Filters</h2>
        <p className="text-xs text-gray-400 mt-1">Sentiment Tracker</p>
      </div>

      {/* Date Range */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Date Range
        </label>
        <div className="space-y-2">
          <div>
            <span className="text-xs text-gray-500">From</span>
            <DatePicker
              selected={state.startDate ? parseISO(state.startDate) : null}
              onChange={(date: Date | null) => handleDateChange("start", date)}
              minDate={state.minDate ? parseISO(state.minDate) : undefined}
              maxDate={state.endDate ? parseISO(state.endDate) : undefined}
              dateFormat="yyyy-MM-dd"
              className="w-full"
            />
          </div>
          <div>
            <span className="text-xs text-gray-500">To</span>
            <DatePicker
              selected={state.endDate ? parseISO(state.endDate) : null}
              onChange={(date: Date | null) => handleDateChange("end", date)}
              minDate={state.startDate ? parseISO(state.startDate) : undefined}
              maxDate={state.maxDate ? parseISO(state.maxDate) : undefined}
              dateFormat="yyyy-MM-dd"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Keyword */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Keyword
        </label>
        <input
          type="text"
          value={localKeyword}
          onChange={(e) => setLocalKeyword(e.target.value)}
          placeholder="Search tweets..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sentiment Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Sentiment
        </label>
        <div className="space-y-1">
          {SENTIMENTS.map((label) => (
            <label
              key={label}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={state.sentimentFilter.includes(label)}
                onChange={() => handleSentimentToggle(label)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  label === "POSITIVE"
                    ? "bg-green-100 text-green-800"
                    : label === "NEGATIVE"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {label}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          {state.sentimentFilter.length === 0
            ? "Showing all sentiments"
            : `Filtering: ${state.sentimentFilter.join(", ")}`}
        </p>
      </div>

      {/* Reset */}
      <button
        onClick={handleReset}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        Reset Filters
      </button>
    </aside>
  );
}
