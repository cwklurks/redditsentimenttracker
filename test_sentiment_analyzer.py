import unittest
from datetime import datetime
from sentiment_analyzer import SentimentAnalyzer
from models import RedditPost, SentimentResult


class TestSentimentAnalyzer(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.analyzer = SentimentAnalyzer()
    
    def test_get_sentiment_score_positive_text(self):
        """Test sentiment analysis of clearly positive text."""
        text = "This stock is amazing! Great earnings and fantastic growth potential!"
        result = self.analyzer.get_sentiment_score(text)
        
        self.assertIsInstance(result, SentimentResult)
        self.assertEqual(result.category, "Positive")
        self.assertGreater(result.compound_score, 0.1)
        self.assertGreater(result.positive, 0)
    
    def test_get_sentiment_score_negative_text(self):
        """Test sentiment analysis of clearly negative text."""
        text = "This stock is terrible! Awful earnings and horrible management!"
        result = self.analyzer.get_sentiment_score(text)
        
        self.assertEqual(result.category, "Negative")
        self.assertLess(result.compound_score, -0.1)
        self.assertGreater(result.negative, 0)
    
    def test_get_sentiment_score_neutral_text(self):
        """Test sentiment analysis of neutral text."""
        text = "The stock price is $100. The company reported earnings."
        result = self.analyzer.get_sentiment_score(text)
        
        self.assertEqual(result.category, "Neutral")
        self.assertLessEqual(abs(result.compound_score), 0.1)
    
    def test_get_sentiment_score_empty_text(self):
        """Test sentiment analysis of empty or None text."""
        # Empty string
        result = self.analyzer.get_sentiment_score("")
        self.assertEqual(result.category, "Neutral")
        self.assertEqual(result.compound_score, 0.0)
        
        # None
        result = self.analyzer.get_sentiment_score(None)
        self.assertEqual(result.category, "Neutral")
        self.assertEqual(result.compound_score, 0.0)
        
        # Whitespace only
        result = self.analyzer.get_sentiment_score("   ")
        self.assertEqual(result.category, "Neutral")
        self.assertEqual(result.compound_score, 0.0)
    
    def test_get_sentiment_score_mixed_text(self):
        """Test sentiment analysis of text with mixed sentiment."""
        text = "The stock has good potential but the current price is too high"
        result = self.analyzer.get_sentiment_score(text)
        
        self.assertIsInstance(result, SentimentResult)
        # Mixed sentiment should likely be neutral or slightly positive/negative
        self.assertIsInstance(result.compound_score, float)
        self.assertIn(result.category, ["Positive", "Negative", "Neutral"])
    
    def test_analyze_stock_sentiment_single_mention(self):
        """Test sentiment analysis for a stock with single mention."""
        posts = [
            RedditPost("1", "AAPL is amazing!", "Apple stock is going to the moon!", 
                      [], datetime.now(), 100)
        ]
        
        result = self.analyzer.analyze_stock_sentiment(posts, "AAPL")
        self.assertEqual(result.category, "Positive")
        self.assertGreater(result.compound_score, 0.1)
    
    def test_analyze_stock_sentiment_multiple_mentions(self):
        """Test sentiment analysis for a stock with multiple mentions."""
        posts = [
            RedditPost("1", "TSLA earnings great!", "Tesla had fantastic results", 
                      ["TSLA is the best!"], datetime.now(), 100),
            RedditPost("2", "TSLA discussion", "Tesla stock looks promising", 
                      ["I love TSLA"], datetime.now(), 50)
        ]
        
        result = self.analyzer.analyze_stock_sentiment(posts, "TSLA")
        self.assertEqual(result.category, "Positive")
        self.assertGreater(result.compound_score, 0.1)
    
    def test_analyze_stock_sentiment_mixed_sentiment(self):
        """Test sentiment analysis for a stock with mixed sentiment."""
        posts = [
            RedditPost("1", "GME is amazing!", "GameStop to the moon!", 
                      [], datetime.now(), 100),
            RedditPost("2", "GME is terrible", "GameStop is overvalued and risky", 
                      ["GME will crash"], datetime.now(), 50)
        ]
        
        result = self.analyzer.analyze_stock_sentiment(posts, "GME")
        # Should be neutral or close to neutral due to mixed sentiment
        self.assertIsInstance(result.compound_score, float)
        self.assertIn(result.category, ["Positive", "Negative", "Neutral"])
    
    def test_analyze_stock_sentiment_no_mentions(self):
        """Test sentiment analysis for a stock with no mentions."""
        posts = [
            RedditPost("1", "Market discussion", "General market talk", 
                      ["No specific stocks mentioned"], datetime.now(), 100)
        ]
        
        result = self.analyzer.analyze_stock_sentiment(posts, "AAPL")
        self.assertEqual(result.category, "Neutral")
        self.assertEqual(result.compound_score, 0.0)
    
    def test_analyze_stock_sentiment_case_insensitive(self):
        """Test that stock sentiment analysis is case insensitive."""
        posts = [
            RedditPost("1", "aapl is great!", "apple stock rocks", 
                      ["AAPL to the moon"], datetime.now(), 100)
        ]
        
        # Test with different cases
        result_upper = self.analyzer.analyze_stock_sentiment(posts, "AAPL")
        result_lower = self.analyzer.analyze_stock_sentiment(posts, "aapl")
        result_mixed = self.analyzer.analyze_stock_sentiment(posts, "AaPl")
        
        self.assertEqual(result_upper.category, "Positive")
        self.assertEqual(result_lower.category, "Positive")
        self.assertEqual(result_mixed.category, "Positive")
    
    def test_analyze_multiple_stocks(self):
        """Test analyzing sentiment for multiple stocks at once."""
        posts = [
            RedditPost("1", "AAPL is great!", "Apple is amazing", 
                      [], datetime.now(), 100),
            RedditPost("2", "TSLA is terrible", "Tesla is overvalued", 
                      [], datetime.now(), 50),
            RedditPost("3", "MSFT earnings", "Microsoft reported results", 
                      [], datetime.now(), 75)
        ]
        
        tickers = ["AAPL", "TSLA", "MSFT"]
        results = self.analyzer.analyze_multiple_stocks(posts, tickers)
        
        self.assertEqual(len(results), 3)
        self.assertIn("AAPL", results)
        self.assertIn("TSLA", results)
        self.assertIn("MSFT", results)
        
        # Check that each result is a SentimentResult
        for ticker, result in results.items():
            self.assertIsInstance(result, SentimentResult)
            self.assertIn(result.category, ["Positive", "Negative", "Neutral"])
    
    def test_analyze_multiple_stocks_empty_list(self):
        """Test analyzing multiple stocks with empty ticker list."""
        posts = [
            RedditPost("1", "AAPL is great!", "Apple is amazing", 
                      [], datetime.now(), 100)
        ]
        
        results = self.analyzer.analyze_multiple_stocks(posts, [])
        self.assertEqual(results, {})
    
    def test_get_sentiment_summary(self):
        """Test getting overall sentiment summary across posts."""
        posts = [
            RedditPost("1", "Great day!", "Market is up and looking good", 
                      [], datetime.now(), 100),
            RedditPost("2", "Terrible losses", "Market crashed and I lost money", 
                      [], datetime.now(), 50),
            RedditPost("3", "Market update", "SPY closed at 400", 
                      [], datetime.now(), 75),
            RedditPost("4", "Amazing gains!", "Best trading day ever!", 
                      [], datetime.now(), 200)
        ]
        
        summary = self.analyzer.get_sentiment_summary(posts)
        
        self.assertIn("Positive", summary)
        self.assertIn("Negative", summary)
        self.assertIn("Neutral", summary)
        
        # Should have counts for each category
        total_posts = sum(summary.values())
        self.assertEqual(total_posts, len(posts))
        
        # All counts should be non-negative
        for count in summary.values():
            self.assertGreaterEqual(count, 0)
    
    def test_get_sentiment_summary_empty_posts(self):
        """Test sentiment summary with empty posts list."""
        summary = self.analyzer.get_sentiment_summary([])
        expected = {"Positive": 0, "Negative": 0, "Neutral": 0}
        self.assertEqual(summary, expected)
    
    def test_get_sentiment_summary_posts_without_content(self):
        """Test sentiment summary with posts that have no content."""
        posts = [
            RedditPost("1", "", "", [], datetime.now(), 100),
            RedditPost("2", None, None, [], datetime.now(), 50)
        ]
        
        summary = self.analyzer.get_sentiment_summary(posts)
        # Posts without content should not be counted
        total_posts = sum(summary.values())
        self.assertEqual(total_posts, 0)
    
    def test_sentiment_result_structure(self):
        """Test that SentimentResult has the correct structure."""
        text = "This is a positive statement about stocks!"
        result = self.analyzer.get_sentiment_score(text)
        
        # Check that all required fields are present
        self.assertIsInstance(result.compound_score, float)
        self.assertIsInstance(result.positive, float)
        self.assertIsInstance(result.negative, float)
        self.assertIsInstance(result.neutral, float)
        self.assertIsInstance(result.category, str)
        
        # Check that scores are in valid ranges
        self.assertGreaterEqual(result.compound_score, -1.0)
        self.assertLessEqual(result.compound_score, 1.0)
        self.assertGreaterEqual(result.positive, 0.0)
        self.assertLessEqual(result.positive, 1.0)
        self.assertGreaterEqual(result.negative, 0.0)
        self.assertLessEqual(result.negative, 1.0)
        self.assertGreaterEqual(result.neutral, 0.0)
        self.assertLessEqual(result.neutral, 1.0)
        
        # Category should be one of the expected values
        self.assertIn(result.category, ["Positive", "Negative", "Neutral"])
    
    def test_sentiment_boundary_conditions(self):
        """Test sentiment categorization at boundary conditions."""
        # Test exactly at positive boundary
        # Note: This is tricky to test precisely since VADER scores depend on the text
        # We'll test with text that should be close to boundaries
        
        slightly_positive_texts = [
            "okay stock",
            "decent performance", 
            "not bad earnings"
        ]
        
        slightly_negative_texts = [
            "not great stock",
            "poor performance",
            "disappointing earnings"
        ]
        
        # Test that boundary logic works (even if we can't predict exact scores)
        for text in slightly_positive_texts:
            result = self.analyzer.get_sentiment_score(text)
            self.assertIn(result.category, ["Positive", "Neutral"])
        
        for text in slightly_negative_texts:
            result = self.analyzer.get_sentiment_score(text)
            self.assertIn(result.category, ["Negative", "Neutral"])


if __name__ == '__main__':
    # Run the tests
    unittest.main(verbosity=2)