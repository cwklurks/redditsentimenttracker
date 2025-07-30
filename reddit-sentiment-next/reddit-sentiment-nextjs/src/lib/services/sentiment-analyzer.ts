import { SentimentResult } from '@/types';

// VADER sentiment analysis equivalent for JavaScript
// This is a simplified implementation of VADER sentiment analysis
export class SentimentAnalyzer {
  private readonly positiveWords = new Set([
    'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful', 'outstanding',
    'brilliant', 'perfect', 'superb', 'magnificent', 'marvelous', 'terrific', 'incredible',
    'phenomenal', 'exceptional', 'remarkable', 'impressive', 'splendid', 'delightful',
    'bull', 'bullish', 'moon', 'rocket', 'up', 'high', 'gain', 'profit', 'win', 'winner',
    'buy', 'long', 'hold', 'strong', 'solid', 'green', 'pump', 'surge', 'boom', 'skyrocket',
    'diamond', 'hands', 'hodl', 'lambo', 'tendies', 'stonks', 'calls', 'yolo'
  ]);
  
  private readonly negativeWords = new Set([
    'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor', 'worse', 'worst',
    'pathetic', 'disgusting', 'hate', 'horrible', 'disaster', 'catastrophe', 'nightmare',
    'dreadful', 'appalling', 'atrocious', 'abysmal', 'deplorable', 'detestable',
    'bear', 'bearish', 'crash', 'fall', 'drop', 'down', 'loss', 'lose', 'losing',
    'sell', 'short', 'weak', 'red', 'dump', 'tank', 'plummet', 'collapse', 'rekt',
    'bag', 'holder', 'puts', 'dead', 'fucked', 'screwed', 'toast', 'broke'
  ]);
  
  private readonly intensifiers = new Map([
    ['very', 0.293],
    ['extremely', 0.4],
    ['really', 0.293],
    ['incredibly', 0.4],
    ['absolutely', 0.4],
    ['totally', 0.4],
    ['completely', 0.4],
    ['utterly', 0.4],
    ['quite', 0.2],
    ['rather', 0.2],
    ['somewhat', 0.1],
    ['fairly', 0.1]
  ]);
  
  private readonly negations = new Set([
    'not', 'no', 'never', 'none', 'neither', 'nobody', 'nothing', 'nowhere',
    'hardly', 'scarcely', 'barely', 'rarely', 'seldom', 'without', "don't",
    "doesn't", "didn't", "won't", "wouldn't", "shouldn't", "couldn't", "can't", "isn't", "aren't", "wasn't", "weren't"
  ]);
  
  analyzeSentiment(text: string): SentimentResult {
    if (!text || text.trim().length === 0) {
      return {
        compound_score: 0,
        positive: 0,
        negative: 0,
        neutral: 1,
        category: 'Neutral'
      };
    }
    
    const words = this.tokenize(text.toLowerCase());
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let sentiment = 0;
      let isNegated = false;
      
      // Check for negation in the previous 3 words
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (this.negations.has(words[j])) {
          isNegated = true;
          break;
        }
      }
      
      // Determine base sentiment
      if (this.positiveWords.has(word)) {
        sentiment = 1;
      } else if (this.negativeWords.has(word)) {
        sentiment = -1;
      }
      
      // Apply intensifiers
      if (sentiment !== 0 && i > 0) {
        const prevWord = words[i - 1];
        if (this.intensifiers.has(prevWord)) {
          const intensity = this.intensifiers.get(prevWord)!;
          sentiment = sentiment > 0 ? sentiment + intensity : sentiment - intensity;
        }
      }
      
      // Apply negation
      if (isNegated && sentiment !== 0) {
        sentiment = -sentiment;
      }
      
      // Accumulate sentiment scores
      if (sentiment > 0) {
        positive += sentiment;
      } else if (sentiment < 0) {
        negative += Math.abs(sentiment);
      } else {
        neutral += 1;
      }
    }
    
    // Normalize scores
    const total = positive + negative + neutral;
    if (total === 0) {
      return {
        compound_score: 0,
        positive: 0,
        negative: 0,
        neutral: 1,
        category: 'Neutral'
      };
    }
    
    const normalizedPositive = positive / total;
    const normalizedNegative = negative / total;
    const normalizedNeutral = neutral / total;
    
    // Calculate compound score (similar to VADER)
    const compound = this.calculateCompoundScore(positive, negative, total);
    
    // Determine category based on compound score
    let category: 'Positive' | 'Negative' | 'Neutral';
    if (compound >= 0.05) {
      category = 'Positive';
    } else if (compound <= -0.05) {
      category = 'Negative';
    } else {
      category = 'Neutral';
    }
    
    return {
      compound_score: compound,
      positive: normalizedPositive,
      negative: normalizedNegative,
      neutral: normalizedNeutral,
      category
    };
  }
  
  private tokenize(text: string): string[] {
    // Simple tokenization - in production, you might want to use a more sophisticated tokenizer
    return text
      .replace(/[^\w\s']/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }
  
  private calculateCompoundScore(positive: number, negative: number, total: number): number {
    if (total === 0) return 0;
    
    // This is a simplified version of VADER's compound score calculation
    const score = positive - negative;
    const normalized = score / Math.sqrt(score * score + 15);
    
    // Ensure the score is between -1 and 1
    return Math.max(-1, Math.min(1, normalized));
  }
  
  analyzeMultipleTexts(texts: string[]): SentimentResult {
    if (texts.length === 0) {
      return {
        compound_score: 0,
        positive: 0,
        negative: 0,
        neutral: 1,
        category: 'Neutral'
      };
    }
    
    const results = texts.map(text => this.analyzeSentiment(text));
    
    // Average the results
    const avgCompound = results.reduce((sum, r) => sum + r.compound_score, 0) / results.length;
    const avgPositive = results.reduce((sum, r) => sum + r.positive, 0) / results.length;
    const avgNegative = results.reduce((sum, r) => sum + r.negative, 0) / results.length;
    const avgNeutral = results.reduce((sum, r) => sum + r.neutral, 0) / results.length;
    
    let category: 'Positive' | 'Negative' | 'Neutral';
    if (avgCompound >= 0.05) {
      category = 'Positive';
    } else if (avgCompound <= -0.05) {
      category = 'Negative';
    } else {
      category = 'Neutral';
    }
    
    return {
      compound_score: avgCompound,
      positive: avgPositive,
      negative: avgNegative,
      neutral: avgNeutral,
      category
    };
  }
}