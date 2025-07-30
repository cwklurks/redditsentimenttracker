# Reddit Stock Sentiment Tracker - Next.js

A modern web application that monitors stock discussions and sentiment from r/wallstreetbets, built with Next.js, TypeScript, Tailwind CSS, and ShadCN UI.

## Features

- **Real-time Sentiment Analysis**: Analyzes stock mentions and sentiment from Reddit posts and comments
- **Interactive Dashboard**: Modern, responsive interface with charts and data visualizations
- **Smart Caching**: Optimized data fetching with 30-minute cache to respect Reddit's rate limits
- **No API Keys Required**: Uses Reddit's public JSON feeds - no authentication needed
- **Professional UI**: Built with ShadCN UI components and Tailwind CSS for a polished look
- **Market Insights**: AI-powered recommendations and analysis of market sentiment
- **Configurable Settings**: Adjustable parameters for posts to analyze and stocks to display

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, ShadCN UI components
- **Charts**: Recharts for interactive data visualizations
- **Sentiment Analysis**: Natural language processing with sentiment library
- **Data Source**: Reddit JSON feeds (no API key required)
- **Caching**: File-based caching system for performance

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd reddit-sentiment-next
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── stocks/        # Stock data endpoint
│   │   └── status/        # System status endpoint
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/
│   ├── dashboard/         # Dashboard components
│   │   ├── dashboard.tsx  # Main dashboard
│   │   ├── header.tsx     # App header
│   │   ├── metrics-cards.tsx
│   │   ├── stock-table.tsx
│   │   ├── config-panel.tsx
│   │   └── market-insights.tsx
│   ├── charts/            # Chart components
│   │   └── sentiment-charts.tsx
│   └── ui/                # ShadCN UI components
├── lib/
│   └── services/          # Business logic
│       ├── reddit-scraper.ts
│       ├── stock-extractor.ts
│       ├── sentiment-analyzer.ts
│       └── data-controller.ts
└── types/
    └── index.ts           # TypeScript type definitions
```

## How It Works

1. **Data Collection**: Fetches hot posts from r/wallstreetbets using Reddit's JSON API
2. **Stock Extraction**: Uses regex patterns to identify valid stock tickers in posts and comments
3. **Sentiment Analysis**: Analyzes text sentiment using natural language processing
4. **Data Aggregation**: Combines mention counts with sentiment scores
5. **Caching**: Stores results to minimize API calls and improve performance
6. **Visualization**: Presents data through interactive charts and tables

## Configuration

The application can be configured through the Settings panel in the UI:

- **Reddit Posts to Analyze**: 10-500 posts (default: 200)
- **Top Stocks to Show**: 5-50 stocks (default: 20)
- **Auto-refresh**: Every 5 minutes
- **Cache Duration**: 30 minutes

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

The application can be deployed to Vercel, Netlify, or any platform that supports Next.js.

## License

This project is licensed under the MIT License.

## Disclaimer

This application is for educational and informational purposes only. It is not financial advice. Always do your own research before making investment decisions.
