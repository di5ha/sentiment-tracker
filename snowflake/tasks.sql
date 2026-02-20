-- =============================================================
-- Snowflake Automation Tasks
-- Phase 5 — Scheduled scoring and cache expiry
-- =============================================================

USE DATABASE SENTIMENT_TRACKER;
USE SCHEMA MAIN;
USE WAREHOUSE SENTIMENT_WH;

-- Task 1: SCORE_NEW_MENTIONS
-- Runs hourly. Incrementally scores any new rows in RAW_MENTIONS
-- that don't yet have a matching tweet_id in SCORED_MENTIONS.
CREATE OR REPLACE TASK SCORE_NEW_MENTIONS
    WAREHOUSE = SENTIMENT_WH
    SCHEDULE  = 'USING CRON 0 * * * * UTC'
AS
    INSERT INTO SCORED_MENTIONS (tweet_id, user, created_at, text, source_label, loaded_at, sentiment_score, sentiment_label)
    SELECT
        r.tweet_id,
        r."USER",
        r.created_at,
        r.text,
        r.source_label,
        r.loaded_at,
        SNOWFLAKE.CORTEX.SENTIMENT(r.text) AS sentiment_score,
        CASE
            WHEN SNOWFLAKE.CORTEX.SENTIMENT(r.text) >= 0.2 THEN 'POSITIVE'
            WHEN SNOWFLAKE.CORTEX.SENTIMENT(r.text) <= -0.2 THEN 'NEGATIVE'
            ELSE 'NEUTRAL'
        END AS sentiment_label
    FROM RAW_MENTIONS r
    WHERE r.tweet_id NOT IN (SELECT tweet_id FROM SCORED_MENTIONS);

-- Task 2: EXPIRE_WHY_CACHE
-- Runs daily at midnight UTC, chained after SCORE_NEW_MENTIONS.
-- Deletes WHY_LAYER_CACHE entries older than 24 hours.
CREATE OR REPLACE TASK EXPIRE_WHY_CACHE
    WAREHOUSE = SENTIMENT_WH
    AFTER SCORE_NEW_MENTIONS
AS
    DELETE FROM WHY_LAYER_CACHE
    WHERE generated_at < DATEADD('hour', -24, CURRENT_TIMESTAMP());

-- Both tasks are created in SUSPENDED state by default.
-- To activate, run:
--   ALTER TASK EXPIRE_WHY_CACHE RESUME;
--   ALTER TASK SCORE_NEW_MENTIONS RESUME;
-- Note: Child task (EXPIRE_WHY_CACHE) must be resumed BEFORE the root task.
