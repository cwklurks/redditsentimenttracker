// Port of Python models to TypeScript interfaces

export interface StockMention {
  ticker: string;
  mention_count: number;
  sentiment_score: number;
  sentiment_category: 'Positive' | 'Negative' | 'Neutral';
  last_updated: Date;
}

export interface RedditPost {
  id: string;
  title: string;
  content: string;
  comments: string[];
  created_utc: Date;
  score: number;
}

export interface SentimentResult {
  compound_score: number;
  positive: number;
  negative: number;
  neutral: number;
  category: 'Positive' | 'Negative' | 'Neutral';
}

export interface ProcessingStatus {
  reddit_scraper_ready: boolean;
  cache_available: boolean;
  cache_valid: boolean;
  last_update?: string;
  cache_expires?: string;
}

export interface DataCache {
  timestamp: string;
  stock_mentions: StockMention[];
  post_count: number;
  cache_duration_minutes: number;
}

export interface DashboardConfig {
  post_limit: number;
  stock_limit: number;
  refresh_interval?: number;
}

export interface MarketInsights {
  total_mentions: number;
  avg_sentiment: number;
  strong_positive: StockMention[];
  strong_negative: StockMention[];
  high_volume: StockMention[];
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  recommendations: string[];
}