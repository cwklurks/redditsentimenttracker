import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os
import io
import json
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from data_controller import DataController
from models import StockMention
import yfinance as yf

# Constants
HISTORY_DIR = "data/history"
NOTES_PATH = "data/notes.json"

# Load environment variables
load_dotenv()

# Configure page
st.set_page_config(
    page_title="Reddit Stock Sentiment Tracker",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Plotly simple black & white template
PLOTLY_TEMPLATE = "plotly_white"
GRAY = "#666666"
DARK = "#000000"
LIGHT = "#BBBBBB"


def ensure_dirs():
    os.makedirs(HISTORY_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(NOTES_PATH), exist_ok=True)


def load_notes() -> dict:
    ensure_dirs()
    if os.path.exists(NOTES_PATH):
        try:
            with open(NOTES_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_notes(notes: dict) -> None:
    ensure_dirs()
    with open(NOTES_PATH, "w") as f:
        json.dump(notes, f, indent=2)


def write_history(run_date: str, subreddit_key: str, df: pd.DataFrame) -> None:
    ensure_dirs()
    fname = os.path.join(HISTORY_DIR, f"mentions_{subreddit_key}_{run_date}.parquet")
    try:
        df.to_parquet(fname, index=False)
    except Exception:
        # Fallback to CSV if parquet unavailable
        fname = fname.replace(".parquet", ".csv")
        df.to_csv(fname, index=False)


def load_history() -> pd.DataFrame:
    ensure_dirs()
    frames = []
    for fn in sorted(os.listdir(HISTORY_DIR)):
        path = os.path.join(HISTORY_DIR, fn)
        try:
            if fn.endswith(".parquet"):
                frames.append(pd.read_parquet(path))
            elif fn.endswith(".csv"):
                frames.append(pd.read_csv(path))
        except Exception:
            continue
    if frames:
        return pd.concat(frames, ignore_index=True)
    return pd.DataFrame(columns=[
        "run_date", "subreddit", "ticker", "mention_count", "sentiment_score", "sentiment_category"
    ])


def format_sentiment_score(score: float) -> str:
    if score > 0:
        return f"+{score:.3f}"
    else:
        return f"{score:.3f}"


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
            "last_updated": s.last_updated.strftime("%Y-%m-%d %H:%M:%S")
        })
    return pd.DataFrame(rows)


def display_metrics(stock_mentions: list[StockMention]):
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Stocks", len(stock_mentions))
    with col2:
        positive_count = sum(1 for s in stock_mentions if s.sentiment_category == 'Positive')
        st.metric("Positive", positive_count)
    with col3:
        negative_count = sum(1 for s in stock_mentions if s.sentiment_category == 'Negative')
        st.metric("Negative", negative_count)
    with col4:
        neutral_count = sum(1 for s in stock_mentions if s.sentiment_category == 'Neutral')
        st.metric("Neutral", neutral_count)


def display_table(stock_mentions: list[StockMention]):
    if not stock_mentions:
        st.warning("No stock data available.")
        return
    def confidence_label(score: float) -> str:
        a = abs(score)
        if a >= 0.5:
            return "Strong"
        if a >= 0.3:
            return "Moderate"
        if a >= 0.1:
            return "Weak"
        return "Very weak"
    def strict_category(score: float) -> str:
        if score > 0.2:
            return "Positive"
        if score < -0.2:
            return "Negative"
        return "Neutral"
    df = pd.DataFrame([
        {
            'Ticker': s.ticker,
            'Mentions': s.mention_count,
            'Sentiment Score': format_sentiment_score(s.sentiment_score),
            'Sentiment': s.sentiment_category,
            'Sentiment (Strict)': strict_category(s.sentiment_score),
            'Confidence': confidence_label(s.sentiment_score),
            'Last Updated': s.last_updated.strftime('%H:%M:%S')
        } for s in stock_mentions
    ])
    st.subheader("Stock Sentiment")
    st.dataframe(df, use_container_width=True, hide_index=True)


def alerts_panel(stock_mentions: list[StockMention], min_mentions: int, min_sentiment: float):
    triggered = [s for s in stock_mentions if s.mention_count >= min_mentions and s.sentiment_score >= min_sentiment]
    if triggered:
        st.subheader("Alerts")
        for s in triggered:
            st.success(f"{s.ticker}: {s.mention_count} mentions, sentiment {s.sentiment_score:+.3f}")


def export_buttons(current_df: pd.DataFrame):
    if current_df is None or current_df.empty:
        # Show a small hint instead of leaving the section blank
        st.caption("No data to export yet.")
        return
    csv = current_df.to_csv(index=False).encode('utf-8')
    st.download_button(
        "Download CSV",
        data=csv,
        file_name=f"sentiment_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        mime="text/csv",
    )


def notes_ui(tickers: list[str]):
    notes = load_notes()
    st.subheader("Analyst Notes")
    sel = st.selectbox("Select Ticker", options=["(none)"] + tickers)
    if sel and sel != "(none)":
        content = notes.get(sel, "")
        new_content = st.text_area(f"Notes for {sel}", value=content, height=120)
        if st.button("Save Notes"):
            notes[sel] = new_content
            save_notes(notes)
            st.success("Notes saved.")

# Plotly visuals (simple grayscale)

def chart_scatter_current(df_current: pd.DataFrame):
    if df_current.empty:
        return
    fig = px.scatter(
        df_current,
        x="mention_count", y="sentiment_score", text="ticker",
        template=PLOTLY_TEMPLATE,
    )
    fig.update_traces(marker=dict(color=DARK, size=10), textposition="top center")
    fig.update_layout(xaxis_title="Mentions", yaxis_title="Sentiment Score", showlegend=False)
    st.plotly_chart(fig, use_container_width=True)


def chart_treemap_current(df_current: pd.DataFrame):
    if df_current.empty:
        return
    # Grayscale by sentiment score
    colors = df_current["sentiment_score"].apply(lambda v: DARK if v > 0 else (GRAY if abs(v) < 0.1 else LIGHT))
    fig = go.Figure(go.Treemap(
        labels=df_current["ticker"],
        parents=[""] * len(df_current),
        values=df_current["mention_count"],
        marker=dict(colors=colors),
        textinfo="label+value"
    ))
    fig.update_layout(template=PLOTLY_TEMPLATE, margin=dict(t=10,l=0,r=0,b=0))
    st.plotly_chart(fig, use_container_width=True)


def chart_heatmap_history(df_hist: pd.DataFrame):
    if df_hist.empty:
        st.info("No history yet. Heatmap will appear after a few runs.")
        return
    pivot = (df_hist.groupby(["run_date", "ticker"], as_index=False)["mention_count"]
                  .sum()
                  .pivot(index="ticker", columns="run_date", values="mention_count").fillna(0))
    fig = px.imshow(pivot, color_continuous_scale=["#FFFFFF", "#000000"], aspect="auto", template=PLOTLY_TEMPLATE)
    fig.update_layout(coloraxis_showscale=False, xaxis_title="Date", yaxis_title="Ticker")
    st.plotly_chart(fig, use_container_width=True)


def chart_stacked_sentiment_history(df_hist: pd.DataFrame):
    if df_hist.empty:
        return
    daily = (df_hist.groupby(["run_date", "sentiment_category"], as_index=False)
                   .size().rename(columns={"size": "count"}))
    cats = ["Positive", "Neutral", "Negative"]
    fig = go.Figure()
    for cat, color in [("Positive", DARK), ("Neutral", GRAY), ("Negative", LIGHT)]:
        sub = daily[daily["sentiment_category"] == cat]
        fig.add_trace(go.Bar(x=sub["run_date"], y=sub["count"], name=cat, marker_color=color))
    fig.update_layout(barmode="stack", template=PLOTLY_TEMPLATE, xaxis_title="Date", yaxis_title="Posts")
    st.plotly_chart(fig, use_container_width=True)


def chart_price_overlay(ticker: str, df_hist: pd.DataFrame):
    if not ticker:
        return
    # Build average sentiment per date
    s = (df_hist[df_hist["ticker"] == ticker]
         .groupby("run_date", as_index=False)["sentiment_score"].mean())
    if s.empty:
        st.info("No history for this ticker yet.")
        return
    try:
        # Fetch price data (extend window to improve overlap odds)
        price = yf.download(ticker, period="6mo", interval="1d", auto_adjust=True)
        if price is None or price.empty:
            st.info("No price data returned.")
            return

        # Locate a 'close' series robustly
        close_series = None
        if isinstance(price.columns, pd.MultiIndex):
            try:
                if "Close" in price.columns.get_level_values(0):
                    close_df = price.xs("Close", axis=1, level=0)
                    close_series = close_df.iloc[:, 0] if isinstance(close_df, pd.DataFrame) else close_df
            except Exception:
                pass
        else:
            cols_lower = {c.lower(): c for c in price.columns}
            if "close" in cols_lower:
                close_series = price[cols_lower["close"]]
            elif "adj close" in cols_lower:
                close_series = price[cols_lower["adj close"]]
            else:
                num_cols = price.select_dtypes("number")
                if not num_cols.empty:
                    close_series = num_cols.iloc[:, 0]

        if close_series is None or close_series.empty:
            st.info("Could not find a Close/Adj Close series in price data.")
            return

        # Sentiment dates → datetime (midnight) and sort
        s = s.rename(columns={"run_date": "date"})
        s["date"] = pd.to_datetime(s["date"]).dt.normalize()
        s = s.sort_values("date")

        # Price to flat dataframe with 'date' and 'Close'
        price_df = close_series.to_frame(name="Close").reset_index()
        # Normalize date column name
        if "Date" in price_df.columns:
            price_df = price_df.rename(columns={"Date": "date"})
        else:
            price_df.columns = ["date" if i == 0 else price_df.columns[i] for i in range(len(price_df.columns))]
        price_df["date"] = pd.to_datetime(price_df["date"]).dt.normalize()
        price_df = price_df.sort_values("date")

        # As-of merge (backward) within 7 days to handle weekends/holidays
        merged = pd.merge_asof(
            s, price_df[["date", "Close"]], on="date", direction="backward", tolerance=pd.Timedelta(days=7)
        )
        merged = merged.dropna(subset=["Close"])  # keep rows where we found a nearby price
        if merged.empty:
            st.info("No overlapping dates between sentiment and price (even within 7 days tolerance). Run on multiple days to build history.")
            return

        # Plot
        fig = go.Figure()
        fig.add_trace(go.Bar(x=merged["date"], y=merged["sentiment_score"], name="Sentiment", marker_color=GRAY))
        fig.add_trace(go.Scatter(x=merged["date"], y=merged["Close"], name="Price", yaxis="y2", line=dict(color=DARK)))
        fig.update_layout(
            template=PLOTLY_TEMPLATE,
            yaxis2=dict(overlaying="y", side="right", showgrid=False),
            xaxis_title="Date",
            yaxis_title="Avg Sentiment",
        )
        st.plotly_chart(fig, use_container_width=True)
    except Exception as e:
        st.info(f"Price data unavailable: {e}")


def main():
    st.title("📈 Reddit Stock Sentiment Tracker")
    st.markdown("Monitor stock discussions and sentiment from selected subreddits.")

    # Controller (cache across reruns)
    if "controller" not in st.session_state:
        try:
            st.session_state.controller = DataController()
        except Exception as e:
            st.error(f"Failed to initialize: {e}")
            return
    controller: DataController = st.session_state.controller

    # Sidebar controls
    with st.sidebar:
        st.header("Controls")
        # Subreddits (multi-select). DataController currently targets r/wallstreetbets; we'll process in sequence.
        subreddits = st.multiselect("Subreddits", ["wallstreetbets", "stocks", "options"], default=["wallstreetbets"])
        post_limit = st.slider("Reddit Posts per Subreddit", 10, 500, 200, 10)
        top_limit = st.slider("Top Stocks to Show", 5, 50, 20, 1)

        st.subheader("Filters")
        min_mentions = st.number_input("Min Mentions", min_value=0, max_value=1000, value=0, step=1)
        min_sentiment = st.number_input("Min Sentiment (compound)", min_value=-1.0, max_value=1.0, value=-1.0, step=0.1, format="%.1f")

        st.subheader("Alerts")
        alert_min_mentions = st.number_input("Alert: Min Mentions", min_value=1, max_value=1000, value=10, step=1)
        alert_min_sent = st.number_input("Alert: Min Sentiment", min_value=-1.0, max_value=1.0, value=0.3, step=0.1, format="%.1f")

        st.subheader("Export")
        export_ready_placeholder = st.empty()

        st.divider()
        refresh = st.button("Refresh (use cache)")
        force_refresh = st.button("Force Fresh Data")

    # Fetch data per subreddit and combine
    combined_mentions: list[StockMention] = []
    run_date = datetime.now().strftime("%Y-%m-%d")
    all_current_frames = []

    # To avoid multiple identical network calls on Cloud, fetch once then reuse for each subreddit label
    # Network backoff window (skip network after recent failure)
    now_ts = time.time()
    backoff_until = st.session_state.get("network_backoff_until", 0)
    network_skipped = False
    latest_mentions = []
    if now_ts < backoff_until and not force_refresh:
        network_skipped = True
        latest_mentions = controller.get_cached_data() or []
    else:
        try:
            latest_mentions = controller.force_refresh(post_limit, top_limit) if force_refresh else controller.process_reddit_data(post_limit, top_limit)
            # Success clears backoff
            st.session_state["network_backoff_until"] = 0
        except Exception:
            # On error, set a 10-minute backoff and use cache if any
            st.session_state["network_backoff_until"] = now_ts + 600
            latest_mentions = controller.get_cached_data() or []

    for sr in subreddits:
        mentions = [m for m in latest_mentions if m.mention_count >= min_mentions and m.sentiment_score >= min_sentiment]
        combined_mentions.extend(mentions)
        df_current = to_dataframe(mentions, sr, run_date)
        all_current_frames.append(df_current)
        write_history(run_date, sr, df_current)

    # Combine across subreddits by ticker (sum counts, avg sentiment weighted by mentions)
    available_before_limit = 0
    if combined_mentions:
        agg = {}
        for m in combined_mentions:
            if m.ticker not in agg:
                agg[m.ticker] = {
                    "ticker": m.ticker,
                    "mention_count": 0,
                    "sentiment_score_sum": 0.0,
                    "sentiment_weight": 0,
                    "sentiment_category": m.sentiment_category,
                    "last_updated": m.last_updated,
                }
            agg[m.ticker]["mention_count"] += m.mention_count
            agg[m.ticker]["sentiment_score_sum"] += m.sentiment_score * m.mention_count
            agg[m.ticker]["sentiment_weight"] += m.mention_count
            agg[m.ticker]["last_updated"] = max(agg[m.ticker]["last_updated"], m.last_updated)
        # Build merged list
        merged = []
        for v in agg.values():
            avg = v["sentiment_score_sum"] / max(1, v["sentiment_weight"])
            cat = "Positive" if avg > 0.1 else ("Negative" if avg < -0.1 else "Neutral")
            merged.append(StockMention(
                ticker=v["ticker"],
                mention_count=v["mention_count"],
                sentiment_score=avg,
                sentiment_category=cat,
                last_updated=v["last_updated"]
            ))
        # sort and limit
        merged.sort(key=lambda x: (x.mention_count, x.sentiment_score), reverse=True)
        available_before_limit = len(merged)
        combined_mentions = merged[:top_limit]

    # Display network diagnostics (helpful on Streamlit Cloud when blocked)
    with st.expander("Diagnostics", expanded=False):
        status = controller.get_processing_status()
        col_d1, col_d2, col_d3 = st.columns(3)
        with col_d1:
            st.caption(f"Cache valid: {bool(status.get('cache_valid'))}")
            st.caption(f"Cache available: {bool(status.get('cache_available'))}")
            if network_skipped:
                until = time.strftime('%H:%M:%S', time.localtime(st.session_state.get('network_backoff_until', 0)))
                st.caption(f"Network backoff active until ~{until}")
        with col_d2:
            st.caption(f"Last URL: {status.get('last_url')}")
            st.caption(f"Last HTTP status: {status.get('last_http_status')}")
        with col_d3:
            st.caption(f"Last error: {status.get('last_error')}")
            if available_before_limit:
                st.caption(f"Available before limit: {available_before_limit}")
        if status.get("posts_sentiment_summary"):
            st.caption(f"Post sentiment distribution (source): {status['posts_sentiment_summary']} across {status.get('post_count')} posts")

    with st.expander("What does Sentiment Score mean?", expanded=False):
        st.markdown("Sentiment Score uses VADER’s compound metric (range −1.0 to +1.0).")
        st.markdown("\n**Standard categories (used in visuals):**\n- Positive: > +0.1\n- Neutral: between −0.1 and +0.1\n- Negative: < −0.1")
        st.markdown("\n**Sentiment (Strict) shown in the table:**\n- Uses tighter cutoffs of ±0.2 to counter casual language that VADER often interprets as slightly positive.\n- This does not change the underlying scores; it’s an alternate label to make results more conservative.")
        st.markdown("\n**Confidence (based on |score|):**\n- Strong (≥ 0.5)\n- Moderate (0.3–0.5)\n- Weak (0.1–0.3)\n- Very weak (< 0.1)")

    # Display
    display_metrics(combined_mentions)
    if available_before_limit:
        st.caption(f"Showing {len(combined_mentions)} of {min(top_limit, available_before_limit)} (filters applied)")
    display_table(combined_mentions)

    # Alerts
    alerts_panel(combined_mentions, alert_min_mentions, alert_min_sent)

    # Export (render into the sidebar placeholder)
    current_df_export = pd.concat(all_current_frames, ignore_index=True) if all_current_frames else pd.DataFrame()
    with export_ready_placeholder.container():
        export_buttons(current_df_export)

    # Notes
    notes_ui([m.ticker for m in combined_mentions])

    # Visuals (current)
    st.subheader("Visuals (Current Run)")
    df_current_simple = pd.DataFrame([
        {"ticker": m.ticker, "mention_count": m.mention_count, "sentiment_score": m.sentiment_score}
        for m in combined_mentions
    ])
    colA, colB = st.columns(2)
    with colA:
        chart_scatter_current(df_current_simple)
    with colB:
        chart_treemap_current(df_current_simple)

    # Visuals (History)
    st.subheader("Visuals (History)")
    hist = load_history()
    colH1, colH2 = st.columns(2)
    with colH1:
        chart_heatmap_history(hist)
    with colH2:
        chart_stacked_sentiment_history(hist)

    # Price overlay (choose a ticker)
    st.subheader("Price Overlay")
    sel_ticker = st.selectbox("Select Ticker", options=[m.ticker for m in combined_mentions]) if combined_mentions else ""
    if sel_ticker:
        chart_price_overlay(sel_ticker, hist)

    st.markdown("---")
    st.caption("Built with Streamlit • Data from Reddit • Simple grayscale visuals")


if __name__ == "__main__":
    main()