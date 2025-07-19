import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
from reddit_scraper import RedditScraper
from stock_extractor import StockExtractor
from sentiment_analyzer import SentimentAnalyzer
from models import StockMention, RedditPost, SentimentResult


class DataController:
    def __init__(self, cache_duration_minutes: int = 30):
        """
        Initialize the data controller with all processing components.
        
        Args:
            cache_duration_minutes: How long to cache data before refreshing
        """
        self.reddit_scraper = RedditScraper()
        self.stock_extractor = StockExtractor()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.cache_duration = timedelta(minutes=cache_duration_minutes)
        self.cache_file = "data_cache.json"
        
        # Set up logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def process_reddit_data(self, post_limit: int = 200, top_stocks_limit: int = 20) -> List[StockMention]:
        """
        Complete data processing pipeline: scrape Reddit, extract stocks, analyze sentiment.
        
        Args:
            post_limit: Number of Reddit posts to fetch
            top_stocks_limit: Number of top mentioned stocks to return
            
        Returns:
            List of StockMention objects with sentiment analysis
        """
        try:
            self.logger.info(f"Starting data processing pipeline with {post_limit} posts")
            
            # Step 1: Check cache first
            cached_data = self._load_cache()
            if cached_data and self._is_cache_valid(cached_data):
                self.logger.info("Using cached data")
                return self._deserialize_stock_mentions(cached_data['stock_mentions'])
            
            # Step 2: Scrape Reddit data
            self.logger.info("Fetching Reddit posts...")
            posts = self.reddit_scraper.get_hot_posts(limit=post_limit)
            
            if not posts:
                self.logger.warning("No posts retrieved from Reddit")
                return self._get_fallback_data()
            
            self.logger.info(f"Retrieved {len(posts)} posts from Reddit")
            
            # Step 3: Extract stock mentions
            self.logger.info("Extracting stock tickers...")
            top_mentioned = self.stock_extractor.get_top_mentioned(posts, limit=top_stocks_limit)
            
            if not top_mentioned:
                self.logger.warning("No stock tickers found in posts")
                return []
            
            self.logger.info(f"Found {len(top_mentioned)} top mentioned stocks")
            
            # Step 4: Analyze sentiment for each stock
            self.logger.info("Analyzing sentiment...")
            stock_mentions = []
            
            for ticker, mention_count in top_mentioned.items():
                try:
                    sentiment_result = self.sentiment_analyzer.analyze_stock_sentiment(posts, ticker)
                    
                    stock_mention = StockMention(
                        ticker=ticker,
                        mention_count=mention_count,
                        sentiment_score=sentiment_result.compound_score,
                        sentiment_category=sentiment_result.category,
                        last_updated=datetime.now()
                    )
                    
                    stock_mentions.append(stock_mention)
                    
                except Exception as e:
                    self.logger.error(f"Error analyzing sentiment for {ticker}: {str(e)}")
                    # Create a neutral sentiment entry for failed analysis
                    stock_mention = StockMention(
                        ticker=ticker,
                        mention_count=mention_count,
                        sentiment_score=0.0,
                        sentiment_category="Neutral",
                        last_updated=datetime.now()
                    )
                    stock_mentions.append(stock_mention)
            
            # Step 5: Sort by mention count (descending)
            stock_mentions.sort(key=lambda x: x.mention_count, reverse=True)
            
            # Step 6: Cache the results
            self._save_cache(stock_mentions, posts)
            
            self.logger.info(f"Data processing completed successfully with {len(stock_mentions)} stocks")
            return stock_mentions
            
        except Exception as e:
            self.logger.error(f"Error in data processing pipeline: {str(e)}")
            return self._get_fallback_data()
    
    def get_cached_data(self) -> Optional[List[StockMention]]:
        """
        Get cached data if available and valid.
        
        Returns:
            List of StockMention objects from cache, or None if no valid cache
        """
        cached_data = self._load_cache()
        if cached_data and self._is_cache_valid(cached_data):
            return self._deserialize_stock_mentions(cached_data['stock_mentions'])
        return None
    
    def force_refresh(self, post_limit: int = 200, top_stocks_limit: int = 20) -> List[StockMention]:
        """
        Force refresh data by clearing cache and processing new data.
        
        Args:
            post_limit: Number of Reddit posts to fetch
            top_stocks_limit: Number of top mentioned stocks to return
            
        Returns:
            List of StockMention objects with fresh data
        """
        self._clear_cache()
        return self.process_reddit_data(post_limit, top_stocks_limit)
    
    def get_processing_status(self) -> Dict[str, any]:
        """
        Get status information about the data processing components.
        
        Returns:
            Dictionary with status information
        """
        cached_data = self._load_cache()
        cache_valid = cached_data and self._is_cache_valid(cached_data)
        
        status = {
            "reddit_scraper_ready": self.reddit_scraper.is_authenticated(),
            "cache_available": cached_data is not None,
            "cache_valid": cache_valid,
            "last_update": None,
            "cache_expires": None
        }
        
        if cached_data:
            status["last_update"] = cached_data.get("timestamp")
            if cache_valid:
                cache_time = datetime.fromisoformat(cached_data["timestamp"])
                status["cache_expires"] = (cache_time + self.cache_duration).isoformat()
        
        return status
    
    def _load_cache(self) -> Optional[Dict]:
        """Load cached data from file."""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            self.logger.error(f"Error loading cache: {str(e)}")
        return None
    
    def _save_cache(self, stock_mentions: List[StockMention], posts: List[RedditPost]) -> None:
        """Save data to cache file."""
        try:
            cache_data = {
                "timestamp": datetime.now().isoformat(),
                "stock_mentions": self._serialize_stock_mentions(stock_mentions),
                "post_count": len(posts),
                "cache_duration_minutes": self.cache_duration.total_seconds() / 60
            }
            
            with open(self.cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
                
            self.logger.info("Data cached successfully")
            
        except Exception as e:
            self.logger.error(f"Error saving cache: {str(e)}")
    
    def _clear_cache(self) -> None:
        """Clear the cache file."""
        try:
            if os.path.exists(self.cache_file):
                os.remove(self.cache_file)
                self.logger.info("Cache cleared")
        except Exception as e:
            self.logger.error(f"Error clearing cache: {str(e)}")
    
    def _is_cache_valid(self, cached_data: Dict) -> bool:
        """Check if cached data is still valid based on timestamp."""
        try:
            cache_time = datetime.fromisoformat(cached_data["timestamp"])
            return datetime.now() - cache_time < self.cache_duration
        except Exception:
            return False
    
    def _serialize_stock_mentions(self, stock_mentions: List[StockMention]) -> List[Dict]:
        """Convert StockMention objects to JSON-serializable format."""
        return [
            {
                "ticker": sm.ticker,
                "mention_count": sm.mention_count,
                "sentiment_score": sm.sentiment_score,
                "sentiment_category": sm.sentiment_category,
                "last_updated": sm.last_updated.isoformat()
            }
            for sm in stock_mentions
        ]
    
    def _deserialize_stock_mentions(self, data: List[Dict]) -> List[StockMention]:
        """Convert JSON data back to StockMention objects."""
        return [
            StockMention(
                ticker=item["ticker"],
                mention_count=item["mention_count"],
                sentiment_score=item["sentiment_score"],
                sentiment_category=item["sentiment_category"],
                last_updated=datetime.fromisoformat(item["last_updated"])
            )
            for item in data
        ]
    
    def _get_fallback_data(self) -> List[StockMention]:
        """
        Get fallback data when main processing fails.
        First tries cached data, then returns empty list.
        """
        self.logger.info("Attempting to use fallback data")
        
        # Try to use cached data even if expired
        cached_data = self._load_cache()
        if cached_data and "stock_mentions" in cached_data:
            self.logger.info("Using expired cached data as fallback")
            return self._deserialize_stock_mentions(cached_data["stock_mentions"])
        
        # Return empty list as last resort
        self.logger.warning("No fallback data available, returning empty results")
        return []
    
    def add_custom_tickers(self, tickers: List[str]) -> None:
        """
        Add custom stock tickers to the extraction system.
        
        Args:
            tickers: List of ticker symbols to add
        """
        self.stock_extractor.add_custom_tickers(tickers)
        self.logger.info(f"Added custom tickers: {tickers}")
    
    def remove_tickers(self, tickers: List[str]) -> None:
        """
        Remove stock tickers from the extraction system.
        
        Args:
            tickers: List of ticker symbols to remove
        """
        self.stock_extractor.remove_tickers(tickers)
        self.logger.info(f"Removed tickers: {tickers}")
    
    def get_sentiment_summary(self, posts: List[RedditPost]) -> Dict[str, int]:
        """
        Get overall sentiment summary for posts.
        
        Args:
            posts: List of RedditPost objects
            
        Returns:
            Dictionary with sentiment distribution
        """
        return self.sentiment_analyzer.get_sentiment_summary(posts)