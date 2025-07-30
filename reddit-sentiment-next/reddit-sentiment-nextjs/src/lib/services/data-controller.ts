import { promises as fs } from 'fs';
import path from 'path';
import { StockMention } from '@/types';
import { RedditScraper, RedditScraperError } from './reddit-scraper';
import { StockExtractor } from './stock-extractor';
import { SentimentAnalyzer } from './sentiment-analyzer';

interface CacheData {
  stockMentions: StockMention[];
  lastUpdated: string;
  postCount: number;
}

export class DataController {
  private redditScraper: RedditScraper;
  private stockExtractor: StockExtractor;
  private sentimentAnalyzer: SentimentAnalyzer;
  private cacheDurationMinutes: number;
  private cacheFilePath: string;
  
  constructor(cacheDurationMinutes: number = 30) {
    this.redditScraper = new RedditScraper();
    this.stockExtractor = new StockExtractor();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.cacheDurationMinutes = cacheDurationMinutes;
    this.cacheFilePath = path.join(process.cwd(), 'data-cache.json');
  }
  
  async processRedditData(postLimit: number = 100, topStocksLimit: number = 20, forceRefresh: boolean = false): Promise<{
    stockMentions: StockMention[];
    cached: boolean;
    lastUpdated: Date;
  }> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cachedData = await this.getCachedData();
        if (cachedData) {
          console.log('Returning cached data');
          return {
            stockMentions: cachedData.stockMentions.slice(0, topStocksLimit),
            cached: true,
            lastUpdated: new Date(cachedData.lastUpdated)
          };
        }
      }
      
      console.log(`Fetching fresh data from Reddit (${postLimit} posts)`);
      
      // Fetch fresh data from Reddit
      const posts = await this.redditScraper.fetchPosts(postLimit);
      console.log(`Fetched ${posts.length} posts from Reddit`);
      
      // Extract stock tickers
      const tickerMentions = this.stockExtractor.extractFromPosts(posts);
      console.log(`Extracted ${tickerMentions.length} unique tickers`);
      
      // Analyze sentiment for each ticker
      const stockMentions: StockMention[] = [];
      
      for (const tickerMention of tickerMentions) {
        // Analyze sentiment from all contexts where this ticker was mentioned
        const sentimentResult = this.sentimentAnalyzer.analyzeMultipleTexts(tickerMention.contexts);
        
        const stockMention: StockMention = {
          ticker: tickerMention.ticker,
          mention_count: tickerMention.count,
          sentiment_score: sentimentResult.compound_score,
          sentiment_category: sentimentResult.category,
          last_updated: new Date()
        };
        
        stockMentions.push(stockMention);
      }
      
      // Sort by mention count and sentiment
      stockMentions.sort((a, b) => {
        // Primary sort by mention count
        if (b.mention_count !== a.mention_count) {
          return b.mention_count - a.mention_count;
        }
        // Secondary sort by sentiment score
        return b.sentiment_score - a.sentiment_score;
      });
      
      // Cache the results
      await this.cacheData({
        stockMentions,
        lastUpdated: new Date().toISOString(),
        postCount: posts.length
      });
      
      console.log(`Processed ${stockMentions.length} stock mentions`);
      
      return {
        stockMentions: stockMentions.slice(0, topStocksLimit),
        cached: false,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error('Error processing Reddit data:', error);
      
      // Try to return cached data as fallback
      const cachedData = await this.getCachedData();
      if (cachedData) {
        console.log('Returning cached data as fallback');
        return {
          stockMentions: cachedData.stockMentions.slice(0, topStocksLimit),
          cached: true,
          lastUpdated: new Date(cachedData.lastUpdated)
        };
      }
      
      // If no cached data available, throw the error
      if (error instanceof RedditScraperError) {
        throw error;
      }
      throw new Error(`Failed to process Reddit data: ${error}`);
    }
  }
  
  private async getCachedData(): Promise<CacheData | null> {
    try {
      const cacheExists = await fs.access(this.cacheFilePath).then(() => true).catch(() => false);
      if (!cacheExists) {
        return null;
      }
      
      const cacheContent = await fs.readFile(this.cacheFilePath, 'utf-8');
      const cacheData: CacheData = JSON.parse(cacheContent);
      
      // Check if cache is still valid
      const lastUpdated = new Date(cacheData.lastUpdated);
      const now = new Date();
      const cacheAgeMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
      
      if (cacheAgeMinutes <= this.cacheDurationMinutes) {
        return cacheData;
      }
      
      console.log(`Cache expired (${cacheAgeMinutes.toFixed(1)} minutes old)`);
      return null;
      
    } catch (error) {
      console.warn('Error reading cache:', error);
      return null;
    }
  }
  
  private async cacheData(data: CacheData): Promise<void> {
    try {
      await fs.writeFile(this.cacheFilePath, JSON.stringify(data, null, 2));
      console.log('Data cached successfully');
    } catch (error) {
      console.warn('Error caching data:', error);
    }
  }
  
  async clearCache(): Promise<void> {
    try {
      await fs.unlink(this.cacheFilePath);
      console.log('Cache cleared');
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  }
  
  async getCacheStatus(): Promise<{
    exists: boolean;
    lastUpdated?: Date;
    ageMinutes?: number;
    postCount?: number;
  }> {
    try {
      const cacheData = await this.getCachedData();
      if (!cacheData) {
        return { exists: false };
      }
      
      const lastUpdated = new Date(cacheData.lastUpdated);
      const ageMinutes = (new Date().getTime() - lastUpdated.getTime()) / (1000 * 60);
      
      return {
        exists: true,
        lastUpdated,
        ageMinutes,
        postCount: cacheData.postCount
      };
    } catch {
      return { exists: false };
    }
  }
}