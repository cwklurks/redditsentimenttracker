import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from data_controller import DataController
from models import StockMention

# Load environment variables
load_dotenv()

# Configure page
st.set_page_config(
    page_title="Reddit Stock Sentiment Tracker",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

def check_environment_variables():
    """Check if all required environment variables are set (none needed for JSON feeds!)."""
    # No environment variables required for Reddit JSON feeds!
    return []

def get_sentiment_color(sentiment_category: str) -> str:
    """Get color for sentiment category based on simple black and white design."""
    color_map = {
        'Positive': '#000000',  # Black for positive
        'Negative': '#666666',  # Dark gray for negative  
        'Neutral': '#CCCCCC'    # Light gray for neutral
    }
    return color_map.get(sentiment_category, '#CCCCCC')

def format_sentiment_score(score: float) -> str:
    """Format sentiment score with appropriate sign and precision."""
    if score > 0:
        return f"+{score:.3f}"
    else:
        return f"{score:.3f}"

def display_stock_data(stock_mentions: list[StockMention]):
    """Display stock data in a formatted table with better visibility."""
    if not stock_mentions:
        st.warning("📭 No stock data available to display.")
        return
    
    # Create DataFrame for display
    data = []
    for stock in stock_mentions:
        data.append({
            'Ticker': stock.ticker,
            'Mentions': stock.mention_count,
            'Sentiment Score': format_sentiment_score(stock.sentiment_score),
            'Sentiment': stock.sentiment_category,
            'Last Updated': stock.last_updated.strftime('%H:%M:%S')
        })
    
    df = pd.DataFrame(data)
    
    # Display metrics
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("📊 Total Stocks", len(stock_mentions))
    with col2:
        positive_count = sum(1 for s in stock_mentions if s.sentiment_category == 'Positive')
        st.metric("😊 Positive", positive_count)
    with col3:
        negative_count = sum(1 for s in stock_mentions if s.sentiment_category == 'Negative')
        st.metric("😞 Negative", negative_count)
    with col4:
        neutral_count = sum(1 for s in stock_mentions if s.sentiment_category == 'Neutral')
        st.metric("😐 Neutral", neutral_count)
    
    st.subheader("📈 Stock Sentiment Analysis")
    
    # Create custom CSS for better visibility
    st.markdown("""
    <style>
    .stDataFrame {
        background-color: white;
    }
    .stDataFrame table {
        background-color: white !important;
        color: black !important;
    }
    .stDataFrame th {
        background-color: #f0f0f0 !important;
        color: black !important;
        font-weight: bold !important;
    }
    .stDataFrame td {
        background-color: white !important;
        color: black !important;
    }
    /* Sentiment-specific styling */
    .positive-sentiment {
        background-color: #e8f5e8 !important;
        color: #2d5a2d !important;
        font-weight: bold !important;
    }
    .negative-sentiment {
        background-color: #f5e8e8 !important;
        color: #5a2d2d !important;
        font-weight: bold !important;
    }
    .neutral-sentiment {
        background-color: #f5f5f5 !important;
        color: #333333 !important;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Style the dataframe with proper background colors for sentiment
    def style_sentiment_row(row):
        sentiment = row['Sentiment']
        if sentiment == 'Positive':
            return ['background-color: #e8f5e8; color: #2d5a2d; font-weight: bold'] * len(row)
        elif sentiment == 'Negative':
            return ['background-color: #f5e8e8; color: #5a2d2d; font-weight: bold'] * len(row)
        else:  # Neutral
            return ['background-color: #f5f5f5; color: #333333'] * len(row)
    
    # Apply styling and display
    styled_df = df.style.apply(style_sentiment_row, axis=1)
    st.dataframe(styled_df, use_container_width=True, hide_index=True)

def display_processing_status(controller: DataController):
    """Display status information about data processing."""
    status = controller.get_processing_status()
    
    col1, col2 = st.columns(2)
    
    with col1:
        if status['reddit_scraper_ready']:
            st.success("✅ Reddit JSON Feed Ready")
        else:
            st.error("❌ Reddit Connection Failed")
    
    with col2:
        if status['cache_valid']:
            st.info(f"💾 Using cached data (expires: {status['cache_expires'][:19]})")
        elif status['cache_available']:
            st.warning("⚠️ Cache expired, refresh recommended")
        else:
            st.info("🆕 No cached data available")

def create_sentiment_charts(stock_mentions: list[StockMention]):
    """Create interactive charts for sentiment analysis."""
    if not stock_mentions:
        return
    
    # Prepare data for charts
    df = pd.DataFrame([
        {
            'Ticker': stock.ticker,
            'Mentions': stock.mention_count,
            'Sentiment Score': stock.sentiment_score,
            'Sentiment': stock.sentiment_category,
            'Abs Sentiment': abs(stock.sentiment_score)
        }
        for stock in stock_mentions
    ])
    
    # Create subplot layout
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=(
            'Mention Count vs Sentiment Score',
            'Sentiment Distribution',
            'Top 10 Most Mentioned Stocks',
            'Sentiment Intensity Ranking'
        ),
        specs=[[{"secondary_y": False}, {"type": "pie"}],
               [{"type": "bar"}, {"type": "bar"}]]
    )
    
    # 1. Scatter plot: Mentions vs Sentiment
    colors = ['red' if cat == 'Negative' else 'green' if cat == 'Positive' else 'gray' 
              for cat in df['Sentiment']]
    
    fig.add_trace(
        go.Scatter(
            x=df['Mentions'],
            y=df['Sentiment Score'],
            mode='markers+text',
            text=df['Ticker'],
            textposition='top center',
            marker=dict(size=10, color=colors, opacity=0.7),
            name='Stocks',
            hovertemplate='<b>%{text}</b><br>Mentions: %{x}<br>Sentiment: %{y:.3f}<extra></extra>'
        ),
        row=1, col=1
    )
    
    # 2. Pie chart: Sentiment distribution
    sentiment_counts = df['Sentiment'].value_counts()
    fig.add_trace(
        go.Pie(
            labels=sentiment_counts.index,
            values=sentiment_counts.values,
            hole=0.3,
            name="Sentiment Distribution"
        ),
        row=1, col=2
    )
    
    # 3. Bar chart: Top mentioned stocks
    top_10 = df.nlargest(10, 'Mentions')
    bar_colors = ['red' if cat == 'Negative' else 'green' if cat == 'Positive' else 'gray' 
                  for cat in top_10['Sentiment']]
    
    fig.add_trace(
        go.Bar(
            x=top_10['Ticker'],
            y=top_10['Mentions'],
            marker_color=bar_colors,
            name='Mentions',
            hovertemplate='<b>%{x}</b><br>Mentions: %{y}<br>Sentiment: %{customdata}<extra></extra>',
            customdata=top_10['Sentiment']
        ),
        row=2, col=1
    )
    
    # 4. Sentiment intensity ranking
    top_sentiment = df.nlargest(10, 'Abs Sentiment')
    sentiment_colors = ['red' if score < 0 else 'green' for score in top_sentiment['Sentiment Score']]
    
    fig.add_trace(
        go.Bar(
            x=top_sentiment['Ticker'],
            y=top_sentiment['Sentiment Score'],
            marker_color=sentiment_colors,
            name='Sentiment Intensity',
            hovertemplate='<b>%{x}</b><br>Sentiment Score: %{y:.3f}<extra></extra>'
        ),
        row=2, col=2
    )
    
    # Update layout
    fig.update_layout(
        height=800,
        showlegend=False,
        title_text="📊 Stock Sentiment Analysis Dashboard",
        title_x=0.5
    )
    
    # Update axes
    fig.update_xaxes(title_text="Number of Mentions", row=1, col=1)
    fig.update_yaxes(title_text="Sentiment Score", row=1, col=1)
    fig.update_xaxes(title_text="Stock Ticker", row=2, col=1)
    fig.update_yaxes(title_text="Mentions", row=2, col=1)
    fig.update_xaxes(title_text="Stock Ticker", row=2, col=2)
    fig.update_yaxes(title_text="Sentiment Score", row=2, col=2)
    
    st.plotly_chart(fig, use_container_width=True)

def analyze_market_insights(stock_mentions: list[StockMention]):
    """Generate actionable market insights from sentiment data."""
    if not stock_mentions:
        return
    
    st.subheader("🧠 AI Market Insights")
    
    # Calculate key metrics
    total_mentions = sum(stock.mention_count for stock in stock_mentions)
    avg_sentiment = sum(stock.sentiment_score * stock.mention_count for stock in stock_mentions) / total_mentions if total_mentions > 0 else 0
    
    positive_stocks = [s for s in stock_mentions if s.sentiment_category == 'Positive']
    negative_stocks = [s for s in stock_mentions if s.sentiment_category == 'Negative']
    neutral_stocks = [s for s in stock_mentions if s.sentiment_category == 'Neutral']
    
    # Most mentioned with strong sentiment
    strong_positive = [s for s in positive_stocks if s.sentiment_score > 0.5]
    strong_negative = [s for s in negative_stocks if s.sentiment_score < -0.5]
    
    # High-volume discussions
    high_volume = [s for s in stock_mentions if s.mention_count >= 5]
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 🎯 **Key Signals**")
        
        # Market sentiment overview
        if avg_sentiment > 0.1:
            st.success(f"📈 **Bullish Market Mood** (Average: +{avg_sentiment:.3f})")
        elif avg_sentiment < -0.1:
            st.error(f"📉 **Bearish Market Mood** (Average: {avg_sentiment:.3f})")
        else:
            st.info(f"⚖️ **Neutral Market Mood** (Average: {avg_sentiment:.3f})")
        
        # Strong positive momentum
        if strong_positive:
            st.markdown("**🚀 Strong Bullish Signals:**")
            for stock in sorted(strong_positive, key=lambda x: x.sentiment_score, reverse=True)[:3]:
                st.markdown(f"• **{stock.ticker}**: {stock.mention_count} mentions, sentiment: +{stock.sentiment_score:.3f}")
        
        # Strong negative sentiment
        if strong_negative:
            st.markdown("**⚠️ Strong Bearish Signals:**")
            for stock in sorted(strong_negative, key=lambda x: x.sentiment_score)[:3]:
                st.markdown(f"• **{stock.ticker}**: {stock.mention_count} mentions, sentiment: {stock.sentiment_score:.3f}")
    
    with col2:
        st.markdown("### 📊 **Trading Insights**")
        
        # High-volume discussions
        if high_volume:
            st.markdown("**🔥 Most Discussed (High Volume):**")
            for stock in sorted(high_volume, key=lambda x: x.mention_count, reverse=True)[:5]:
                sentiment_emoji = "📈" if stock.sentiment_category == "Positive" else "📉" if stock.sentiment_category == "Negative" else "➡️"
                st.markdown(f"• **{stock.ticker}** {sentiment_emoji}: {stock.mention_count} mentions")
        
        # Sentiment distribution
        st.markdown("**📈 Sentiment Breakdown:**")
        st.markdown(f"• Positive: {len(positive_stocks)} stocks ({len(positive_stocks)/len(stock_mentions)*100:.1f}%)")
        st.markdown(f"• Negative: {len(negative_stocks)} stocks ({len(negative_stocks)/len(stock_mentions)*100:.1f}%)")
        st.markdown(f"• Neutral: {len(neutral_stocks)} stocks ({len(neutral_stocks)/len(stock_mentions)*100:.1f}%)")
    
    # Action recommendations
    st.markdown("### 💡 **Actionable Recommendations**")
    
    recommendations = []
    
    # Strong momentum plays
    if strong_positive:
        top_positive = max(strong_positive, key=lambda x: x.sentiment_score * x.mention_count)
        recommendations.append(f"🎯 **Momentum Play**: {top_positive.ticker} shows strong positive sentiment ({top_positive.sentiment_score:+.3f}) with {top_positive.mention_count} mentions")
    
    # Contrarian opportunities
    if strong_negative and any(s.mention_count >= 3 for s in strong_negative):
        top_negative = max([s for s in strong_negative if s.mention_count >= 3], key=lambda x: abs(x.sentiment_score))
        recommendations.append(f"🔄 **Contrarian Opportunity**: {top_negative.ticker} heavily discussed ({top_negative.mention_count} mentions) with strong negative sentiment ({top_negative.sentiment_score:.3f}) - potential oversold bounce")
    
    # Volume without direction
    neutral_high_vol = [s for s in neutral_stocks if s.mention_count >= 5]
    if neutral_high_vol:
        top_neutral = max(neutral_high_vol, key=lambda x: x.mention_count)
        recommendations.append(f"👀 **Watch for Breakout**: {top_neutral.ticker} has high discussion volume ({top_neutral.mention_count} mentions) but neutral sentiment - awaiting catalyst")
    
    # Risk warnings
    if len(negative_stocks) > len(positive_stocks) * 1.5:
        recommendations.append("⚠️ **Risk Warning**: Bearish sentiment dominates - consider defensive positioning")
    
    for i, rec in enumerate(recommendations, 1):
        st.markdown(f"{i}. {rec}")
    
    if not recommendations:
        st.info("📊 Market sentiment appears balanced. Monitor for emerging trends.")

def create_sentiment_timeline(stock_mentions: list[StockMention]):
    """Create a timeline view of when stocks were last updated."""
    if not stock_mentions:
        return
        
    st.subheader("⏰ Sentiment Timeline")
    
    # Group by update time
    timeline_data = []
    for stock in stock_mentions:
        timeline_data.append({
            'Stock': stock.ticker,
            'Time': stock.last_updated.strftime('%H:%M:%S'),
            'Sentiment': stock.sentiment_score,
            'Category': stock.sentiment_category,
            'Mentions': stock.mention_count
        })
    
    df = pd.DataFrame(timeline_data)
    
    # Create timeline chart
    fig = px.scatter(df, 
                     x='Time', 
                     y='Sentiment',
                     size='Mentions',
                     color='Category',
                     hover_data=['Stock', 'Mentions'],
                     color_discrete_map={'Positive': 'green', 'Negative': 'red', 'Neutral': 'gray'},
                     title="Sentiment Evolution Over Time")
    
    fig.update_layout(height=400)
    st.plotly_chart(fig, use_container_width=True)

def main():
    """Main Streamlit application"""
    
    # Title and description
    st.title("📈 Reddit Stock Sentiment Tracker")
    st.markdown("Monitor stock discussions and sentiment from r/wallstreetbets")
    
    # Show success message - no setup required!
    st.success("✅ Ready to go! No API credentials required - using Reddit JSON feeds")
    
    # Initialize data controller
    try:
        controller = DataController()
    except Exception as e:
        st.error(f"❌ Failed to initialize application: {str(e)}")
        return
    
    # Sidebar controls
    with st.sidebar:
        st.header("⚙️ Controls")
        
        # Settings
        st.subheader("📊 Settings")
        post_limit = st.slider("Reddit Posts to Analyze", 10, 500, 200, 10)
        stock_limit = st.slider("Top Stocks to Show", 5, 50, 20, 1)
        
        # Store settings in session state to detect changes
        if 'prev_post_limit' not in st.session_state:
            st.session_state.prev_post_limit = post_limit
        if 'prev_stock_limit' not in st.session_state:
            st.session_state.prev_stock_limit = stock_limit
        
        # Check if settings changed
        settings_changed = (
            st.session_state.prev_post_limit != post_limit or 
            st.session_state.prev_stock_limit != stock_limit
        )
        
        if settings_changed:
            st.session_state.prev_post_limit = post_limit
            st.session_state.prev_stock_limit = stock_limit
            # Clear cache when settings change
            try:
                controller.force_refresh(post_limit, stock_limit)
                st.success("⚡ Settings updated! Fetching new data...")
                st.rerun()
            except:
                pass  # Handle gracefully if controller not initialized yet
        
        # Refresh button - now clears cache for fresh data
        if st.button("🔄 Refresh Data", type="primary", use_container_width=True):
            with st.spinner("Fetching fresh data..."):
                try:
                    controller.force_refresh(post_limit, stock_limit)
                    st.success("✅ Data refreshed successfully!")
                    time.sleep(1)
                    st.rerun()
                except Exception as e:
                    st.error(f"❌ Failed to refresh data: {str(e)}")
        
        # Force refresh option
        if st.button("🚀 Force Fresh Data", use_container_width=True):
            with st.spinner("Fetching fresh data from Reddit..."):
                try:
                    controller.force_refresh(post_limit, stock_limit)
                    st.success("✅ Data refreshed successfully!")
                    time.sleep(1)
                    st.rerun()
                except Exception as e:
                    st.error(f"❌ Failed to refresh data: {str(e)}")
        
        # Display processing status
        st.subheader("🔍 Status")
        display_processing_status(controller)
    
    # Main content area
    try:
        # Show loading spinner
        with st.spinner("Loading stock sentiment data..."):
            stock_data = controller.process_reddit_data(post_limit, stock_limit)
        
        if stock_data:
            display_stock_data(stock_data)
            
            # Show last update time
            if stock_data:
                last_update = max(stock.last_updated for stock in stock_data)
                st.caption(f"🕐 Last updated: {last_update.strftime('%Y-%m-%d %H:%M:%S')}")

            # Create and display charts
            create_sentiment_charts(stock_data)
            analyze_market_insights(stock_data)
            create_sentiment_timeline(stock_data)
            
        else:
            st.warning("📭 No stock data found. This could be due to:")
            st.info("""
            - Reddit rate limiting (please wait a moment)
            - No stock mentions in recent posts
            - Network connectivity issues
            - Reddit server temporarily unavailable
            
            Try refreshing the data or check your internet connection.
            """)
            
            # Try to show cached data as fallback
            cached_data = controller.get_cached_data()
            if cached_data:
                st.subheader("📦 Showing Cached Data")
                display_stock_data(cached_data)
    
    except Exception as e:
        st.error(f"❌ An error occurred while processing data: {str(e)}")
        
        # Try to show cached data as fallback
        try:
            cached_data = controller.get_cached_data()
            if cached_data:
                st.subheader("📦 Showing Cached Data")
                display_stock_data(cached_data)
            else:
                st.info("No cached data available for fallback.")
        except Exception as cache_error:
            st.error(f"❌ Also failed to load cached data: {str(cache_error)}")
    
    # Footer
    st.markdown("---")
    st.markdown("""
    <div style='text-align: center; color: #666666;'>
        Built with Streamlit • Data from Reddit r/wallstreetbets • Sentiment analysis by VADER
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()