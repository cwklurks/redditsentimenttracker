# Reddit Stock Sentiment Tracker 📈

A real-time sentiment analysis application that monitors stock discussions on Reddit's r/wallstreetbets and provides sentiment analysis for mentioned stocks through a modern web dashboard.

## Features

- 🔍 **Real-time Reddit Scraping**: Fetches hot posts from r/wallstreetbets using public JSON feeds
- 📊 **Stock Ticker Extraction**: Identifies stock symbols mentioned in posts and comments
- 💡 **Sentiment Analysis**: Uses VADER sentiment analysis to gauge market sentiment
- 📈 **Modern Web Dashboard**: Clean, responsive Next.js interface with interactive charts
- 💾 **Smart Caching**: Reduces API calls with intelligent data caching
- 🔄 **Auto-refresh**: Configurable data refresh intervals
- ⚡ **Error Handling**: Graceful degradation with fallback to cached data
- 🚀 **No Setup Required**: Works immediately without any API credentials!

## Quick Start

### Prerequisites

- Python 3.8 or higher (for backend API)
- Node.js 18+ (for frontend)
- **No Reddit API credentials needed!** ✨

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd reddit-sentiment
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the backend API**
   ```bash
   python app.py
   ```

### Frontend Setup

1. **Navigate to the frontend directory**
   ```bash
   cd reddit-sentiment-next
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   
   Navigate to `http://localhost:3000` to view the dashboard.

**That's it!** No configuration files, no API keys, no setup - just run and go! 🎉

## How It Works (No API Required!)

This application uses Reddit's **public JSON feeds** instead of the official API:

- ✅ **Hot posts**: `https://www.reddit.com/r/wallstreetbets/hot.json`
- ✅ **New posts**: `https://www.reddit.com/r/wallstreetbets/new.json`
- ✅ **Comments**: `https://www.reddit.com/comments/{post_id}.json`

These are **completely legal** public endpoints that don't require authentication and provide real-time data!

## Configuration Options

### Application Settings

The dashboard includes several configurable options:

- **Reddit Posts to Analyze**: Number of posts to fetch (10-100)
- **Top Stocks to Show**: Number of top mentioned stocks to display (5-20)
- **Refresh Data**: Manual refresh of cached data
- **Auto-refresh**: Configurable automatic refresh intervals

### Feed Types

The app automatically mixes different feeds for optimal sentiment analysis:
- **70% Hot posts**: Popular posts with high engagement and comments
- **30% New posts**: Fresh posts with the latest market sentiment

## Architecture

### Components

**Backend (Python)**
- **`app.py`**: Flask API server
- **`data_controller.py`**: Orchestrates data processing pipeline
- **`reddit_scraper.py`**: Reddit JSON feed integration
- **`stock_extractor.py`**: Stock ticker extraction and validation
- **`sentiment_analyzer.py`**: VADER sentiment analysis
- **`models.py`**: Data models and structures

**Frontend (Next.js)**
- **`src/app/`**: Next.js app router pages and API routes
- **`src/components/`**: React components for dashboard, charts, and UI
- **`src/lib/services/`**: TypeScript services for data fetching
- **`src/types/`**: TypeScript type definitions

### Data Flow

1. **Reddit JSON Scraping**: Backend fetches posts from public JSON endpoints
2. **Ticker Extraction**: Identify stock symbols in posts and comments
3. **Sentiment Analysis**: Calculate sentiment scores for each stock
4. **API Response**: Backend serves processed data via REST API
5. **Frontend Display**: Next.js dashboard presents data with interactive charts

## Rate Limiting

The application includes built-in rate limiting to be respectful to Reddit:
- **1 second delay** between requests
- **Automatic retry** on failures
- **Smart caching** to minimize requests

No API rate limits to worry about! 🎉

## Troubleshooting

### Common Issues

#### No Data Displayed
- **Causes**: Network issues, Reddit server problems, no stock mentions
- **Solution**: 
  - Check internet connection
  - Try refreshing the page
  - Wait a moment and refresh (Reddit may be temporarily busy)

#### Slow Loading
- **Causes**: Network latency, Reddit server load
- **Solution**: 
  - Use cached data when available
  - Reduce number of posts to analyze in settings

#### Connection Errors
- **Error**: "Failed to fetch data from Reddit"
- **Solution**: 
  - Check internet connection
  - Reddit's servers may be temporarily unavailable
  - Try again in a few minutes

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to fetch data" | Network or Reddit server issue | Check connection, try again |
| "No stock data found" | No mentions in recent posts | Try different time or wait for new posts |
| "Cache expired" | Old cached data | Refresh the page or wait for auto-refresh |

### Debug Mode

For debugging, you can run with additional logging:

```bash
# Backend debugging
export FLASK_ENV=development
python app.py

# Frontend debugging
cd reddit-sentiment-next
npm run dev
```

## Testing

Run the test suite to verify functionality:

```bash
# Run all tests
python -m pytest

# Run specific test file
python -m pytest test_reddit_scraper.py -v

# Run with coverage
python -m pytest --cov=. --cov-report=html
```

## Known Limitations

1. **Rate Limiting**: Self-imposed 1-second delays between requests (to be respectful)
2. **Subreddit Scope**: Currently only monitors r/wallstreetbets
3. **Stock Validation**: Limited to predefined list of valid tickers
4. **Sentiment Accuracy**: VADER is rule-based, may miss context/sarcasm
5. **Historical Data**: No long-term data storage or historical analysis

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is provided as-is for educational and research purposes. Please respect Reddit's servers by not making excessive requests.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review existing GitHub issues
3. Create a new issue with detailed error information

---

**Disclaimer**: This application is for educational purposes only. Stock sentiment analysis should not be used as the sole basis for investment decisions. Always conduct your own research and consult with financial professionals before making investment decisions. 
