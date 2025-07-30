import re
from typing import List, Dict, Set
from collections import Counter
from models import RedditPost


class StockExtractor:
    def __init__(self):
        # Common stock tickers - this is a subset of popular tickers to filter false positives
        # In a production system, this would be loaded from a comprehensive stock database
        self.valid_tickers = {
            # Major tech stocks
            'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE',
            # Financial stocks
            'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'COF',
            # Popular meme stocks and WSB favorites
            'GME', 'AMC', 'BB', 'NOK', 'PLTR', 'WISH', 'CLOV', 'SPCE', 'NIO', 'XPEV',
            # Major indices and ETFs
            'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'ARKK', 'SQQQ', 'TQQQ', 'UVXY', 'VIX',
            # Other popular stocks
            'DIS', 'KO', 'PEP', 'WMT', 'JNJ', 'PG', 'V', 'MA', 'PYPL', 'SQ',
            'F', 'GM', 'UBER', 'LYFT', 'SNAP', 'TWTR', 'PINS', 'ROKU', 'ZM', 'PTON',
            # Crypto-related stocks
            'COIN', 'MSTR', 'RIOT', 'MARA', 'SQ', 'PYPL',
            # Energy and commodities
            'XOM', 'CVX', 'COP', 'SLB', 'HAL', 'OXY', 'MRO', 'DVN', 'FANG', 'EOG',
            # Healthcare and biotech
            'PFE', 'JNJ', 'UNH', 'ABBV', 'TMO', 'DHR', 'ABT', 'BMY', 'LLY', 'MRK',
            # Additional popular tickers
            'BABA', 'JD', 'PDD', 'DIDI', 'LUCID', 'LCID', 'RIVN', 'SOFI', 'HOOD', 'RBLX'
        }
        
        # Regex pattern to match potential stock tickers
        # Matches 1-6 uppercase letters with proper word boundaries
        self.ticker_pattern = re.compile(r'(?:^|[\s$\(\)\[\],/])([A-Z]{1,6})(?=[\s$\(\)\[\],/.!?;:]|$)', re.MULTILINE)
        
        # Common false positives to exclude (words that look like tickers but aren't)
        self.false_positives = {
            # Common English words
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE',
            'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW',
            'OLD', 'SEE', 'TWO', 'WHO', 'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO',
            'USE', 'WAY', 'WIN', 'YES', 'YET', 'BUY', 'WHEN', 'WHAT', 'WHERE', 'WHICH', 'WHILE',
            'WITH', 'WORK', 'WOULD', 'WRITE', 'YEAR', 'YOUR', 'HAVE', 'BEEN', 'THERE', 'THEIR',
            'WILL', 'FROM', 'THEY', 'KNOW', 'WANT', 'BEEN', 'GOOD', 'MUCH', 'SOME', 'TIME',
            'VERY', 'THEN', 'THEM', 'WELL', 'WERE',
            
            # Reddit/WallStreetBets/Finance specific acronyms and slang
            'DD', 'YOLO', 'HODL', 'WSB', 'TA', 'PT', 'EOD', 'AH', 'PM', 'MOON', 'LAMBO', 'TENDIES',
            'EDIT', 'TLDR', 'IMO', 'IMHO', 'FYI', 'BTW', 'ATH', 'ATL', 'YTD', 'QOQ', 'YOY',
            'LOL', 'WTF', 'OMG', 'CEO', 'IPO', 'SEC', 'FDA', 'NYSE', 'NASDAQ', 'ETF', 'REIT',
            'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BTC', 'ETH',
            'CALLS', 'PUTS', 'SELL', 'HOLD', 'DCA', 'FOMO', 'FUD', 'PUMP', 'DUMP',
            'BEAR', 'BULL', 'APE', 'APES', 'RETARD', 'SMOOTH', 'BRAIN', 'DIAMOND', 'HANDS',
            'PAPER', 'ROCKET', 'SQUEEZE', 'SHORT', 'LONG', 'MARGIN', 'LEVERAGE', 'OPTIONS',
            'STRIKE', 'EXPIRY', 'THETA', 'DELTA', 'GAMMA', 'VEGA', 'GREEKS',
            'CREDIT', 'DEBIT', 'SPREAD', 'IRON', 'CONDOR', 'BUTTERFLY', 'STRANGLE', 'STRADDLE',
            'COLLAR', 'COVERED', 'NAKED', 'CASH', 'SECURED', 'PROTECTIVE', 'SYNTHETIC',
            
            # Internet/Social Media acronyms
            'LMAO', 'ROFL', 'SMH', 'IDK', 'IKR', 'IIRC', 'AFAIK', 'ELI5', 'AMA', 'TIL', 'PSA',
            
            # Common abbreviations
            'USA', 'NASA', 'FBI', 'CIA', 'IRS', 'DMV', 'GPS', 'COVID', 'WHO', 'CDC', 'NFL', 'NBA'
        }
    
    def extract_tickers(self, text: str) -> Set[str]:
        """
        Extract potential stock tickers from text using regex patterns.
        
        Args:
            text: Input text to search for stock tickers
            
        Returns:
            Set of valid stock ticker symbols found in the text
        """
        if not text:
            return set()
        
        # Find all potential ticker matches
        matches = self.ticker_pattern.findall(text.upper())
        
        # Filter out false positives and keep only valid tickers
        valid_matches = set()
        for match in matches:
            if (match in self.valid_tickers and 
                match not in self.false_positives and
                len(match) >= 2):  # Minimum 2 characters for valid ticker
                valid_matches.add(match)
        
        return valid_matches
    
    def get_top_mentioned(self, posts: List[RedditPost], limit: int = 10) -> Dict[str, int]:
        """
        Count and rank stock mentions across posts, ensuring single count per post per ticker.
        
        Args:
            posts: List of RedditPost objects to analyze
            limit: Maximum number of top mentioned stocks to return
            
        Returns:
            Dictionary mapping stock tickers to mention counts, sorted by count descending
        """
        ticker_counts = Counter()
        
        for post in posts:
            # Extract tickers from post title and content
            post_tickers = set()
            
            # Check title
            if post.title:
                post_tickers.update(self.extract_tickers(post.title))
            
            # Check content
            if post.content:
                post_tickers.update(self.extract_tickers(post.content))
            
            # Check comments
            for comment in post.comments:
                if comment:
                    post_tickers.update(self.extract_tickers(comment))
            
            # Count each ticker only once per post
            for ticker in post_tickers:
                ticker_counts[ticker] += 1
        
        # Return top mentioned tickers up to the limit
        return dict(ticker_counts.most_common(limit))
    
    def add_custom_tickers(self, tickers: List[str]) -> None:
        """
        Add custom stock tickers to the valid tickers set.
        
        Args:
            tickers: List of ticker symbols to add
        """
        for ticker in tickers:
            if ticker and isinstance(ticker, str):
                self.valid_tickers.add(ticker.upper())
    
    def remove_tickers(self, tickers: List[str]) -> None:
        """
        Remove stock tickers from the valid tickers set.
        
        Args:
            tickers: List of ticker symbols to remove
        """
        for ticker in tickers:
            if ticker and isinstance(ticker, str):
                self.valid_tickers.discard(ticker.upper())
    
    def get_valid_tickers(self) -> Set[str]:
        """
        Get the current set of valid stock tickers.
        
        Returns:
            Set of valid stock ticker symbols
        """
        return self.valid_tickers.copy()