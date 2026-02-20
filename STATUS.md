# Sentiment Tracker — Project Status

## Completed

- **Backend API** — FastAPI app built (`backend/`) with 6 endpoints, Snowflake client, Cortex logic, and cache module
- **Frontend dashboard** — Next.js 14 app built (`frontend/`) with all components, SWR data hooks, and filter context
- **Snowflake Connection** — Account created (AWS US East N. Virginia), `setup.sql` executed (DB, schema, warehouse, 3 tables), Cortex verified, `backend/.env` populated with credentials, FastAPI-to-Snowflake bridge tested via `/api/date-range`
- **Data Pipeline** — All four sub-tasks complete:
  - **Sentiment140 preprocessing** — `snowflake/preprocessing.py` built and executed. 50,000-row sample cleaned from raw CSV (latin-1 encoding, date parsing, RT filtering). Output: `data/sentiment140_clean.csv`
  - **RAW_MENTIONS ingestion** — `snowflake/ingestion.py` built and executed. CSV uploaded to `@RAW_STAGE`, 50,000 rows loaded into `RAW_MENTIONS` (zero errors)
  - **SCORED_MENTIONS scoring pipeline** — Incremental `CORTEX.SENTIMENT()` scoring executed. 50,000 rows scored and inserted into `SCORED_MENTIONS`. Distribution: 20,714 POSITIVE / 15,991 NEUTRAL / 13,295 NEGATIVE
  - **Snowflake Tasks setup** — `snowflake/tasks.sql` built and deployed. `SCORE_NEW_MENTIONS` (hourly) and `EXPIRE_WHY_CACHE` (daily) created in suspended state

- **Testing** — All E2E and Why Layer tests passed:
  - **Backend E2E** — All 5 GET endpoints (`/api/date-range`, `/api/summary`, `/api/trend`, `/api/distribution`, `/api/tweets`) return populated JSON data from 50k scored rows. Date range: 2009-04-06 to 2009-06-25. Summary: avg score 0.0926, 41.43% positive, 31.98% neutral, 26.59% negative
  - **Why Layer generation (cache miss)** — `POST /api/why` for NEGATIVE sentiment called `CORTEX.COMPLETE('mistral-7b')` and returned 5 structured bullets in ~2.5 seconds. `from_cache: false`
  - **Why Layer cache hit** — Identical repeat request returned same bullets in ~0.19 seconds. `from_cache: true`, `generated_at` timestamp matches
  - **WHY_LAYER_CACHE DB verification** — 1 row in cache table: `cache_key` present, `bullet_summary` (288 chars), `tweet_sample` (12,230 chars with full 150-tweet prompt), `generated_at` timestamp correct
  - **Frontend integration** — Next.js dev server at `localhost:3000` returns HTTP 200, page title "Sentiment Tracker Dashboard", no error pages, script bundles loading correctly

## TODO

### 1. Deployment (Next Priority)

- **Frontend** — Deploy Next.js app to Vercel, set `NEXT_PUBLIC_API_URL` to production backend URL
- **Backend** — Deploy FastAPI app to Railway/Render, set Snowflake credentials as environment variables

### 2. Future Enhancements

- **Scale to full dataset** — Run `preprocessing.py --limit 0` for all 1.6M rows, re-ingest and re-score (budget permitting)
- **Activate Snowflake Tasks** — Resume `EXPIRE_WHY_CACHE` then `SCORE_NEW_MENTIONS` for automated pipeline

---

## Architecture Migration

- **Date:** 2026-02-19
- **Change:** Replaced Streamlit in Snowflake frontend + embedded backend with Next.js (React) frontend and FastAPI (Python) backend
- **Reason:** Decoupled architecture for better testability, extensibility, and production quality
- **Status:** COMPLETE
- **Files removed:** `streamlit/app.py`
- **Files added:** `frontend/` (full Next.js app), `backend/` (FastAPI app)

*Note: "Snowflake environment setup" and "WHY_LAYER_CACHE table creation" were previously moved back to TODO as the files existed but infrastructure was not provisioned. As of 2026-02-19, the Snowflake infrastructure has been fully provisioned and the FastAPI connection verified.*

## Known Issue

- **Python path:** The `snowflake/` project directory shadows the `snowflake` Python package when running from the project root. Scripts in `snowflake/` must be invoked using `/opt/homebrew/opt/python@3.10/bin/python3.10` or from outside the project directory to avoid `ModuleNotFoundError`.
