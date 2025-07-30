// Port of Python data_controller.py to TypeScript

import { RedditScraper } from './reddit-scraper';
import { StockExtractor } from './stock-extractor';
import { SentimentAnalyzer } from './sentiment-analyzer';
import { StockMention, RedditPost, ProcessingStatus, DataCache } from '@/types';

export class DataController {
  private redditScraper: RedditScraper;
  private stockExtractor: StockExtractor;
  private sentimentAnalyzer: SentimentAnalyzer;
  private cacheDuration: number;
  private memoryCache: DataCache | null = null;

  constructor(cacheDurationMinutes: number = 30) {
    this.redditScraper = new RedditScraper();
    this.stockExtractor = new StockExtractor();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.cacheDuration = cacheDurationMinutes * 60 * 1000; // Convert to milliseconds
  }

  async processRedditData(postLimit: number = 200, topStocksLimit: number = 20): Promise<StockMention[]> {
    try {
      console.log(`Starting data processing pipeline with ${postLimit} posts`);

      // Step 1: Check cache first
      const cachedData = await this.loadCache();
      if (cachedData && this.isCacheValid(cachedData)) {
        console.log('Using cached data');
        return this.deserializeStockMentions(cachedData.stock_mentions);
      }

      // Step 2: Scrape Reddit data
      console.log('Fetching Reddit posts...');
      const posts = await this.redditScraper.getHotPosts('wallstreetbets', postLimit);

      if (!posts || posts.length === 0) {
        console.warn('No posts retrieved from Reddit');
        return this.getFallbackData();
      }

      console.log(`Retrieved ${posts.length} posts from Reddit`);

      // Step 3: Extract stock mentions
      console.log('Extracting stock tickers...');
      const topMentioned = this.stockExtractor.getTopMentioned(posts, topStocksLimit);

      if (!topMentioned || Object.keys(topMentioned).length === 0) {
        console.warn('No stock tickers found in posts');
        return [];
      }

      console.log(`Found ${Object.keys(topMentioned).length} top mentioned stocks`);

      // Step 4: Analyze sentiment for each stock
      console.log('Analyzing sentiment...');
      const stockMentions: StockMention[] = [];

      for (const [ticker, mentionCount] of Object.entries(topMentioned)) {
        try {
          const sentimentResult = this.sentimentAnalyzer.analyzeStockSentiment(posts, ticker);

          const stockMention: StockMention = {
            ticker,
            mention_count: mentionCount,
            sentiment_score: sentimentResult.compound_score,
            sentiment_category: sentimentResult.category,
            last_updated: new Date(),
          };

          stockMentions.push(stockMention);
        } catch (error) {
          console.error(`Error analyzing sentiment for ${ticker}:`, error);
          // Create a neutral sentiment entry for failed analysis
          const stockMention: StockMention = {
            ticker,
            mention_count: mentionCount,
            sentiment_score: 0.0,
            sentiment_category: 'Neutral',
            last_updated: new Date(),
          };
          stockMentions.push(stockMention);
        }
      }

      // Step 5: Sort by mention count (descending)
      stockMentions.sort((a, b) => b.mention_count - a.mention_count);

      // Step 6: Cache the results
      await this.saveCache(stockMentions, posts);

      console.log(`Data processing completed successfully with ${stockMentions.length} stocks`);
      return stockMentions;
    } catch (error) {
      console.error('Error in data processing pipeline:', error);
      return this.getFallbackData();
    }
  }

  async getCachedData(): Promise<StockMention[] | null> {
    const cachedData = await this.loadCache();
    if (cachedData && this.isCacheValid(cachedData)) {
      return this.deserializeStockMentions(cachedData.stock_mentions);
    }
    return null;
  }

  async forceRefresh(postLimit: number = 200, topStocksLimit: number = 20): Promise<StockMention[]> {
    await this.clearCache();
    return this.processRedditData(postLimit, topStocksLimit);
  }

  async getProcessingStatus(): Promise<ProcessingStatus> {
    const cachedData = await this.loadCache();
    const cacheValid = cachedData && this.isCacheValid(cachedData);

    const status: ProcessingStatus = {
      reddit_scraper_ready: this.redditScraper.isAuthenticated(),
      cache_available: cachedData !== null,
      cache_valid: cacheValid || false,
      last_update: cachedData?.timestamp,
      cache_expires: undefined,
    };

    if (cachedData && cacheValid) {
      const cacheTime = new Date(cachedData.timestamp);
      status.cache_expires = new Date(cacheTime.getTime() + this.cacheDuration).toISOString();
    }

    return status;
  }

  private async loadCache(): Promise<DataCache | null> {
    return this.memoryCache;
  }

  private async saveCache(stockMentions: StockMention[], posts: RedditPost[]): Promise<void> {
    try {
      const cacheData: DataCache = {
        timestamp: new Date().toISOString(),
        stock_mentions: this.serializeStockMentions(stockMentions),
        post_count: posts.length,
        cache_duration_minutes: this.cacheDuration / (60 * 1000),
      };

      this.memoryCache = cacheData;
      console.log('Data cached successfully in memory');
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  private async clearCache(): Promise<void> {
    this.memoryCache = null;
    console.log('Memory cache cleared');
  }

  private isCacheValid(cachedData: DataCache): boolean {
    try {
      const cacheTime = new Date(cachedData.timestamp);
      return Date.now() - cacheTime.getTime() < this.cacheDuration;
    } catch (error) {
      return false;
    }
  }

  private serializeStockMentions(stockMentions: StockMention[]): any[] {
    return stockMentions.map(sm => ({
      ticker: sm.ticker,
      mention_count: sm.mention_count,
      sentiment_score: sm.sentiment_score,
      sentiment_category: sm.sentiment_category,
      last_updated: sm.last_updated.toISOString(),
    }));
  }

  private deserializeStockMentions(data: any[]): StockMention[] {
    return data.map(item => ({
      ticker: item.ticker,
      mention_count: item.mention_count,
      sentiment_score: item.sentiment_score,
      sentiment_category: item.sentiment_category,
      last_updated: new Date(item.last_updated),
    }));
  }

  private async getFallbackData(): Promise<StockMention[]> {
    console.log('Attempting to use fallback data');

    // Try to use cached data even if expired
    const cachedData = await this.loadCache();
    if (cachedData?.stock_mentions) {
      console.log('Using expired cached data as fallback');
      return this.deserializeStockMentions(cachedData.stock_mentions);
    }

    // Return empty list as last resort
    console.warn('No fallback data available, returning empty results');
    return [];
  }

  addCustomTickers(tickers: string[]): void {
    this.stockExtractor.addCustomTickers(tickers);
    console.log(`Added custom tickers: ${tickers}`);
  }

  removeTickers(tickers: string[]): void {
    this.stockExtractor.removeTickers(tickers);
    console.log(`Removed tickers: ${tickers}`);
  }

  getSentimentSummary(posts: RedditPost[]): Record<string, number> {
    return this.sentimentAnalyzer.getSentimentSummary(posts);
  }
}