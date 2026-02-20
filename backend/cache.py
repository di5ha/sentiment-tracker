import hashlib
from snowflake_client import execute_query, execute_dml


def compute_cache_key(
    start_date: str,
    end_date: str,
    keyword: str | None,
    sentiment_type: str,
) -> str:
    """Computes MD5 hash cache key from filter parameters.
    Keyword is normalized to lowercase and stripped."""
    normalized_keyword = (keyword or "").lower().strip()
    raw = f"{start_date}||{end_date}||{normalized_keyword}||{sentiment_type}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def read_cache(cache_key: str) -> dict | None:
    """Reads a cache entry if it exists and is within the 24-hour TTL.
    Returns dict with bullet_summary, tweet_sample, generated_at or None."""
    sql = """
        SELECT bullet_summary, tweet_sample, generated_at
        FROM WHY_LAYER_CACHE
        WHERE cache_key = %s
          AND generated_at > DATEADD('hour', -24, CURRENT_TIMESTAMP())
    """
    results = execute_query(sql, (cache_key,))
    return results[0] if results else None


def write_cache(
    cache_key: str,
    sentiment_type: str,
    bullet_summary: str,
    tweet_sample: str,
) -> None:
    """Inserts or replaces a cache entry (DELETE + INSERT)."""
    execute_dml("DELETE FROM WHY_LAYER_CACHE WHERE cache_key = %s", (cache_key,))
    sql = """
        INSERT INTO WHY_LAYER_CACHE
            (cache_key, sentiment_type, bullet_summary, tweet_sample, generated_at)
        VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP())
    """
    execute_dml(sql, (cache_key, sentiment_type, bullet_summary, tweet_sample))


def delete_cache(cache_key: str) -> None:
    """Deletes a specific cache entry. Used for force_refresh."""
    execute_dml("DELETE FROM WHY_LAYER_CACHE WHERE cache_key = %s", (cache_key,))
