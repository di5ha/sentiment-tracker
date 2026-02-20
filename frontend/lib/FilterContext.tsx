"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";

export interface FilterState {
  startDate: string | null;
  endDate: string | null;
  keyword: string;
  sentimentFilter: string[];
  dateRangeLoaded: boolean;
  minDate: string | null;
  maxDate: string | null;
}

export type FilterAction =
  | { type: "INITIALIZE_DATES"; minDate: string; maxDate: string }
  | { type: "SET_DATE_RANGE"; startDate: string; endDate: string }
  | { type: "SET_KEYWORD"; keyword: string }
  | { type: "SET_SENTIMENT_FILTER"; sentimentFilter: string[] };

const initialState: FilterState = {
  startDate: null,
  endDate: null,
  keyword: "",
  sentimentFilter: [],
  dateRangeLoaded: false,
  minDate: null,
  maxDate: null,
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "INITIALIZE_DATES":
      return {
        ...state,
        startDate: action.minDate,
        endDate: action.maxDate,
        minDate: action.minDate,
        maxDate: action.maxDate,
        dateRangeLoaded: true,
      };
    case "SET_DATE_RANGE":
      return { ...state, startDate: action.startDate, endDate: action.endDate };
    case "SET_KEYWORD":
      return { ...state, keyword: action.keyword };
    case "SET_SENTIMENT_FILTER":
      return { ...state, sentimentFilter: action.sentimentFilter };
    default:
      return state;
  }
}

const FilterContext = createContext<{
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
} | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(filterReducer, initialState);
  return (
    <FilterContext.Provider value={{ state, dispatch }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) throw new Error("useFilter must be used within FilterProvider");
  return context;
}
