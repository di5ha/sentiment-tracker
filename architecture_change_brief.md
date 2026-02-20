# Architecture Change Brief
## Sentiment Tracker — Stack Migration Document

**Document Type:** Architecture Change Brief (for AI-to-AI handoff)
**Prepared for:** Gemini — to generate a Claude Code instruction prompt
**Project:** Zero-Code Sentiment Tracker with The Why Layer
**Change Version:** Stack v1 → Stack v2
**Date:** February 2026

---

## Purpose of This Document

Claude Code has already begun building this project under a previous architecture decision. That architecture has now changed. This document describes exactly what the old stack was, what the new stack is, what has already been built that needs to be migrated, and what the expected output of the migration looks like.

Gemini should use this document to generate a detailed, unambiguous prompt for Claude Code that instructs it to migrate all completed work to the new stack and update STATUS.md to reflect current state.

---

## 1. What Changed and Why

The project was originally scoped to use **Streamlit in Snowflake (SiS)** as the frontend — a Python-based UI that runs natively inside Snowflake with no separate deployment. The backend logic (Snowflake queries, Cortex calls) was embedded directly inside the Streamlit app file with no separation between frontend and backend.

This has been replaced with a proper decoupled architecture:

- **Frontend:** Next.js (React) — runs independently, deployed to Vercel
- **Backend:** FastAPI (Python) — runs independently, deployed to Railway or Render
- **Data + AI layer:** Snowflake + Cortex — unchanged, still the source of truth

The reasons for the change: Streamlit is too limited for a production-quality UI, the embedded architecture made the Cortex logic untestable and hard to extend, and moving to React + FastAPI gives a clean separation between presentation, business logic, and data — which is the right structure for a project of this complexity.

---

## 2. The Old Stack (what Claude Code was working with)

| Layer | Old Technology |
|---|---|
| Frontend | Streamlit in Snowflake (SiS) — single app.py file |
| Backend | None — all logic embedded inside app.py |
| Cortex calls | Made directly from Streamlit using get_active_session() |
| Dashboard hosting | Inside Snowflake UI — no external deployment |
| Data layer | Snowflake (unchanged) |
| Automation | Snowflake Tasks (unchanged) |

**Old file that must be replaced:** streamlit/app.py

This file contained everything — UI components, Snowflake session management, data queries, Why Layer Cortex calls, and caching logic — all in one file. It must be broken apart and redistributed into the new architecture.

---

## 3. The New Stack (what Claude Code must migrate to)

| Layer | New Technology | Deployment |
|---|---|---|
| Frontend | Next.js 14 + React | Vercel |
| Charting | Recharts | Bundled with frontend |
| Backend | FastAPI (Python) | Railway or Render |
| Snowflake connection | snowflake-connector-python (in FastAPI) | Via environment variables |
| Cortex calls | Made from FastAPI endpoints, not from frontend | Server-side only |
| Data layer | Snowflake — RAW_MENTIONS, SCORED_MENTIONS, WHY_LAYER_CACHE | Unchanged |
| Automation | Snowflake Tasks | Unchanged |

---

## 4. New Project Structure

Claude Code must reorganize the project files to match this structure. Anything that doesn't fit this structure from the old layout should be migrated into it.

```
sentiment-tracker/
├── frontend/                          # Next.js app
│   ├── app/
│   │   ├── page.tsx                   # Main dashboard page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── MoodMeter.tsx              # Mood gauge component
│   │   ├── SentimentTrendChart.tsx    # Stacked area chart (Recharts)
│   │   ├── ScoreDistribution.tsx      # Histogram (Recharts)
│   │   ├── WhyLayer.tsx               # Why Layer panel with tabs
│   │   └── TweetExplorer.tsx          # Searchable raw tweet table
│   ├── lib/
│   │   └── api.ts                     # All fetch calls to FastAPI backend
│   └── .env.local                     # NEXT_PUBLIC_API_URL
│
├── backend/                           # FastAPI app
│   ├── main.py                        # FastAPI app entry point, all routes
│   ├── snowflake_client.py            # Snowflake connection and query logic
│   ├── cortex.py                      # All CORTEX.SENTIMENT() and CORTEX.COMPLETE() logic
│   ├── cache.py                       # WHY_LAYER_CACHE read/write logic
│   ├── requirements.txt
│   └── .env                           # Snowflake credentials, never committed
│
├── data/
│   └── sentiment140_clean.csv
│
├── snowflake/
│   ├── setup.sql
│   ├── preprocessing.py
│   ├── ingestion.py
│   └── tasks.sql
│
└── STATUS.md                          # Must be updated by Claude Code after migration
```

---

## 5. New Backend — FastAPI Endpoints

Claude Code must build the following endpoints in FastAPI. These replace all the logic that was previously inside the Streamlit app.

### GET /api/summary
Returns the top-level KPI metrics for the dashboard.

**Query parameters:** start_date, end_date, keyword (optional), sentiment_filter (optional, comma-separated)

**Response shape:**
```
{
  total_tweets: int,
  avg_score: float,
  pct_positive: float,
  pct_negative: float,
  pct_neutral: float
}
```

### GET /api/trend
Returns daily sentiment counts for the trend chart.

**Query parameters:** start_date, end_date, keyword (optional), sentiment_filter (optional)

**Response shape:**
```
{
  data: [
    { day: "2009-04-06", POSITIVE: 120, NEGATIVE: 45, NEUTRAL: 30 },
    ...
  ]
}
```

### GET /api/distribution
Returns histogram bucket data for the score distribution chart.

**Query parameters:** start_date, end_date, keyword (optional)

**Response shape:**
```
{
  buckets: [
    { range: "-1.0 to -0.8", count: 340 },
    ...
  ]
}
```

### GET /api/tweets
Returns raw tweet rows for the explorer table.

**Query parameters:** start_date, end_date, keyword (optional), sentiment_filter (optional), limit (default 500)

**Response shape:**
```
{
  tweets: [
    { created_at, user, sentiment_label, sentiment_score, text },
    ...
  ]
}
```

### POST /api/why
The Why Layer endpoint. Checks cache first, calls CORTEX.COMPLETE() on cache miss.

**Request body:**
```
{
  sentiment_type: "NEGATIVE" | "POSITIVE",
  start_date: string,
  end_date: string,
  keyword: string (optional),
  force_refresh: boolean (optional, busts cache if true)
}
```

**Response shape:**
```
{
  bullets: string,           # The raw bullet text from Cortex
  from_cache: boolean,
  generated_at: string
}
```

### GET /api/date-range
Returns the min and max dates available in SCORED_MENTIONS. Used by the frontend to initialize the date picker.

**Response shape:**
```
{
  min_date: string,
  max_date: string
}
```

---

## 6. New Frontend — Component Responsibilities

Claude Code must build the following React components inside the Next.js app. Each component calls the FastAPI backend via the shared api.ts lib file — no component should call Snowflake directly.

**MoodMeter.tsx**
Displays the color-coded overall sentiment panel. Green for positive (avg score > 0.2), amber for neutral, red for negative (avg score < -0.2). Shows the sentiment label and exact average score. Receives data from /api/summary.

**SentimentTrendChart.tsx**
Stacked area chart built with Recharts showing share of positive, neutral, and negative tweets per day. Colors: #2ecc71 (positive), #95a5a6 (neutral), #e74c3c (negative). Data from /api/trend.

**ScoreDistribution.tsx**
Bar chart (Recharts) showing count of tweets per sentiment score bucket across the -1.0 to +1.0 range. Data from /api/distribution.

**WhyLayer.tsx**
Two-tab panel (Negative / Positive). Each tab shows tweet count for that sentiment in the current filter window, an "Explain" button that calls POST /api/why, and a "Regenerate" button that calls the same endpoint with force_refresh: true. Displays the returned bullets in a styled card. Shows a loading spinner while the Cortex call is in progress. Shows "Loaded from cache" when from_cache is true.

**TweetExplorer.tsx**
Paginated, searchable table of raw tweets. Columns: timestamp, username, sentiment label (colored badge), sentiment score, tweet text. Data from /api/tweets.

**Main dashboard page (page.tsx)**
Holds the sidebar filter state (date range, keyword, sentiment bucket multiselect) and passes filter values as props or context to all components. KPI cards at the top reading from /api/summary.

---

## 7. What Stays the Same — Do Not Touch

Claude Code must not modify any of the following. These are outside the scope of this migration:

- snowflake/setup.sql — table definitions are unchanged
- snowflake/preprocessing.py — data preprocessing logic is unchanged
- snowflake/ingestion.py — Snowpark ingestion logic is unchanged
- snowflake/tasks.sql — Snowflake Task definitions are unchanged
- The three Snowflake tables (RAW_MENTIONS, SCORED_MENTIONS, WHY_LAYER_CACHE) — schemas unchanged
- The Cortex function logic itself (SENTIMENT thresholds, COMPLETE prompt template, 150-tweet batch cap, 200-char tweet truncation) — must be preserved exactly, just moved from Streamlit into backend/cortex.py

---

## 8. What Must Be Deleted

- streamlit/ directory and all its contents — this folder and app.py are fully replaced by the new frontend/ and backend/ structure and must be removed

---

## 9. STATUS.md Update Requirements

After completing the migration, Claude Code must update STATUS.md to reflect the following:

**Sections to mark as COMPLETE (if already done before this migration):**
- Snowflake environment setup
- Sentiment140 preprocessing
- RAW_MENTIONS ingestion
- SCORED_MENTIONS scoring pipeline
- WHY_LAYER_CACHE table creation
- Snowflake Tasks setup

**Sections to mark as IN PROGRESS or TODO (reset by this migration):**
- Frontend dashboard — reset to TODO, now targets Next.js not Streamlit
- Backend API — new section, mark as TODO
- Why Layer UI — reset to TODO, now in WhyLayer.tsx not app.py
- Deployment — new section, mark as TODO (Vercel for frontend, Railway/Render for backend)

**New entry to add to STATUS.md:**
```
## Architecture Migration
- Date: [today's date]
- Change: Replaced Streamlit in Snowflake frontend + embedded backend with Next.js (React) frontend and FastAPI (Python) backend
- Reason: Decoupled architecture for better testability, extensibility, and production quality
- Status: COMPLETE
- Files removed: streamlit/app.py
- Files added: frontend/ (full Next.js app), backend/ (FastAPI app)
```

---

## 10. Environment Variables Required After Migration

**frontend/.env.local**
- NEXT_PUBLIC_API_URL — the URL of the deployed FastAPI backend (e.g. https://sentiment-api.railway.app)

**backend/.env**
- SNOWFLAKE_ACCOUNT — Snowflake account identifier
- SNOWFLAKE_USER — Snowflake username
- SNOWFLAKE_PASSWORD — Snowflake password
- SNOWFLAKE_DATABASE — SENTIMENT_TRACKER
- SNOWFLAKE_SCHEMA — MAIN
- SNOWFLAKE_WAREHOUSE — SENTIMENT_WH
- SNOWFLAKE_ROLE — the role with SELECT access on all three tables

These must never be hardcoded. Claude Code should add both .env files to .gitignore if not already present.
