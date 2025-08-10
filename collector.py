#!/usr/bin/env python3
import argparse
import os
import sys
import time
from datetime import datetime
import pandas as pd

from data_controller import DataController
from models import StockMention

HISTORY_DIR = "data/history"


def ensure_dirs() -> None:
    os.makedirs(HISTORY_DIR, exist_ok=True)


def to_dataframe(stock_mentions: list[StockMention], subreddit: str, run_date: str) -> pd.DataFrame:
    rows = []
    for s in stock_mentions:
        rows.append({
            "run_date": run_date,
            "subreddit": subreddit,
            "ticker": s.ticker,
            "mention_count": s.mention_count,
            "sentiment_score": s.sentiment_score,
            "sentiment_category": s.sentiment_category,
            "last_updated": s.last_updated.strftime("%Y-%m-%d %H:%M:%S"),
        })
    return pd.DataFrame(rows)


def write_history(run_date: str, subreddit: str, df: pd.DataFrame) -> str:
    ensure_dirs()
    # Use a deterministic filename per date+subreddit; overwrite with latest snapshot for that day
    base = os.path.join(HISTORY_DIR, f"mentions_{subreddit}_{run_date}")
    path_parquet = base + ".parquet"
    path_csv = base + ".csv"
    try:
        df.to_parquet(path_parquet, index=False)
        # If a CSV from earlier exists, remove to avoid confusion
        if os.path.exists(path_csv):
            os.remove(path_csv)
        return path_parquet
    except Exception:
        df.to_csv(path_csv, index=False)
        return path_csv


def snapshot_once(subreddits: list[str], post_limit: int, top_limit: int, force: bool) -> None:
    controller = DataController()
    run_date = datetime.now().strftime("%Y-%m-%d")

    for sr in subreddits:
        if force:
            mentions = controller.force_refresh(post_limit, top_limit)
        else:
            mentions = controller.process_reddit_data(post_limit, top_limit)
        df = to_dataframe(mentions, sr, run_date)
        out_path = write_history(run_date, sr, df)
        print(f"[{datetime.now().isoformat()}] Wrote {len(df)} rows for r/{sr} -> {out_path}")


def main():
    parser = argparse.ArgumentParser(description="Reddit sentiment snapshot collector")
    parser.add_argument("--subreddits", type=str, default="wallstreetbets", help="Comma-separated list")
    parser.add_argument("--post-limit", type=int, default=200)
    parser.add_argument("--top-limit", type=int, default=20)
    parser.add_argument("--interval-mins", type=int, default=0, help="0 = run once and exit; otherwise loop with this interval")
    parser.add_argument("--force", action="store_true", help="Force fresh data (ignore cache)")
    args = parser.parse_args()

    subs = [s.strip() for s in args.subreddits.split(",") if s.strip()]

    if args.interval_mins <= 0:
        snapshot_once(subs, args.post_limit, args.top_limit, args.force)
        return

    print(f"Starting collector loop every {args.interval_mins} minutes for: {subs}")
    try:
        while True:
            snapshot_once(subs, args.post_limit, args.top_limit, args.force)
            time.sleep(max(60, args.interval_mins * 60))
    except KeyboardInterrupt:
        print("Collector stopped.")


if __name__ == "__main__":
    main()