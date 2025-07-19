import unittest
from unittest.mock import Mock, patch
from datetime import datetime
from reddit_scraper import RedditScraper
from models import RedditPost


class TestRedditScraper(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.scraper = RedditScraper()
    
    def test_initialization(self):
        """Test that RedditScraper initializes correctly."""
        self.assertEqual(self.scraper.user_agent, "RedditSentimentTracker/1.0")
        self.assertTrue(self.scraper.is_authenticated())
        self.assertIsNotNone(self.scraper.session)
    
    @patch('reddit_scraper.requests.Session.get')
    def test_get_hot_posts_success(self, mock_get):
        """Test successful fetching of hot posts."""
        # Mock response
        mock_response = Mock()
        mock_response.json.return_value = {
            'data': {
                'children': [
                    {
                        'kind': 't3',
                        'data': {
                            'id': 'test1',
                            'title': 'AAPL to the moon!',
                            'selftext': 'Apple is great',
                            'score': 100,
                            'created_utc': 1640995200.0,
                            'stickied': False
                        }
                    },
                    {
                        'kind': 't3',
                        'data': {
                            'id': 'test2',
                            'title': 'TSLA discussion',
                            'selftext': '',
                            'score': 50,
                            'created_utc': 1640995100.0,
                            'stickied': False
                        }
                    }
                ]
            }
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        posts = self.scraper.get_hot_posts("wallstreetbets", 10)
        
        self.assertEqual(len(posts), 2)
        self.assertEqual(posts[0].id, 'test1')
        self.assertEqual(posts[0].title, 'AAPL to the moon!')
        self.assertEqual(posts[0].content, 'Apple is great')
        self.assertEqual(posts[0].score, 100)
        self.assertEqual(posts[1].id, 'test2')
        self.assertEqual(posts[1].content, '')
    
    @patch('reddit_scraper.requests.Session.get')
    def test_get_hot_posts_filters_stickied(self, mock_get):
        """Test that stickied posts are filtered out."""
        mock_response = Mock()
        mock_response.json.return_value = {
            'data': {
                'children': [
                    {
                        'kind': 't3',
                        'data': {
                            'id': 'sticky1',
                            'title': 'Pinned post',
                            'selftext': 'This is pinned',
                            'score': 200,
                            'created_utc': 1640995200.0,
                            'stickied': True
                        }
                    },
                    {
                        'kind': 't3',
                        'data': {
                            'id': 'normal1',
                            'title': 'Normal post',
                            'selftext': 'Regular content',
                            'score': 50,
                            'created_utc': 1640995100.0,
                            'stickied': False
                        }
                    }
                ]
            }
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        posts = self.scraper.get_hot_posts("wallstreetbets", 10)
        
        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0].id, 'normal1')
    
    @patch('reddit_scraper.requests.Session.get')
    def test_get_hot_posts_api_error(self, mock_get):
        """Test handling of API errors."""
        mock_get.side_effect = Exception("Network error")
        
        with self.assertRaises(Exception) as context:
            self.scraper.get_hot_posts("wallstreetbets", 10)
        
        self.assertIn("Failed to fetch posts", str(context.exception))
    
    @patch('reddit_scraper.requests.Session.get')
    def test_get_new_posts_success(self, mock_get):
        """Test successful fetching of new posts."""
        mock_response = Mock()
        mock_response.json.return_value = {
            'data': {
                'children': [
                    {
                        'kind': 't3',
                        'data': {
                            'id': 'new1',
                            'title': 'Fresh post',
                            'selftext': 'Just posted',
                            'score': 5,
                            'created_utc': 1640995300.0,
                            'stickied': False
                        }
                    }
                ]
            }
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        posts = self.scraper.get_new_posts("wallstreetbets", 10)
        
        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0].id, 'new1')
        self.assertEqual(posts[0].title, 'Fresh post')
    
    @patch('reddit_scraper.requests.Session.get')
    def test_get_post_comments_success(self, mock_get):
        """Test successful fetching of post comments."""
        mock_response = Mock()
        mock_response.json.return_value = [
            {},  # Post data (first element)
            {
                'data': {
                    'children': [
                        {
                            'kind': 't1',
                            'data': {
                                'body': 'Great analysis!',
                                'author': 'user1'
                            }
                        },
                        {
                            'kind': 't1',
                            'data': {
                                'body': 'I agree',
                                'author': 'user2'
                            }
                        }
                    ]
                }
            }
        ]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        comments = self.scraper.get_post_comments("test_post_id", 50)
        
        self.assertEqual(len(comments), 2)
        self.assertEqual(comments[0], 'Great analysis!')
        self.assertEqual(comments[1], 'I agree')
    
    @patch('reddit_scraper.requests.Session.get')
    def test_get_post_comments_filters_deleted(self, mock_get):
        """Test that deleted comments are filtered out."""
        mock_response = Mock()
        mock_response.json.return_value = [
            {},
            {
                'data': {
                    'children': [
                        {
                            'kind': 't1',
                            'data': {
                                'body': '[deleted]',
                                'author': 'user1'
                            }
                        },
                        {
                            'kind': 't1',
                            'data': {
                                'body': 'Valid comment',
                                'author': 'user2'
                            }
                        },
                        {
                            'kind': 't1',
                            'data': {
                                'body': '[removed]',
                                'author': 'user3'
                            }
                        }
                    ]
                }
            }
        ]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        comments = self.scraper.get_post_comments("test_post_id", 50)
        
        self.assertEqual(len(comments), 1)
        self.assertEqual(comments[0], 'Valid comment')
    
    @patch('reddit_scraper.requests.Session.get')
    def test_get_mixed_feed_success(self, mock_get):
        """Test the mixed feed functionality."""
        # Mock responses for hot and new feeds
        hot_response = Mock()
        hot_response.json.return_value = {
            'data': {
                'children': [
                    {
                        'kind': 't3',
                        'data': {
                            'id': 'hot1',
                            'title': 'Hot post',
                            'selftext': 'Popular content',
                            'score': 100,
                            'created_utc': 1640995200.0,
                            'stickied': False
                        }
                    }
                ]
            }
        }
        
        new_response = Mock()
        new_response.json.return_value = {
            'data': {
                'children': [
                    {
                        'kind': 't3',
                        'data': {
                            'id': 'new1',
                            'title': 'New post',
                            'selftext': 'Fresh content',
                            'score': 5,
                            'created_utc': 1640995300.0,
                            'stickied': False
                        }
                    }
                ]
            }
        }
        
        # Return different responses based on URL
        def side_effect(url, **kwargs):
            if 'hot.json' in url:
                hot_response.raise_for_status.return_value = None
                return hot_response
            elif 'new.json' in url:
                new_response.raise_for_status.return_value = None
                return new_response
        
        mock_get.side_effect = side_effect
        
        posts = self.scraper.get_mixed_feed("wallstreetbets", 10)
        
        self.assertEqual(len(posts), 2)
        # Should be sorted by creation time (newest first)
        self.assertEqual(posts[0].id, 'new1')  # More recent
        self.assertEqual(posts[1].id, 'hot1')  # Older
    
    def test_authentication_status(self):
        """Test authentication status methods."""
        self.assertTrue(self.scraper.is_authenticated())
        self.assertEqual(self.scraper.get_auth_error(), "No authentication required for JSON feeds")


if __name__ == '__main__':
    unittest.main()