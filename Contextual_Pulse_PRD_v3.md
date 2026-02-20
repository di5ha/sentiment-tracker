# Product Requirements Document
## Zero-Code Sentiment Tracker — Decoupled Architecture
### With "The Why Layer" — Automated Root Cause Analysis

**Version:** 3.0 (Post-Migration)
**Status:** Active Development
**Dataset:** Sentiment140 (Kaggle)

---

## 1. Overview

### Problem Statement
Most sentiment dashboards stop at *what* — "sentiment is negative this week." What brand managers actually need is the *why* — "70% of negative tweets mention the new app update lag." 

### Solution
A fully decoupled, cloud-native pipeline that:
1. Ingests and normalizes Sentiment140 tweet data via Snowpark Python.
2. Scores every tweet using `SNOWFLAKE.CORTEX.SENTIMENT()`.
3. Surfaces root-cause bullets automatically using `CORTEX.COMPLETE()` — pairing every "Negative" or "Positive" reading with an AI-written explanation.

---

## 2. Decoupled Architecture (The New Stack)

| Layer | Technology | Purpose | Deployment |
|---|---|---|---|
| **Frontend** | Next.js 14 (React) | UI, charting (Recharts), and state management. | Vercel |
| **Backend** | FastAPI (Python) | API endpoints, Snowflake client, Cortex AI logic. | Railway / Render |
| **Data Platform**| Snowflake | Core storage, SQL compute, and Cortex ML functions. | AWS US East (N. Virginia) |
| **Dataset** | Sentiment140 | 1.6M labeled tweets (using a 50k sample for v1). | Snowflake Internal Stage |

---

## 3. Data Model

### Table 1: RAW_MENTIONS
Holds the preprocessed Sentiment140 data.
*Columns:* `tweet_id`, `user`, `created_at`, `text`, `source_label`, `loaded_at`

### Table 2: SCORED_MENTIONS 
The primary analytical table.
*Columns:* All from `RAW_MENTIONS` + `sentiment_score` (Float -1.0 to 1.0) + `sentiment_label` (POSITIVE, NEUTRAL, NEGATIVE).

### Table 3: WHY_LAYER_CACHE
Stores generated Why Layer results to prevent redundant LLM API costs.
*Columns:* `cache_key` (MD5 hash), `sentiment_type`, `bullet_summary`, `tweet_sample`, `generated_at`. (24-hour TTL).

---

## 4. API Endpoints (FastAPI)

- `GET /api/summary`: Returns top-level KPIs (total tweets, avg score, % positive/negative/neutral).
- `GET /api/trend`: Returns daily sentiment counts for the stacked area chart.
- `GET /api/distribution`: Returns histogram bucket data (-1.0 to +1.0).
- `GET /api/tweets`: Returns raw, searchable tweet rows.
- `POST /api/why`: Checks `WHY_LAYER_CACHE`. On miss, batches up to 150 tweets (max 200 chars each) to `CORTEX.COMPLETE()` using `mistral-7b` to generate root-cause bullets.
- `GET /api/date-range`: Returns min/max dates for frontend date pickers.

---

## 5. Frontend Components (Next.js)

- **MoodMeter.tsx:** High-level gauge of average sentiment.
- **SentimentTrendChart.tsx:** Stacked area chart showing share of voice over time.
- **ScoreDistribution.tsx:** Bar chart showing the spread of sentiment scores.
- **WhyLayer.tsx:** The core AI UI. Two tabs (Positive/Negative) displaying the bulleted summary.
- **TweetExplorer.tsx:** Paginated, searchable raw data table.

---

## 6. Current Implementation Phase (Data Pipeline)

Now that the architecture is migrated and the Snowflake connection is verified, the immediate next steps are:
1. **Preprocessing (`snowflake/preprocessing.py`):** Clean the `latin-1` CSV, parse custom timestamps, and sample 50,000 rows.
2. **Ingestion (`snowflake/ingestion.py`):** Push the clean CSV to a Snowflake Stage and `COPY INTO RAW_MENTIONS`.
3. **Scoring Pipeline:** Execute incremental Cortex SENTIMENT scoring to populate `SCORED_MENTIONS`.
4. **Automation (`snowflake/tasks.sql`):** Schedule hourly scoring and daily cache expiration tasks.
