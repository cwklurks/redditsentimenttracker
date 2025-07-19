from dataclasses import dataclass
from datetime import datetime
from typing import List


@dataclass
class StockMention:
    ticker: str
    mention_count: int
    sentiment_score: float
    sentiment_category: str
    last_updated: datetime


@dataclass
class RedditPost:
    id: str
    title: str
    content: str
    comments: List[str]
    created_utc: datetime
    score: int


@dataclass
class SentimentResult:
    compound_score: float
    positive: float
    negative: float
    neutral: float
    category: str