# Reddit Stock Sentiment Tracker (Streamlit)

A minimal, on‑demand Streamlit dashboard that analyzes Reddit chatter for stock tickers and sentiment—no API keys required.

Use the app: https://redditsentiment.streamlit.app/

## Features

- Public Reddit JSON feeds (no OAuth): fetches r/wallstreetbets hot posts with pagination and a 1s polite delay
- Ticker extraction with whitelist and aggressive false‑positive filtering (e.g., DD, YOLO, HODL, CEO, USD)
- VADER sentiment (compound): Positive > 0.1, Negative < −0.1, else Neutral
- Simple grayscale visuals:
  - Current run: Scatter (Mentions vs Sentiment), Treemap (size by mentions)
  - History: Mention Heatmap (Ticker × Date), Stacked Sentiment per day
  - Price Overlay: bars = avg daily sentiment, line = adjusted close via yfinance (7‑day as‑of merge)
- Caching: file‑based JSON cache (`data_cache.json`) with 30‑minute TTL; “Refresh” uses cache, “Force Fresh Data” bypasses it
- Filters and alerts: Min Mentions/Min Sentiment filters; alerts fire only when both alert thresholds are met
- CSV export and local analyst notes (`data/notes.json`)
- History snapshots written to `data/history/` per subreddit/day (Parquet with CSV fallback)

## Quick Start

Prereqs: Python 3.9+ recommended. No Reddit API credentials needed.

```bash
git clone <repository-url>
cd reddit-sentiment
pip install -r requirements.txt
streamlit run app.py
```

Optionally accumulate multi‑day history:

```bash
python3 collector.py --subreddits wallstreetbets,stocks --post-limit 200 --top-limit 30 --force
python3 collector.py --subreddits wallstreetbets,stocks --post-limit 200 --top-limit 30 --interval-mins 60 --force
```

## Using the App

Sidebar controls:
- Subreddits: defaults to `wallstreetbets` (others selectable)
- Reddit Posts per Subreddit: 10–500 (default 200)
- Top Stocks to Show: 5–50 (default 20)
- Filters: Min Mentions, Min Sentiment (affect the table/visuals)
- Alerts: Alert Min Mentions AND Alert Min Sentiment (both must be met)
- Export: Download CSV of the current combined snapshot
- Buttons: Refresh (uses cache), Force Fresh Data (bypasses cache)

Main view:
- Metrics and a grayscale table of top tickers
- Visuals (Current Run): Scatter and Treemap
- Visuals (History): Heatmap and Stacked Sentiment (appear after snapshots exist)
- Price Overlay: select a ticker to see sentiment vs price

CSV export schema:
- `run_date`, `subreddit`, `ticker`, `mention_count`, `sentiment_score`, `sentiment_category`, `last_updated`

Notes:
- Analyst notes are stored in `data/notes.json`.

## How It Works

- Ingestion: `reddit_scraper.py` reads `.../r/<subreddit>/hot.json` with pagination and a 1‑second delay.
- Processing: `stock_extractor.py` matches uppercase tokens and `$TICKER`, validates against a curated whitelist, filters false positives, and counts each ticker once per post across title/selftext/comments.
- Sentiment: `sentiment_analyzer.py` computes VADER compound and categorizes with ±0.1 thresholds. The app computes mentions‑weighted averages when combining across subreddits.
- Caching: `data_controller.py` stores results in `data_cache.json` with a 30‑minute TTL.
- History: `app.py` writes per‑subreddit/day snapshots to `data/history/mentions_<subreddit>_<YYYY‑MM‑DD>.parquet` (CSV fallback). `collector.py` can run on a loop.
- Price Overlay: `yfinance` daily prices joined to daily sentiment via 7‑day backward as‑of merge to handle weekends/holidays.

Tip: If Price Overlay shows “no overlap”, collect snapshots over multiple days.

## Troubleshooting

- No history visuals: create snapshots (use the app or run `collector.py`) over multiple days.
- Price overlay “no overlap”: build more history; overlay uses a 7‑day tolerance merge.
- Slow runs: use Refresh (cached), or reduce the Posts slider. Force Fresh makes new network calls.
- CSV empty: ensure there are mentions after applying Filters.

## Known Limitations

- Default ingestion uses the hot feed; UI does not auto‑refresh (manual Refresh/Force Fresh).
- Comments are not fetched by default in the main pipeline.
- Subreddit handling: default source is `wallstreetbets`. The UI lets you label snapshots per subreddit; extend the controller to fetch each subreddit explicitly if desired.
- Whitelist is a curated subset, not a full market symbol list.
- No sarcasm/topic modeling; VADER can miss nuance.

## Testing

```bash
python3 -m pytest -q
# or
python3 -m pytest --cov=. --cov-report=term-missing
```

## Tech

- Python: `streamlit`, `requests`, `pandas`, `plotly`, `vaderSentiment`, `yfinance`, `pyarrow`, `python-dotenv`

Respect Reddit’s servers: keep delays, avoid excessive requests.
