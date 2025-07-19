import unittest
from datetime import datetime
from stock_extractor import StockExtractor
from models import RedditPost


class TestStockExtractor(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.extractor = StockExtractor()
    
    def test_extract_tickers_basic_symbols(self):
        """Test extraction of basic stock symbols."""
        text = "I'm bullish on AAPL and TSLA for the long term"
        tickers = self.extractor.extract_tickers(text)
        self.assertEqual(tickers, {'AAPL', 'TSLA'})
    
    def test_extract_tickers_with_dollar_signs(self):
        """Test extraction of tickers with dollar sign prefix."""
        text = "Bought $GME at $150 and $AMC at $20"
        tickers = self.extractor.extract_tickers(text)
        self.assertEqual(tickers, {'GME', 'AMC'})
    
    def test_extract_tickers_mixed_case(self):
        """Test that mixed case tickers are normalized to uppercase."""
        text = "Looking at aapl, Tsla, and gme today"
        tickers = self.extractor.extract_tickers(text)
        self.assertEqual(tickers, {'AAPL', 'TSLA', 'GME'})
    
    def test_extract_tickers_filters_false_positives(self):
        """Test that common false positives are filtered out."""
        text = "I CAN see THE stock going UP but NOT down"
        tickers = self.extractor.extract_tickers(text)
        self.assertEqual(tickers, set())  # Should be empty as these are false positives
    
    def test_extract_tickers_filters_invalid_tickers(self):
        """Test that invalid tickers not in the valid set are filtered out."""
        text = "FAKE and INVALID are not real tickers but AAPL is"
        tickers = self.extractor.extract_tickers(text)
        self.assertEqual(tickers, {'AAPL'})
    
    def test_extract_tickers_minimum_length(self):
        """Test that single character matches are filtered out."""
        text = "I bought A share of AAPL"
        tickers = self.extractor.extract_tickers(text)
        self.assertEqual(tickers, {'AAPL'})  # 'A' should be filtered out
    
    def test_extract_tickers_empty_text(self):
        """Test extraction from empty or None text."""
        self.assertEqual(self.extractor.extract_tickers(""), set())
        self.assertEqual(self.extractor.extract_tickers(None), set())
    
    def test_extract_tickers_complex_text(self):
        """Test extraction from complex text with various formats."""
        text = """
        DD: Why $TSLA is going to the moon 🚀
        
        I've been analyzing AAPL vs MSFT and I think GOOGL is undervalued.
        My positions: $GME (100 shares), AMC calls, and some SPY puts.
        
        What do you think about NVDA? I heard THE CEO is bullish BUT I'm NOT sure.
        """
        tickers = self.extractor.extract_tickers(text)
        expected = {'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'GME', 'AMC', 'SPY', 'NVDA'}
        self.assertEqual(tickers, expected)
    
    def test_get_top_mentioned_basic(self):
        """Test basic functionality of get_top_mentioned."""
        posts = [
            RedditPost("1", "AAPL to the moon", "Buying more AAPL", [], datetime.now(), 100),
            RedditPost("2", "TSLA earnings", "TSLA looks good", [], datetime.now(), 50),
            RedditPost("3", "AAPL vs MSFT", "AAPL better than MSFT", [], datetime.now(), 75)
        ]
        
        result = self.extractor.get_top_mentioned(posts)
        expected = {'AAPL': 2, 'TSLA': 1, 'MSFT': 1}
        self.assertEqual(result, expected)
    
    def test_get_top_mentioned_single_count_per_post(self):
        """Test that each ticker is counted only once per post."""
        posts = [
            RedditPost("1", "AAPL AAPL AAPL", "More AAPL talk", ["AAPL is great"], datetime.now(), 100)
        ]
        
        result = self.extractor.get_top_mentioned(posts)
        self.assertEqual(result, {'AAPL': 1})  # Should be 1, not 4
    
    def test_get_top_mentioned_with_comments(self):
        """Test that comments are included in ticker extraction."""
        posts = [
            RedditPost("1", "Market discussion", "What do you think?", 
                      ["I like AAPL", "TSLA is better", "GME to the moon"], datetime.now(), 100)
        ]
        
        result = self.extractor.get_top_mentioned(posts)
        expected = {'AAPL': 1, 'TSLA': 1, 'GME': 1}
        self.assertEqual(result, expected)
    
    def test_get_top_mentioned_limit(self):
        """Test that the limit parameter works correctly."""
        posts = []
        tickers = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META']
        
        for i, ticker in enumerate(tickers):
            posts.append(RedditPost(str(i), f"{ticker} discussion", f"Talking about {ticker}", 
                                  [], datetime.now(), 100))
        
        result = self.extractor.get_top_mentioned(posts, limit=3)
        self.assertEqual(len(result), 3)
    
    def test_get_top_mentioned_empty_posts(self):
        """Test behavior with empty posts list."""
        result = self.extractor.get_top_mentioned([])
        self.assertEqual(result, {})
    
    def test_get_top_mentioned_posts_with_no_tickers(self):
        """Test behavior with posts containing no valid tickers."""
        posts = [
            RedditPost("1", "General discussion", "No tickers here", 
                      ["Just talking about THE market"], datetime.now(), 100)
        ]
        
        result = self.extractor.get_top_mentioned(posts)
        self.assertEqual(result, {})
    
    def test_add_custom_tickers(self):
        """Test adding custom tickers to the valid set."""
        original_count = len(self.extractor.valid_tickers)
        self.extractor.add_custom_tickers(['CUSTOM', 'TEST'])
        
        self.assertIn('CUSTOM', self.extractor.valid_tickers)
        self.assertIn('TEST', self.extractor.valid_tickers)
        self.assertEqual(len(self.extractor.valid_tickers), original_count + 2)
        
        # Test extraction with custom ticker
        text = "I bought CUSTOM stock today"
        tickers = self.extractor.extract_tickers(text)
        self.assertIn('CUSTOM', tickers)
    
    def test_remove_tickers(self):
        """Test removing tickers from the valid set."""
        # Add a ticker first
        self.extractor.add_custom_tickers(['TEMP'])
        self.assertIn('TEMP', self.extractor.valid_tickers)
        
        # Remove it
        self.extractor.remove_tickers(['TEMP'])
        self.assertNotIn('TEMP', self.extractor.valid_tickers)
        
        # Test that it's no longer extracted
        text = "TEMP is not valid anymore"
        tickers = self.extractor.extract_tickers(text)
        self.assertNotIn('TEMP', tickers)
    
    def test_get_valid_tickers(self):
        """Test getting the valid tickers set."""
        valid_tickers = self.extractor.get_valid_tickers()
        self.assertIsInstance(valid_tickers, set)
        self.assertIn('AAPL', valid_tickers)
        self.assertIn('TSLA', valid_tickers)
        
        # Ensure it's a copy (modifying it shouldn't affect the original)
        original_count = len(self.extractor.valid_tickers)
        valid_tickers.add('SHOULD_NOT_AFFECT_ORIGINAL')
        self.assertEqual(len(self.extractor.valid_tickers), original_count)
    
    def test_ticker_extraction_edge_cases(self):
        """Test various edge cases for ticker extraction."""
        test_cases = [
            ("AAPL.", {'AAPL'}),  # Ticker followed by punctuation
            ("(TSLA)", {'TSLA'}),  # Ticker in parentheses
            ("MSFT,GOOGL", {'MSFT', 'GOOGL'}),  # Comma separated
            ("AAPL/TSLA", {'AAPL', 'TSLA'}),  # Slash separated
            ("$AAPL $TSLA $MSFT", {'AAPL', 'TSLA', 'MSFT'}),  # Multiple with dollar signs
            ("AAPL123", set()),  # Ticker with numbers (should not match)
            ("123AAPL", set()),  # Numbers before ticker (should not match)
        ]
        
        for text, expected in test_cases:
            with self.subTest(text=text):
                result = self.extractor.extract_tickers(text)
                self.assertEqual(result, expected, f"Failed for text: '{text}'")


if __name__ == '__main__':
    # Run the tests
    unittest.main(verbosity=2)