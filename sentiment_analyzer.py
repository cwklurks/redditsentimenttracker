from typing import List, Dict
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from models import RedditPost, SentimentResult


class SentimentAnalyzer:
    def __init__(self):
        """Initialize the sentiment analyzer with VADER."""
        self.analyzer = SentimentIntensityAnalyzer()
    
    def get_sentiment_score(self, text: str) -> SentimentResult:
        """
        Analyze sentiment of a single text snippet using VADER.
        
        Args:
            text: Text to analyze for sentiment
            
        Returns:
            SentimentResult with compound score and sentiment category
        """
        if not text or not text.strip():
            return SentimentResult(0.0, 0.0, 0.0, 1.0, "Neutral")
        
        # Get VADER sentiment scores
        scores = self.analyzer.polarity_scores(text)
        
        # Determine sentiment category based on compound score
        compound = scores['compound']
        if compound > 0.1:
            category = "Positive"
        elif compound < -0.1:
            category = "Negative"
        else:
            category = "Neutral"
        
        return SentimentResult(
            compound_score=compound,
            positive=scores['pos'],
            negative=scores['neg'],
            neutral=scores['neu'],
            category=category
        )
    
    def analyze_stock_sentiment(self, posts: List[RedditPost], ticker: str) -> SentimentResult:
        """
        Calculate overall sentiment for a specific stock across multiple posts.
        
        Args:
            posts: List of RedditPost objects to analyze
            ticker: Stock ticker symbol to analyze sentiment for
            
        Returns:
            SentimentResult with aggregated sentiment for the stock
        """
        relevant_texts = []
        ticker_upper = ticker.upper()
        
        # Collect all text snippets that mention the ticker
        for post in posts:
            # Check title
            if post.title and ticker_upper in post.title.upper():
                relevant_texts.append(post.title)
            
            # Check content
            if post.content and ticker_upper in post.content.upper():
                relevant_texts.append(post.content)
            
            # Check comments
            for comment in post.comments:
                if comment and ticker_upper in comment.upper():
                    relevant_texts.append(comment)
        
        if not relevant_texts:
            return SentimentResult(0.0, 0.0, 0.0, 1.0, "Neutral")
        
        # Calculate sentiment for each relevant text
        sentiment_scores = []
        positive_sum = 0.0
        negative_sum = 0.0
        neutral_sum = 0.0
        
        for text in relevant_texts:
            sentiment = self.get_sentiment_score(text)
            sentiment_scores.append(sentiment.compound_score)
            positive_sum += sentiment.positive
            negative_sum += sentiment.negative
            neutral_sum += sentiment.neutral
        
        # Calculate average compound score
        avg_compound = sum(sentiment_scores) / len(sentiment_scores)
        
        # Calculate average component scores
        count = len(relevant_texts)
        avg_positive = positive_sum / count
        avg_negative = negative_sum / count
        avg_neutral = neutral_sum / count
        
        # Determine overall category
        if avg_compound > 0.1:
            category = "Positive"
        elif avg_compound < -0.1:
            category = "Negative"
        else:
            category = "Neutral"
        
        return SentimentResult(
            compound_score=avg_compound,
            positive=avg_positive,
            negative=avg_negative,
            neutral=avg_neutral,
            category=category
        )
    
    def analyze_multiple_stocks(self, posts: List[RedditPost], tickers: List[str]) -> Dict[str, SentimentResult]:
        """
        Analyze sentiment for multiple stocks at once.
        
        Args:
            posts: List of RedditPost objects to analyze
            tickers: List of stock ticker symbols to analyze
            
        Returns:
            Dictionary mapping ticker symbols to their sentiment results
        """
        results = {}
        
        for ticker in tickers:
            results[ticker] = self.analyze_stock_sentiment(posts, ticker)
        
        return results
    
    def get_sentiment_summary(self, posts: List[RedditPost]) -> Dict[str, int]:
        """
        Get overall sentiment distribution across all posts.
        
        Args:
            posts: List of RedditPost objects to analyze
            
        Returns:
            Dictionary with counts of positive, negative, and neutral posts
        """
        sentiment_counts = {"Positive": 0, "Negative": 0, "Neutral": 0}
        
        for post in posts:
            # Combine title and content for overall post sentiment
            combined_text = ""
            if post.title:
                combined_text += post.title + " "
            if post.content:
                combined_text += post.content
            
            if combined_text.strip():
                sentiment = self.get_sentiment_score(combined_text)
                sentiment_counts[sentiment.category] += 1
        
        return sentiment_counts