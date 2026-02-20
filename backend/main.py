import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from snowflake_client import execute_query, close_connection
from cortex import generate_why_analysis
from cache import compute_cache_key, read_cache, write_cache, delete_cache

logger = logging.getLogger("sentiment_api")

app = FastAPI(title="Sentiment Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
def shutdown_event():
    close_connection()


# --- Pydantic Models ---


class WhyRequest(BaseModel):
    sentiment_type: str
    start_date: str
    end_date: str
    keyword: Optional[str] = None
    force_refresh: Optional[bool] = False


class WhyResponse(BaseModel):
    bullets: str
    from_cache: bool
    generated_at: str


class SummaryResponse(BaseModel):
    total_tweets: int
    avg_score: float
    pct_positive: float
    pct_negative: float
    pct_neutral: float


class DateRangeResponse(BaseModel):
    min_date: str
    max_date: str


# --- Shared Filter Helpers ---

VALID_SENTIMENT_LABELS = {"POSITIVE", "NEGATIVE", "NEUTRAL"}


def build_where_clause(
    start_date: str,
    end_date: str,
    keyword: Optional[str] = None,
    sentiment_filter: Optional[str] = None,
) -> tuple[str, list]:
    """Builds a WHERE clause and param list from common filter parameters."""
    conditions = ["created_at >= %s", "created_at < %s"]
    params: list = [start_date, end_date]

    if keyword:
        conditions.append("LOWER(text) LIKE %s")
        params.append(f"%{keyword.lower().strip()}%")

    if sentiment_filter:
        labels = [s.strip().upper() for s in sentiment_filter.split(",")]
        for label in labels:
            if label not in VALID_SENTIMENT_LABELS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid sentiment label: {label}. "
                    f"Must be one of {VALID_SENTIMENT_LABELS}",
                )
        placeholders = ", ".join(["%s"] * len(labels))
        conditions.append(f"sentiment_label IN ({placeholders})")
        params.extend(labels)

    where = "WHERE " + " AND ".join(conditions)
    return where, params


# --- Endpoints ---


@app.get("/api/summary", response_model=SummaryResponse)
def get_summary(
    start_date: str = Query(...),
    end_date: str = Query(...),
    keyword: Optional[str] = Query(None),
    sentiment_filter: Optional[str] = Query(None),
):
    where, params = build_where_clause(start_date, end_date, keyword, sentiment_filter)

    sql = f"""
        SELECT
            COUNT(*) AS total_tweets,
            COALESCE(AVG(sentiment_score), 0) AS avg_score,
            CASE WHEN COUNT(*) > 0
                THEN COUNT_IF(sentiment_label = 'POSITIVE') * 100.0 / COUNT(*)
                ELSE 0 END AS pct_positive,
            CASE WHEN COUNT(*) > 0
                THEN COUNT_IF(sentiment_label = 'NEGATIVE') * 100.0 / COUNT(*)
                ELSE 0 END AS pct_negative,
            CASE WHEN COUNT(*) > 0
                THEN COUNT_IF(sentiment_label = 'NEUTRAL') * 100.0 / COUNT(*)
                ELSE 0 END AS pct_neutral
        FROM SCORED_MENTIONS
        {where}
    """

    results = execute_query(sql, tuple(params))
    row = results[0] if results else {}

    return SummaryResponse(
        total_tweets=int(row.get("total_tweets", 0)),
        avg_score=round(float(row.get("avg_score", 0)), 4),
        pct_positive=round(float(row.get("pct_positive", 0)), 2),
        pct_negative=round(float(row.get("pct_negative", 0)), 2),
        pct_neutral=round(float(row.get("pct_neutral", 0)), 2),
    )


@app.get("/api/trend")
def get_trend(
    start_date: str = Query(...),
    end_date: str = Query(...),
    keyword: Optional[str] = Query(None),
    sentiment_filter: Optional[str] = Query(None),
):
    where, params = build_where_clause(start_date, end_date, keyword, sentiment_filter)

    sql = f"""
        SELECT
            TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day,
            COUNT_IF(sentiment_label = 'POSITIVE') AS positive,
            COUNT_IF(sentiment_label = 'NEGATIVE') AS negative,
            COUNT_IF(sentiment_label = 'NEUTRAL') AS neutral
        FROM SCORED_MENTIONS
        {where}
        GROUP BY DATE(created_at)
        ORDER BY day
    """

    rows = execute_query(sql, tuple(params))

    data = [
        {
            "day": row["day"],
            "POSITIVE": int(row["positive"]),
            "NEGATIVE": int(row["negative"]),
            "NEUTRAL": int(row["neutral"]),
        }
        for row in rows
    ]

    return {"data": data}


@app.get("/api/distribution")
def get_distribution(
    start_date: str = Query(...),
    end_date: str = Query(...),
    keyword: Optional[str] = Query(None),
):
    where, params = build_where_clause(start_date, end_date, keyword)

    sql = f"""
        SELECT
            FLOOR(sentiment_score * 5) / 5 AS bucket_start,
            COUNT(*) AS count
        FROM SCORED_MENTIONS
        {where}
        GROUP BY bucket_start
        ORDER BY bucket_start
    """

    rows = execute_query(sql, tuple(params))

    buckets = []
    for row in rows:
        bs = float(row["bucket_start"])
        be = bs + 0.2
        buckets.append({"range": f"{bs:.1f} to {be:.1f}", "count": int(row["count"])})

    return {"buckets": buckets}


@app.get("/api/tweets")
def get_tweets(
    start_date: str = Query(...),
    end_date: str = Query(...),
    keyword: Optional[str] = Query(None),
    sentiment_filter: Optional[str] = Query(None),
    limit: int = Query(500, ge=1, le=1000),
):
    where, params = build_where_clause(start_date, end_date, keyword, sentiment_filter)

    sql = f"""
        SELECT
            TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
            "USER" AS user,
            sentiment_label,
            sentiment_score,
            text
        FROM SCORED_MENTIONS
        {where}
        ORDER BY created_at DESC
        LIMIT {int(limit)}
    """

    rows = execute_query(sql, tuple(params))

    tweets = [
        {
            "created_at": row["created_at"],
            "user": row["user"],
            "sentiment_label": row["sentiment_label"],
            "sentiment_score": round(float(row["sentiment_score"]), 4),
            "text": row["text"],
        }
        for row in rows
    ]

    return {"tweets": tweets}


@app.post("/api/why", response_model=WhyResponse)
def post_why(request: WhyRequest):
    if request.sentiment_type not in ("NEGATIVE", "POSITIVE"):
        raise HTTPException(
            status_code=400, detail="sentiment_type must be NEGATIVE or POSITIVE"
        )

    cache_key = compute_cache_key(
        request.start_date, request.end_date, request.keyword, request.sentiment_type
    )

    if request.force_refresh:
        delete_cache(cache_key)

    cached = read_cache(cache_key)
    if cached:
        return WhyResponse(
            bullets=cached["bullet_summary"],
            from_cache=True,
            generated_at=str(cached["generated_at"]),
        )

    try:
        bullet_summary, tweet_sample = generate_why_analysis(
            sentiment_type=request.sentiment_type,
            start_date=request.start_date,
            end_date=request.end_date,
            keyword=request.keyword,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Cortex COMPLETE failed: {e}")
        raise HTTPException(
            status_code=502,
            detail="The AI analysis service is temporarily unavailable. Please try again.",
        )

    write_cache(cache_key, request.sentiment_type, bullet_summary, tweet_sample)

    return WhyResponse(
        bullets=bullet_summary,
        from_cache=False,
        generated_at="just now",
    )


@app.get("/api/date-range", response_model=DateRangeResponse)
def get_date_range():
    sql = """
        SELECT
            TO_CHAR(MIN(created_at), 'YYYY-MM-DD') AS min_date,
            TO_CHAR(MAX(created_at), 'YYYY-MM-DD') AS max_date
        FROM SCORED_MENTIONS
    """
    results = execute_query(sql)

    if not results or results[0]["min_date"] is None:
        raise HTTPException(
            status_code=404, detail="No scored mentions found in the database."
        )

    row = results[0]
    return DateRangeResponse(min_date=row["min_date"], max_date=row["max_date"])
