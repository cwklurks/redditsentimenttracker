import requests
import time
from datetime import datetime
from typing import List, Optional
from models import RedditPost


class RedditScraper:
    def __init__(self, user_agent: str = "RedditSentimentTracker/1.0"):
        """
        Initialize Reddit scraper using JSON feeds (no authentication required).
        
        Args:
            user_agent: User agent string for requests
        """
        self.user_agent = user_agent
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': self.user_agent})
        
        # Rate limiting - be respectful to Reddit
        self.request_delay = 1.0  # seconds between requests
        self.last_request_time = 0
    
    def is_authenticated(self) -> bool:
        """Check if Reddit scraper is ready (always True for JSON feeds)."""
        return True
    
    def get_auth_error(self) -> str:
        """Get authentication error message (none for JSON feeds)."""
        return "No authentication required for JSON feeds"
    
    def _make_request(self, url: str) -> dict:
        """
        Make a rate-limited request to Reddit JSON endpoint.
        
        Args:
            url: Reddit JSON URL to request
            
        Returns:
            Parsed JSON response
            
        Raises:
            Exception: If request fails
        """
        # Rate limiting
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.request_delay:
            time.sleep(self.request_delay - time_since_last)
        
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            self.last_request_time = time.time()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch data from Reddit: {str(e)}")
        except ValueError as e:
            raise Exception(f"Failed to parse Reddit JSON response: {str(e)}")
    
    def get_hot_posts(self, subreddit_name: str = "wallstreetbets", limit: int = 100) -> List[RedditPost]:
        """
        Fetch hot posts from a subreddit using JSON feed with pagination support.
        
        Args:
            subreddit_name: Name of the subreddit to fetch from
            limit: Maximum number of posts to fetch (can exceed 100 with pagination)
            
        Returns:
            List of RedditPost objects
            
        Raises:
            Exception: If fetch fails
        """
        try:
            all_posts = []
            after = None
            posts_per_request = min(100, limit)  # Reddit max is ~100 per request
            
            while len(all_posts) < limit:
                # Calculate how many posts to request this time
                remaining = limit - len(all_posts)
                current_limit = min(posts_per_request, remaining)
                
                # Build URL with pagination
                url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit={current_limit}"
                if after:
                    url += f"&after={after}"
                
                data = self._make_request(url)
                
                if 'data' not in data or 'children' not in data['data']:
                    break
                
                posts_batch = []
                for item in data['data']['children']:
                    if item['kind'] != 't3':  # t3 = link/post
                        continue
                        
                    post_data = item['data']
                    
                    # Skip stickied posts
                    if post_data.get('stickied', False):
                        continue
                    
                    post = RedditPost(
                        id=post_data['id'],
                        title=post_data['title'],
                        content=post_data.get('selftext', '') or '',
                        comments=[],  # Comments fetched separately if needed
                        created_utc=datetime.fromtimestamp(post_data['created_utc']),
                        score=post_data['score']
                    )
                    posts_batch.append(post)
                
                if not posts_batch:
                    break  # No more posts available
                
                all_posts.extend(posts_batch)
                
                # Get pagination token for next request
                after = data['data'].get('after')
                if not after:
                    break  # No more pages
            
            return all_posts[:limit]  # Ensure we don't exceed requested limit
            
        except Exception as e:
            raise Exception(f"Failed to fetch posts from r/{subreddit_name}: {str(e)}")
    
    def get_new_posts(self, subreddit_name: str = "wallstreetbets", limit: int = 100) -> List[RedditPost]:
        """
        Fetch newest posts from a subreddit using JSON feed with pagination support.
        
        Args:
            subreddit_name: Name of the subreddit to fetch from
            limit: Maximum number of posts to fetch (can exceed 100 with pagination)
            
        Returns:
            List of RedditPost objects
        """
        try:
            all_posts = []
            after = None
            posts_per_request = min(100, limit)
            
            while len(all_posts) < limit:
                remaining = limit - len(all_posts)
                current_limit = min(posts_per_request, remaining)
                
                url = f"https://www.reddit.com/r/{subreddit_name}/new.json?limit={current_limit}"
                if after:
                    url += f"&after={after}"
                
                data = self._make_request(url)
                
                if 'data' not in data or 'children' not in data['data']:
                    break
                
                posts_batch = []
                for item in data['data']['children']:
                    if item['kind'] != 't3':
                        continue
                        
                    post_data = item['data']
                    
                    if post_data.get('stickied', False):
                        continue
                    
                    post = RedditPost(
                        id=post_data['id'],
                        title=post_data['title'],
                        content=post_data.get('selftext', '') or '',
                        comments=[],
                        created_utc=datetime.fromtimestamp(post_data['created_utc']),
                        score=post_data['score']
                    )
                    posts_batch.append(post)
                
                if not posts_batch:
                    break
                
                all_posts.extend(posts_batch)
                
                after = data['data'].get('after')
                if not after:
                    break
            
            return all_posts[:limit]
            
        except Exception as e:
            raise Exception(f"Failed to fetch new posts from r/{subreddit_name}: {str(e)}")
    
    def get_post_comments(self, post_id: str, limit: int = 50) -> List[str]:
        """
        Fetch comments for a specific post using JSON feed.
        
        Args:
            post_id: Reddit post ID
            limit: Maximum number of comments to fetch
            
        Returns:
            List of comment text strings
            
        Raises:
            Exception: If fetch fails
        """
        try:
            url = f"https://www.reddit.com/comments/{post_id}.json?limit={limit}"
            data = self._make_request(url)
            
            comments = []
            
            # Reddit comments JSON has a specific structure
            if not isinstance(data, list) or len(data) < 2:
                return comments
            
            # Comments are in the second element of the response
            comments_data = data[1]['data']['children']
            
            for item in comments_data:
                if item['kind'] != 't1':  # t1 = comment
                    continue
                    
                comment_data = item['data']
                comment_body = comment_data.get('body', '')
                
                # Skip deleted/removed comments
                if comment_body in ['[deleted]', '[removed]', '']:
                    continue
                
                comments.append(comment_body)
                
                if len(comments) >= limit:
                    break
            
            return comments
            
        except Exception as e:
            raise Exception(f"Failed to fetch comments for post {post_id}: {str(e)}")
    
    def get_posts_with_comments(self, subreddit_name: str = "wallstreetbets", 
                               post_limit: int = 50, comment_limit: int = 20, 
                               use_new_feed: bool = False) -> List[RedditPost]:
        """
        Fetch posts with their comments included.
        
        Args:
            subreddit_name: Name of the subreddit to fetch from
            post_limit: Maximum number of posts to fetch
            comment_limit: Maximum number of comments per post
            use_new_feed: If True, use /new feed instead of /hot
            
        Returns:
            List of RedditPost objects with comments populated
        """
        if use_new_feed:
            posts = self.get_new_posts(subreddit_name, post_limit)
        else:
            posts = self.get_hot_posts(subreddit_name, post_limit)
        
        # Fetch comments for each post (with rate limiting)
        for post in posts:
            try:
                post.comments = self.get_post_comments(post.id, comment_limit)
            except Exception:
                # If comment fetching fails, continue with empty comments
                post.comments = []
        
        return posts
    
    def get_mixed_feed(self, subreddit_name: str = "wallstreetbets", 
                      total_limit: int = 50) -> List[RedditPost]:
        """
        Get a mix of hot and new posts for better sentiment analysis.
        
        Args:
            subreddit_name: Name of the subreddit to fetch from
            total_limit: Total number of posts to return
            
        Returns:
            List of RedditPost objects mixed from hot and new feeds
        """
        try:
            # Get 70% from hot (better engagement) and 30% from new (recent sentiment)
            hot_limit = int(total_limit * 0.7)
            new_limit = total_limit - hot_limit
            
            hot_posts = self.get_hot_posts(subreddit_name, hot_limit)
            new_posts = self.get_new_posts(subreddit_name, new_limit)
            
            # Combine and remove duplicates by ID
            seen_ids = set()
            mixed_posts = []
            
            for post in hot_posts + new_posts:
                if post.id not in seen_ids:
                    seen_ids.add(post.id)
                    mixed_posts.append(post)
            
            # Sort by creation time (newest first) and limit
            mixed_posts.sort(key=lambda x: x.created_utc, reverse=True)
            return mixed_posts[:total_limit]
            
        except Exception as e:
            # Fallback to just hot posts
            return self.get_hot_posts(subreddit_name, total_limit)