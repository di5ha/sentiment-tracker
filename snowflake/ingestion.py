"""
Snowflake Ingestion Script
Uploads sentiment140_clean.csv to an internal stage and loads it into RAW_MENTIONS.

Usage:
    python ingestion.py
"""

import os
import snowflake.connector
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
CLEAN_CSV = os.path.join(PROJECT_ROOT, "data", "sentiment140_clean.csv")

# Load credentials from backend/.env
load_dotenv(os.path.join(PROJECT_ROOT, "backend", ".env"))


def get_connection() -> snowflake.connector.SnowflakeConnection:
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        database=os.environ.get("SNOWFLAKE_DATABASE", "SENTIMENT_TRACKER"),
        schema=os.environ.get("SNOWFLAKE_SCHEMA", "MAIN"),
        warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "SENTIMENT_WH"),
        role=os.environ.get("SNOWFLAKE_ROLE"),
    )


def main():
    print(f"Clean CSV: {CLEAN_CSV}")
    if not os.path.exists(CLEAN_CSV):
        print("ERROR: Clean CSV not found. Run preprocessing.py first.")
        return

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Ensure warehouse is active
        print("Resuming warehouse...")
        cursor.execute("ALTER WAREHOUSE SENTIMENT_WH RESUME IF SUSPENDED")

        # Create stage if not exists
        print("Creating stage RAW_STAGE (if not exists)...")
        cursor.execute("""
            CREATE STAGE IF NOT EXISTS RAW_STAGE
                FILE_FORMAT = (
                    TYPE = 'CSV'
                    FIELD_OPTIONALLY_ENCLOSED_BY = '"'
                    SKIP_HEADER = 1
                    NULL_IF = ('', 'NULL')
                    EMPTY_FIELD_AS_NULL = TRUE
                )
        """)

        # Upload clean CSV to stage
        print("Uploading CSV to @RAW_STAGE...")
        put_sql = f"PUT 'file://{CLEAN_CSV}' @RAW_STAGE AUTO_COMPRESS=TRUE OVERWRITE=TRUE"
        cursor.execute(put_sql)
        put_result = cursor.fetchall()
        for row in put_result:
            print(f"  PUT result: {row}")

        # Truncate RAW_MENTIONS to avoid duplicates on re-runs
        print("Truncating RAW_MENTIONS...")
        cursor.execute("TRUNCATE TABLE IF EXISTS RAW_MENTIONS")

        # COPY INTO RAW_MENTIONS
        print("Loading data into RAW_MENTIONS...")
        cursor.execute("""
            COPY INTO RAW_MENTIONS (tweet_id, user, created_at, text, source_label)
            FROM @RAW_STAGE/sentiment140_clean.csv.gz
            FILE_FORMAT = (
                TYPE = 'CSV'
                FIELD_OPTIONALLY_ENCLOSED_BY = '"'
                SKIP_HEADER = 1
                NULL_IF = ('', 'NULL')
                EMPTY_FIELD_AS_NULL = TRUE
            )
            ON_ERROR = 'CONTINUE'
        """)
        copy_result = cursor.fetchall()
        for row in copy_result:
            print(f"  COPY result: {row}")

        # Verify row count
        cursor.execute("SELECT COUNT(*) FROM RAW_MENTIONS")
        count = cursor.fetchone()[0]
        print(f"\nRAW_MENTIONS row count: {count:,}")

    finally:
        cursor.close()
        conn.close()
        print("Connection closed.")


if __name__ == "__main__":
    main()
