"""
Sentiment140 Preprocessor
Reads the raw Kaggle CSV (latin-1, no headers) and outputs a clean CSV
ready for Snowflake ingestion.

Usage:
    python preprocessing.py                  # default 50,000 row sample
    python preprocessing.py --limit 200000   # custom sample size
    python preprocessing.py --limit 0        # full dataset (1.6M rows)
"""

import argparse
import os
from datetime import datetime

import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
RAW_CSV = os.path.join(
    PROJECT_ROOT, "data", "training.1600000.processed.noemoticon.csv"
)
CLEAN_CSV = os.path.join(PROJECT_ROOT, "data", "sentiment140_clean.csv")

COLUMN_NAMES = ["polarity", "id", "date", "query", "user", "text"]

POLARITY_MAP = {0: "NEGATIVE", 2: "NEUTRAL", 4: "POSITIVE"}


def parse_timestamp(raw: str) -> str | None:
    """Parses 'Mon Apr 06 22:19:45 PDT 2009' -> '2009-04-06 22:19:45'.
    Strips the timezone abbreviation before parsing."""
    try:
        parts = raw.strip().split()
        # Remove timezone abbreviation (index 4): "Mon Apr 06 22:19:45 PDT 2009"
        # becomes "Mon Apr 06 22:19:45 2009"
        if len(parts) == 6:
            parts.pop(4)
        cleaned = " ".join(parts)
        dt = datetime.strptime(cleaned, "%a %b %d %H:%M:%S %Y")
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, IndexError):
        return None


def main():
    parser = argparse.ArgumentParser(description="Preprocess Sentiment140 CSV")
    parser.add_argument(
        "--limit",
        type=int,
        default=50000,
        help="Number of rows to sample (0 = full dataset)",
    )
    args = parser.parse_args()

    print(f"Reading raw CSV from: {RAW_CSV}")
    df = pd.read_csv(
        RAW_CSV,
        encoding="latin-1",
        header=None,
        names=COLUMN_NAMES,
    )
    print(f"  Raw rows loaded: {len(df):,}")

    # Sample if limit is set
    if args.limit > 0 and args.limit < len(df):
        df = df.sample(n=args.limit, random_state=42)
        print(f"  Sampled down to: {len(df):,} rows")

    # Map polarity to labels
    df["source_label"] = df["polarity"].map(POLARITY_MAP)
    before = len(df)
    df = df.dropna(subset=["source_label"])
    print(f"  Dropped {before - len(df)} rows with unknown polarity")

    # Parse timestamps
    df["created_at"] = df["date"].apply(parse_timestamp)
    before = len(df)
    df = df.dropna(subset=["created_at"])
    print(f"  Dropped {before - len(df)} rows with unparseable dates")

    # Drop short text
    before = len(df)
    df = df[df["text"].astype(str).str.len() >= 5]
    print(f"  Dropped {before - len(df)} rows with text < 5 chars")

    # Drop retweets
    before = len(df)
    df = df[~df["text"].astype(str).str.startswith("RT ")]
    print(f"  Dropped {before - len(df)} retweets")

    # Select and rename final columns
    result = df[["id", "user", "created_at", "text", "source_label"]].copy()
    result.rename(columns={"id": "tweet_id"}, inplace=True)

    # Write clean CSV
    result.to_csv(CLEAN_CSV, index=False)
    print(f"\nClean CSV written to: {CLEAN_CSV}")
    print(f"  Final row count: {len(result):,}")
    print(f"  Label distribution:")
    print(result["source_label"].value_counts().to_string(name=False))


if __name__ == "__main__":
    main()
