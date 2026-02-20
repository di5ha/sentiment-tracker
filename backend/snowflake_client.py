import os
import snowflake.connector
from dotenv import load_dotenv

load_dotenv()

_connection = None


def get_connection() -> snowflake.connector.SnowflakeConnection:
    """Returns a module-level singleton Snowflake connection.
    Lazily initializes on first call. Reconnects if closed."""
    global _connection
    if _connection is None or _connection.is_closed():
        _connection = snowflake.connector.connect(
            account=os.environ["SNOWFLAKE_ACCOUNT"],
            user=os.environ["SNOWFLAKE_USER"],
            password=os.environ["SNOWFLAKE_PASSWORD"],
            database=os.environ.get("SNOWFLAKE_DATABASE", "SENTIMENT_TRACKER"),
            schema=os.environ.get("SNOWFLAKE_SCHEMA", "MAIN"),
            warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "SENTIMENT_WH"),
            role=os.environ.get("SNOWFLAKE_ROLE"),
        )
    return _connection


def execute_query(sql: str, params: tuple = None) -> list[dict]:
    """Executes a parameterized query and returns results as a list of dicts."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        if cursor.description is None:
            return []
        columns = [col[0].lower() for col in cursor.description]
        rows = cursor.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()


def execute_scalar(sql: str, params: tuple = None):
    """Executes a query and returns the first column of the first row."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return row[0] if row else None
    finally:
        cursor.close()


def execute_dml(sql: str, params: tuple = None) -> int:
    """Executes an INSERT/UPDATE/DELETE and returns the rowcount."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        return cursor.rowcount
    finally:
        cursor.close()


def close_connection():
    """Cleanly close the Snowflake connection on app shutdown."""
    global _connection
    if _connection and not _connection.is_closed():
        _connection.close()
        _connection = None
