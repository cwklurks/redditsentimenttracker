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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  lastUpdated?: Date;
}

export interface DashboardConfig {
  postLimit: number;
  topStocksLimit: number;
  refreshInterval: number;
  autoRefresh: boolean;
}