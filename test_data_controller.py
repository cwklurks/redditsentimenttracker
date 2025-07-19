import unittest
import os
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from data_controller import DataController
from models import StockMention, RedditPost, SentimentResult


class TestDataController(unittest.TestCase):
    @patch('data_controller.RedditScraper')
    @patch('data_controller.StockExtractor')
    @patch('data_controller.SentimentAnalyzer')
    def setUp(self, mock_sentiment, mock_extractor, mock_scraper):
        """Set up test fixtures before each test method."""
        # Mock the dependencies so we don't need real Reddit API credentials
        mock_scraper_instance = Mock()
        mock_scraper_instance.is_authenticated.return_value = True
        mock_scraper.return_value = mock_scraper_instance
        
        mock_extractor_instance = Mock()
        mock_extractor_instance.get_valid_tickers.return_value = set()
        mock_extractor_instance.add_custom_tickers = Mock()
        mock_extractor_instance.remove_tickers = Mock()
        mock_extractor.return_value = mock_extractor_instance
        
        mock_sentiment_instance = Mock()
        mock_sentiment.return_value = mock_sentiment_instance
        
        self.controller = DataController(cache_duration_minutes=30)
        self.test_cache_file = "test_cache.json"
        self.controller.cache_file = self.test_cache_file
        
        # Clean up any existing test cache
        if os.path.exists(self.test_cache_file):
            os.remove(self.test_cache_file)
    
    def tearDown(self):
        """Clean up after each test method."""
        if os.path.exists(self.test_cache_file):
            os.remove(self.test_cache_file)
    
    def test_initialization(self):
        """Test that DataController initializes correctly."""
        self.assertIsNotNone(self.controller.reddit_scraper)
        self.assertIsNotNone(self.controller.stock_extractor)
        self.assertIsNotNone(self.controller.sentiment_analyzer)
        self.assertEqual(self.controller.cache_duration, timedelta(minutes=30))
    
    @patch('data_controller.RedditScraper')
    @patch('data_controller.StockExtractor')
    @patch('data_controller.SentimentAnalyzer')
    def test_process_reddit_data_success(self, mock_sentiment, mock_extractor, mock_scraper):
        """Test successful data processing pipeline."""
        # Mock Reddit posts
        mock_posts = [
            RedditPost("1", "AAPL is great!", "Apple stock rocks", [], datetime.now(), 100),
            RedditPost("2", "TSLA to the moon", "Tesla is amazing", [], datetime.now(), 50)
        ]
        
        # Mock scraper
        mock_scraper_instance = Mock()
        mock_scraper_instance.get_hot_posts.return_value = mock_posts
        mock_scraper.return_value = mock_scraper_instance
        
        # Mock stock extractor
        mock_extractor_instance = Mock()
        mock_extractor_instance.get_top_mentioned.return_value = {"AAPL": 2, "TSLA": 1}
        mock_extractor.return_value = mock_extractor_instance
        
        # Mock sentiment analyzer
        mock_sentiment_instance = Mock()
        mock_sentiment_instance.analyze_stock_sentiment.side_effect = [
            SentimentResult(0.5, 0.7, 0.1, 0.2, "Positive"),
            SentimentResult(0.3, 0.6, 0.2, 0.2, "Positive")
        ]
        mock_sentiment.return_value = mock_sentiment_instance
        
        # Create new controller with mocked components
        controller = DataController()
        controller.cache_file = self.test_cache_file
        controller.reddit_scraper = mock_scraper_instance
        controller.stock_extractor = mock_extractor_instance
        controller.sentiment_analyzer = mock_sentiment_instance
        
        # Test the pipeline
        result = controller.process_reddit_data(post_limit=10, top_stocks_limit=5)
        
        # Verify results
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].ticker, "AAPL")
        self.assertEqual(result[0].mention_count, 2)
        self.assertEqual(result[0].sentiment_category, "Positive")
        self.assertEqual(result[1].ticker, "TSLA")
        self.assertEqual(result[1].mention_count, 1)
        
        # Verify method calls
        mock_scraper_instance.get_hot_posts.assert_called_once_with(limit=10)
        mock_extractor_instance.get_top_mentioned.assert_called_once_with(mock_posts, limit=5)
        self.assertEqual(mock_sentiment_instance.analyze_stock_sentiment.call_count, 2)
    
    @patch('data_controller.RedditScraper')
    def test_process_reddit_data_no_posts(self, mock_scraper):
        """Test handling when no Reddit posts are retrieved."""
        # Mock scraper to return empty list
        mock_scraper_instance = Mock()
        mock_scraper_instance.get_hot_posts.return_value = []
        mock_scraper.return_value = mock_scraper_instance
        
        controller = DataController()
        controller.reddit_scraper = mock_scraper_instance
        
        result = controller.process_reddit_data()
        
        # Should return empty list when no posts
        self.assertEqual(result, [])
    
    @patch('data_controller.RedditScraper')
    @patch('data_controller.StockExtractor')
    def test_process_reddit_data_no_stocks(self, mock_extractor, mock_scraper):
        """Test handling when no stocks are found in posts."""
        # Mock Reddit posts
        mock_posts = [
            RedditPost("1", "General discussion", "No stocks here", [], datetime.now(), 100)
        ]
        
        # Mock scraper
        mock_scraper_instance = Mock()
        mock_scraper_instance.get_hot_posts.return_value = mock_posts
        mock_scraper.return_value = mock_scraper_instance
        
        # Mock stock extractor to return no stocks
        mock_extractor_instance = Mock()
        mock_extractor_instance.get_top_mentioned.return_value = {}
        mock_extractor.return_value = mock_extractor_instance
        
        controller = DataController()
        controller.reddit_scraper = mock_scraper_instance
        controller.stock_extractor = mock_extractor_instance
        
        result = controller.process_reddit_data()
        
        # Should return empty list when no stocks found
        self.assertEqual(result, [])
    
    def test_cache_functionality(self):
        """Test caching and cache validation."""
        # Create test stock mentions
        stock_mentions = [
            StockMention("AAPL", 5, 0.5, "Positive", datetime.now()),
            StockMention("TSLA", 3, -0.2, "Negative", datetime.now())
        ]
        
        # Test saving cache
        mock_posts = [RedditPost("1", "test", "test", [], datetime.now(), 100)]
        self.controller._save_cache(stock_mentions, mock_posts)
        
        # Verify cache file exists
        self.assertTrue(os.path.exists(self.test_cache_file))
        
        # Test loading cache
        cached_data = self.controller._load_cache()
        self.assertIsNotNone(cached_data)
        self.assertIn("timestamp", cached_data)
        self.assertIn("stock_mentions", cached_data)
        
        # Test cache validity
        self.assertTrue(self.controller._is_cache_valid(cached_data))
        
        # Test deserialization
        deserialized = self.controller._deserialize_stock_mentions(cached_data["stock_mentions"])
        self.assertEqual(len(deserialized), 2)
        self.assertEqual(deserialized[0].ticker, "AAPL")
        self.assertEqual(deserialized[1].ticker, "TSLA")
    
    def test_cache_expiration(self):
        """Test that expired cache is properly detected."""
        # Create cache data with old timestamp
        old_timestamp = (datetime.now() - timedelta(hours=2)).isoformat()
        cache_data = {
            "timestamp": old_timestamp,
            "stock_mentions": [],
            "post_count": 0
        }
        
        # Save expired cache
        with open(self.test_cache_file, 'w') as f:
            json.dump(cache_data, f)
        
        # Test that cache is detected as invalid
        cached_data = self.controller._load_cache()
        self.assertFalse(self.controller._is_cache_valid(cached_data))
    
    def test_get_cached_data(self):
        """Test getting cached data."""
        # Test with no cache
        result = self.controller.get_cached_data()
        self.assertIsNone(result)
        
        # Create valid cache
        stock_mentions = [StockMention("AAPL", 5, 0.5, "Positive", datetime.now())]
        mock_posts = [RedditPost("1", "test", "test", [], datetime.now(), 100)]
        self.controller._save_cache(stock_mentions, mock_posts)
        
        # Test getting cached data
        result = self.controller.get_cached_data()
        self.assertIsNotNone(result)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].ticker, "AAPL")
    
    def test_force_refresh(self):
        """Test force refresh functionality."""
        # Create initial cache
        stock_mentions = [StockMention("AAPL", 5, 0.5, "Positive", datetime.now())]
        mock_posts = [RedditPost("1", "test", "test", [], datetime.now(), 100)]
        self.controller._save_cache(stock_mentions, mock_posts)
        
        # Verify cache exists
        self.assertTrue(os.path.exists(self.test_cache_file))
        
        # Mock the processing pipeline for force refresh
        with patch.object(self.controller, 'process_reddit_data') as mock_process:
            mock_process.return_value = []
            
            # Force refresh should clear cache and call process_reddit_data
            result = self.controller.force_refresh()
            
            # Cache should be cleared
            self.assertFalse(os.path.exists(self.test_cache_file))
            mock_process.assert_called_once_with(50, 10)
    
    def test_get_processing_status(self):
        """Test getting processing status information."""
        # Test status with no cache
        status = self.controller.get_processing_status()
        
        self.assertIn("reddit_scraper_ready", status)
        self.assertIn("cache_available", status)
        self.assertIn("cache_valid", status)
        self.assertIn("last_update", status)
        self.assertIn("cache_expires", status)
        
        self.assertFalse(status["cache_available"])
        self.assertFalse(status["cache_valid"])
        self.assertIsNone(status["last_update"])
        
        # Create cache and test status
        stock_mentions = [StockMention("AAPL", 5, 0.5, "Positive", datetime.now())]
        mock_posts = [RedditPost("1", "test", "test", [], datetime.now(), 100)]
        self.controller._save_cache(stock_mentions, mock_posts)
        
        status = self.controller.get_processing_status()
        self.assertTrue(status["cache_available"])
        self.assertTrue(status["cache_valid"])
        self.assertIsNotNone(status["last_update"])
        self.assertIsNotNone(status["cache_expires"])
    
    def test_serialization_deserialization(self):
        """Test serialization and deserialization of stock mentions."""
        original_mentions = [
            StockMention("AAPL", 10, 0.75, "Positive", datetime.now()),
            StockMention("TSLA", 5, -0.25, "Negative", datetime.now()),
            StockMention("MSFT", 8, 0.05, "Neutral", datetime.now())
        ]
        
        # Test serialization
        serialized = self.controller._serialize_stock_mentions(original_mentions)
        self.assertEqual(len(serialized), 3)
        self.assertIsInstance(serialized[0], dict)
        self.assertIn("ticker", serialized[0])
        self.assertIn("mention_count", serialized[0])
        self.assertIn("sentiment_score", serialized[0])
        self.assertIn("sentiment_category", serialized[0])
        self.assertIn("last_updated", serialized[0])
        
        # Test deserialization
        deserialized = self.controller._deserialize_stock_mentions(serialized)
        self.assertEqual(len(deserialized), 3)
        
        for i, mention in enumerate(deserialized):
            self.assertIsInstance(mention, StockMention)
            self.assertEqual(mention.ticker, original_mentions[i].ticker)
            self.assertEqual(mention.mention_count, original_mentions[i].mention_count)
            self.assertEqual(mention.sentiment_score, original_mentions[i].sentiment_score)
            self.assertEqual(mention.sentiment_category, original_mentions[i].sentiment_category)
    
    def test_fallback_data(self):
        """Test fallback data functionality."""
        # Test with no cache - should return empty list
        result = self.controller._get_fallback_data()
        self.assertEqual(result, [])
        
        # Create expired cache
        old_timestamp = (datetime.now() - timedelta(hours=2)).isoformat()
        cache_data = {
            "timestamp": old_timestamp,
            "stock_mentions": [
                {
                    "ticker": "AAPL",
                    "mention_count": 5,
                    "sentiment_score": 0.5,
                    "sentiment_category": "Positive",
                    "last_updated": datetime.now().isoformat()
                }
            ],
            "post_count": 10
        }
        
        with open(self.test_cache_file, 'w') as f:
            json.dump(cache_data, f)
        
        # Should return expired cache data as fallback
        result = self.controller._get_fallback_data()
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].ticker, "AAPL")
    
    def test_custom_ticker_management(self):
        """Test adding and removing custom tickers."""
        # Test adding custom tickers
        custom_tickers = ["CUSTOM1", "CUSTOM2"]
        self.controller.add_custom_tickers(custom_tickers)
        
        # Verify add_custom_tickers was called on stock extractor
        self.controller.stock_extractor.add_custom_tickers.assert_called_with(custom_tickers)
        
        # Test removing tickers
        self.controller.remove_tickers(["CUSTOM1"])
        
        # Verify remove_tickers was called on stock extractor
        self.controller.stock_extractor.remove_tickers.assert_called_with(["CUSTOM1"])
    
    @patch('data_controller.RedditScraper')
    @patch('data_controller.StockExtractor')
    @patch('data_controller.SentimentAnalyzer')
    def test_error_handling_in_pipeline(self, mock_sentiment, mock_extractor, mock_scraper):
        """Test error handling in the data processing pipeline."""
        # Mock Reddit posts
        mock_posts = [
            RedditPost("1", "AAPL is great!", "Apple stock rocks", [], datetime.now(), 100)
        ]
        
        # Mock scraper
        mock_scraper_instance = Mock()
        mock_scraper_instance.get_hot_posts.return_value = mock_posts
        mock_scraper.return_value = mock_scraper_instance
        
        # Mock stock extractor
        mock_extractor_instance = Mock()
        mock_extractor_instance.get_top_mentioned.return_value = {"AAPL": 1}
        mock_extractor.return_value = mock_extractor_instance
        
        # Mock sentiment analyzer to raise exception
        mock_sentiment_instance = Mock()
        mock_sentiment_instance.analyze_stock_sentiment.side_effect = Exception("Sentiment analysis failed")
        mock_sentiment.return_value = mock_sentiment_instance
        
        # Create controller with mocked components
        controller = DataController()
        controller.cache_file = self.test_cache_file
        controller.reddit_scraper = mock_scraper_instance
        controller.stock_extractor = mock_extractor_instance
        controller.sentiment_analyzer = mock_sentiment_instance
        
        # Test that pipeline handles errors gracefully
        result = controller.process_reddit_data()
        
        # Should still return a result with neutral sentiment
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].ticker, "AAPL")
        self.assertEqual(result[0].sentiment_category, "Neutral")
        self.assertEqual(result[0].sentiment_score, 0.0)
    
    def test_cache_file_corruption_handling(self):
        """Test handling of corrupted cache files."""
        # Create corrupted cache file
        with open(self.test_cache_file, 'w') as f:
            f.write("invalid json content")
        
        # Should handle corrupted cache gracefully
        cached_data = self.controller._load_cache()
        self.assertIsNone(cached_data)
        
        # Should not crash when checking cache validity
        result = self.controller.get_cached_data()
        self.assertIsNone(result)


if __name__ == '__main__':
    # Run the tests
    unittest.main(verbosity=2)