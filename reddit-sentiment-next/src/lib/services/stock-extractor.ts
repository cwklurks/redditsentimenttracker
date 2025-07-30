// Port of Python stock_extractor.py to TypeScript

import { RedditPost } from '@/types';

export class StockExtractor {
  private validTickers: Set<string>;
  private tickerPattern: RegExp;
  private falsePositives: Set<string>;

  constructor() {
    // Common stock tickers - this is a subset of popular tickers to filter false positives
    this.validTickers = new Set([
      // Major tech stocks
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE',
      // Financial stocks
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'COF',
      // Popular meme stocks and WSB favorites
      'GME', 'AMC', 'BB', 'NOK', 'PLTR', 'WISH', 'CLOV', 'SPCE', 'NIO', 'XPEV',
      // Major indices and ETFs
      'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'ARKK', 'SQQQ', 'TQQQ', 'UVXY', 'VIX',
      // Other popular stocks
      'DIS', 'KO', 'PEP', 'WMT', 'JNJ', 'PG', 'V', 'MA', 'PYPL', 'SQ',
      'F', 'GM', 'UBER', 'LYFT', 'SNAP', 'TWTR', 'PINS', 'ROKU', 'ZM', 'PTON',
      // Crypto-related stocks
      'COIN', 'MSTR', 'RIOT', 'MARA', 'SQ', 'PYPL',
      // Energy and commodities
      'XOM', 'CVX', 'COP', 'SLB', 'HAL', 'OXY', 'MRO', 'DVN', 'FANG', 'EOG',
      // Healthcare and biotech
      'PFE', 'JNJ', 'UNH', 'ABBV', 'TMO', 'DHR', 'ABT', 'BMY', 'LLY', 'MRK',
      // Additional popular tickers
      'BABA', 'JD', 'PDD', 'DIDI', 'LUCID', 'LCID', 'RIVN', 'SOFI', 'HOOD', 'RBLX'
    ]);

    // Regex pattern to match potential stock tickers
    // Matches 1-6 uppercase letters with proper word boundaries
    this.tickerPattern = /(?:^|[\s$\(\)\[\],/])([A-Z]{1,6})(?=[\s$\(\)\[\],/.!?;:]|$)/gm;

    // Common false positives to exclude (words that look like tickers but aren't)
    this.falsePositives = new Set([
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE',
      'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW',
      'OLD', 'SEE', 'TWO', 'WHO', 'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO',
      'USE', 'WAY', 'WIN', 'YES', 'YET', 'BUY', 'LOL', 'WTF', 'OMG', 'CEO', 'IPO', 'SEC',
      'FDA', 'NYSE', 'YOLO', 'HODL', 'DD', 'TA', 'PT', 'EOD', 'AH', 'PM', 'WSB', 'MOON',
      'EDIT', 'TLDR', 'IMO', 'IMHO', 'FYI', 'BTW', 'ATH', 'ATL', 'YTD', 'QOQ', 'YOY',
      'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BTC', 'ETH'
    ]);
  }

  extractTickers(text: string): Set<string> {
    if (!text) {
      return new Set();
    }

    // Find all potential ticker matches
    const matches = Array.from(text.toUpperCase().matchAll(this.tickerPattern))
      .map(match => match[1]);

    // Filter out false positives and keep only valid tickers
    const validMatches = new Set<string>();
    for (const match of matches) {
      if (
        this.validTickers.has(match) &&
        !this.falsePositives.has(match) &&
        match.length >= 2 // Minimum 2 characters for valid ticker
      ) {
        validMatches.add(match);
      }
    }

    return validMatches;
  }

  getTopMentioned(posts: RedditPost[], limit: number = 10): Record<string, number> {
    const tickerCounts = new Map<string, number>();

    for (const post of posts) {
      // Extract tickers from post title and content
      const postTickers = new Set<string>();

      // Check title
      if (post.title) {
        const titleTickers = this.extractTickers(post.title);
        titleTickers.forEach(ticker => postTickers.add(ticker));
      }

      // Check content
      if (post.content) {
        const contentTickers = this.extractTickers(post.content);
        contentTickers.forEach(ticker => postTickers.add(ticker));
      }

      // Check comments
      for (const comment of post.comments) {
        if (comment) {
          const commentTickers = this.extractTickers(comment);
          commentTickers.forEach(ticker => postTickers.add(ticker));
        }
      }

      // Count each ticker only once per post
      postTickers.forEach(ticker => {
        tickerCounts.set(ticker, (tickerCounts.get(ticker) || 0) + 1);
      });
    }

    // Convert to array, sort by count, and return top mentioned tickers
    const sortedTickers = Array.from(tickerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return Object.fromEntries(sortedTickers);
  }

  addCustomTickers(tickers: string[]): void {
    for (const ticker of tickers) {
      if (ticker && typeof ticker === 'string') {
        this.validTickers.add(ticker.toUpperCase());
      }
    }
  }

  removeTickers(tickers: string[]): void {
    for (const ticker of tickers) {
      if (ticker && typeof ticker === 'string') {
        this.validTickers.delete(ticker.toUpperCase());
      }
    }
  }

  getValidTickers(): Set<string> {
    return new Set(this.validTickers);
  }
}