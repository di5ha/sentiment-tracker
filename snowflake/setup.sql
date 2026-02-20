-- =============================================================
-- The Contextual Pulse — Snowflake Environment Setup
-- Phase 1 / Milestone M1
-- Target: AWS us-east-1 Snowflake Trial Account
-- =============================================================

-- 1. Database & Schema
CREATE DATABASE IF NOT EXISTS SENTIMENT_TRACKER;
CREATE SCHEMA IF NOT EXISTS SENTIMENT_TRACKER.MAIN;

USE DATABASE SENTIMENT_TRACKER;
USE SCHEMA MAIN;

-- 2. Warehouse — SMALL for scoring headroom, auto-suspend 120s
CREATE WAREHOUSE IF NOT EXISTS SENTIMENT_WH
    WAREHOUSE_SIZE = 'SMALL'
    AUTO_SUSPEND   = 120
    AUTO_RESUME    = TRUE
    INITIALLY_SUSPENDED = TRUE;

USE WAREHOUSE SENTIMENT_WH;

-- 3. Internal Stage for CSV upload
CREATE STAGE IF NOT EXISTS RAW_STAGE
    FILE_FORMAT = (
        TYPE            = 'CSV'
        FIELD_OPTIONALLY_ENCLOSED_BY = '"'
        SKIP_HEADER     = 1
        NULL_IF         = ('', 'NULL')
        EMPTY_FIELD_AS_NULL = TRUE
    );

-- 4. Table 1 — RAW_MENTIONS (staging)
CREATE TABLE IF NOT EXISTS RAW_MENTIONS (
    tweet_id      VARCHAR,
    user          VARCHAR,
    created_at    TIMESTAMP_NTZ,
    text          VARCHAR,
    source_label  VARCHAR,
    loaded_at     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- 5. Table 2 — SCORED_MENTIONS (analytical / dashboard primary)
CREATE TABLE IF NOT EXISTS SCORED_MENTIONS (
    tweet_id         VARCHAR,
    user             VARCHAR,
    created_at       TIMESTAMP_NTZ,
    text             VARCHAR,
    source_label     VARCHAR,
    loaded_at        TIMESTAMP_NTZ,
    sentiment_score  FLOAT,
    sentiment_label  VARCHAR
);

-- 6. Table 3 — WHY_LAYER_CACHE (LLM response cache)
--    cache_key = MD5 hash of (date_start || date_end || keyword || sentiment_type)
--    24-hour TTL enforced by EXPIRE_WHY_CACHE task
CREATE TABLE IF NOT EXISTS WHY_LAYER_CACHE (
    cache_key       VARCHAR    PRIMARY KEY,
    sentiment_type  VARCHAR,
    bullet_summary  VARCHAR,
    tweet_sample    VARCHAR,
    generated_at    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- =============================================================
-- 7. Cortex Verification — run these manually after setup
--    If either fails, your region does not support Cortex.
--    Recreate the account in AWS us-east-1.
-- =============================================================

-- Test SENTIMENT (expect a float near +1.0)
SELECT SNOWFLAKE.CORTEX.SENTIMENT('Snowflake is an amazing cloud data platform') AS test_sentiment;

-- Test COMPLETE (expect a short text response)
SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-7b', 'Say hello in one sentence.') AS test_complete;
