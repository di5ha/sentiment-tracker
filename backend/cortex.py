from snowflake_client import execute_query, execute_scalar

# Business rules from the PRD — do not change
SENTIMENT_POSITIVE_THRESHOLD = 0.2
SENTIMENT_NEGATIVE_THRESHOLD = -0.2
CORTEX_MODEL = "mistral-7b"
MAX_TWEET_BATCH = 150
MAX_TWEET_CHARS = 200


def fetch_tweets_for_why(
    sentiment_type: str,
    start_date: str,
    end_date: str,
    keyword: str | None = None,
) -> list[dict]:
    """Fetches up to 150 tweets for the Why Layer prompt.
    Orders by most extreme sentiment first."""
    if sentiment_type not in ("NEGATIVE", "POSITIVE"):
        raise ValueError(f"Invalid sentiment_type: {sentiment_type}")

    order = "ASC" if sentiment_type == "NEGATIVE" else "DESC"

    sql = f"""
        SELECT tweet_id, text, sentiment_score
        FROM SCORED_MENTIONS
        WHERE sentiment_label = %s
          AND created_at >= %s
          AND created_at < %s
    """
    params = [sentiment_type, start_date, end_date]

    if keyword:
        sql += " AND LOWER(text) LIKE %s"
        params.append(f"%{keyword.lower().strip()}%")

    sql += f" ORDER BY sentiment_score {order} LIMIT {MAX_TWEET_BATCH}"

    return execute_query(sql, tuple(params))


def build_prompt(tweets: list[dict], sentiment_type: str) -> str:
    """Constructs the structured prompt for CORTEX.COMPLETE().
    Each tweet truncated to 200 chars. Max 5 root-cause bullets."""
    sentiment_word = "negative" if sentiment_type == "NEGATIVE" else "positive"

    tweet_lines = []
    for i, tweet in enumerate(tweets, 1):
        text = (tweet["text"] or "")[:MAX_TWEET_CHARS]
        tweet_lines.append(f"{i}. {text}")

    tweet_block = "\n".join(tweet_lines)

    return (
        f"You are a brand analyst. Below are {len(tweets)} {sentiment_word} tweets. "
        f"Identify the top root causes of this {sentiment_word} sentiment. "
        f"Return a maximum of 5 bullet points. "
        f"Format each bullet exactly as: • [~XX%] Reason here\n"
        f"No introductory text. No headers. Bullets only.\n\n"
        f"{tweet_block}"
    )


def call_cortex_complete(prompt: str) -> str:
    """Calls SNOWFLAKE.CORTEX.COMPLETE() via SQL with the mistral-7b model."""
    sql = "SELECT SNOWFLAKE.CORTEX.COMPLETE(%s, %s) AS response"
    result = execute_scalar(sql, (CORTEX_MODEL, prompt))

    if result is None:
        raise RuntimeError("CORTEX.COMPLETE returned no result")

    return str(result)


def generate_why_analysis(
    sentiment_type: str,
    start_date: str,
    end_date: str,
    keyword: str | None = None,
) -> tuple[str, str]:
    """Full pipeline: fetch tweets -> build prompt -> call Cortex.
    Returns (bullet_summary, prompt_text)."""
    tweets = fetch_tweets_for_why(sentiment_type, start_date, end_date, keyword)

    if not tweets:
        raise ValueError(
            f"No {sentiment_type} tweets found for the given date range and keyword."
        )

    prompt = build_prompt(tweets, sentiment_type)
    bullet_summary = call_cortex_complete(prompt)

    return bullet_summary, prompt
