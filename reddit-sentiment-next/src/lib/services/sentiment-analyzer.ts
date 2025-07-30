// Port of Python sentiment_analyzer.py to TypeScript using the sentiment library

import Sentiment from 'sentiment';
import { RedditPost, SentimentResult } from '@/types';

export class SentimentAnalyzer {
  private analyzer: Sentiment;

  constructor() {
    this.analyzer = new Sentiment();
  }

  getSentimentScore(text: string): SentimentResult {
    if (!text || !text.trim()) {
      return {
        compound_score: 0.0,
        positive: 0.0,
        negative: 0.0,
        neutral: 1.0,
        category: 'Neutral',
      };
    }

    // Get sentiment analysis result
    const result = this.analyzer.analyze(text);
    
    // Convert score to a normalized compound score similar to VADER
    // The sentiment library returns a score typically between -5 and 5
    // We'll normalize it to -1 to 1 range like VADER
    const compound = Math.max(-1, Math.min(1, result.score / 5));
    
    // Calculate normalized positive/negative/neutral scores
    // This is a simplified approach compared to VADER's more sophisticated scoring
    const absScore = Math.abs(compound);
    let positive = 0.0;
    let negative = 0.0;
    const neutral = 1.0 - absScore;

    if (compound > 0) {
      positive = absScore;
    } else if (compound < 0) {
      negative = absScore;
    }

    // Determine sentiment category based on compound score
    let category: 'Positive' | 'Negative' | 'Neutral';
    if (compound > 0.1) {
      category = 'Positive';
    } else if (compound < -0.1) {
      category = 'Negative';
    } else {
      category = 'Neutral';
    }

    return {
      compound_score: compound,
      positive,
      negative,
      neutral,
      category,
    };
  }

  analyzeStockSentiment(posts: RedditPost[], ticker: string): SentimentResult {
    const relevantTexts: string[] = [];
    const tickerUpper = ticker.toUpperCase();

    // Collect all text snippets that mention the ticker
    for (const post of posts) {
      // Check title
      if (post.title && post.title.toUpperCase().includes(tickerUpper)) {
        relevantTexts.push(post.title);
      }

      // Check content
      if (post.content && post.content.toUpperCase().includes(tickerUpper)) {
        relevantTexts.push(post.content);
      }

      // Check comments
      for (const comment of post.comments) {
        if (comment && comment.toUpperCase().includes(tickerUpper)) {
          relevantTexts.push(comment);
        }
      }
    }

    if (relevantTexts.length === 0) {
      return {
        compound_score: 0.0,
        positive: 0.0,
        negative: 0.0,
        neutral: 1.0,
        category: 'Neutral',
      };
    }

    // Calculate sentiment for each relevant text
    const sentimentScores: number[] = [];
    let positiveSum = 0.0;
    let negativeSum = 0.0;
    let neutralSum = 0.0;

    for (const text of relevantTexts) {
      const sentiment = this.getSentimentScore(text);
      sentimentScores.push(sentiment.compound_score);
      positiveSum += sentiment.positive;
      negativeSum += sentiment.negative;
      neutralSum += sentiment.neutral;
    }

    // Calculate average compound score
    const avgCompound = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;

    // Calculate average component scores
    const count = relevantTexts.length;
    const avgPositive = positiveSum / count;
    const avgNegative = negativeSum / count;
    const avgNeutral = neutralSum / count;

    // Determine overall category
    let category: 'Positive' | 'Negative' | 'Neutral';
    if (avgCompound > 0.1) {
      category = 'Positive';
    } else if (avgCompound < -0.1) {
      category = 'Negative';
    } else {
      category = 'Neutral';
    }

    return {
      compound_score: avgCompound,
      positive: avgPositive,
      negative: avgNegative,
      neutral: avgNeutral,
      category,
    };
  }

  analyzeMultipleStocks(posts: RedditPost[], tickers: string[]): Record<string, SentimentResult> {
    const results: Record<string, SentimentResult> = {};

    for (const ticker of tickers) {
      results[ticker] = this.analyzeStockSentiment(posts, ticker);
    }

    return results;
  }

  getSentimentSummary(posts: RedditPost[]): Record<string, number> {
    const sentimentCounts = { Positive: 0, Negative: 0, Neutral: 0 };

    for (const post of posts) {
      // Combine title and content for overall post sentiment
      let combinedText = '';
      if (post.title) {
        combinedText += post.title + ' ';
      }
      if (post.content) {
        combinedText += post.content;
      }

      if (combinedText.trim()) {
        const sentiment = this.getSentimentScore(combinedText);
        sentimentCounts[sentiment.category] += 1;
      }
    }

    return sentimentCounts;
  }
}