import os
import time
from datetime import datetime
from typing import List, Optional, Tuple

import requests
try:
    # Optional: higher-fidelity HTTP client that can impersonate a browser (helps behind Cloudflare)
    from curl_cffi import requests as cffi_requests  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    cffi_requests = None  # type: ignore

from models import RedditPost


class RedditScraper:
    def __init__(self, user_agent: str = "web:reddit-sentiment-tracker:1.0 (https://redditsentiment.streamlit.app)"):
        """
        Initialize Reddit scraper using JSON feeds (no authentication required).
        
        Args:
            user_agent: User agent string for requests
        """
        # Allow overriding UA via environment (Streamlit secrets can map to env)
        self.user_agent = os.getenv("REDDIT_USER_AGENT", user_agent)
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": self.user_agent,
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
            }
        )
        
        # Optional curl-cffi session for environments blocked by Reddit/Cloudflare
        self.cffi_session = None
        if cffi_requests is not None:
            try:
                self.cffi_session = cffi_requests.Session()
                # Impersonate a modern Chrome; enable http2 for realism
                self.cffi_session.impersonate = os.getenv("CFFI_IMPERSONATE", "chrome").lower()
                self.cffi_session.headers.update(
                    {
                        "User-Agent": self.user_agent,
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.9",
                    }
                )
            except Exception:
                self.cffi_session = None
        
        # Rate limiting - be respectful to Reddit
        self.request_delay = 1.0  # seconds between requests
        self.last_request_time = 0
        
        # Diagnostics (surfaced in UI to help debug Streamlit Cloud issues)
        self.last_url: Optional[str] = None
        self.last_http_status: Optional[int] = None
        self.last_error_message: Optional[str] = None
    
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
        # Rate limiting and simple exponential backoff for 429/403/503
        backoff_seconds = 0.0
        for attempt in range(5):
            # Respect inter-request delay
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            if time_since_last < self.request_delay:
                time.sleep(self.request_delay - time_since_last)

            if backoff_seconds > 0:
                time.sleep(backoff_seconds)

            try:
                self.last_url = url
                response = self.session.get(url, timeout=20)
                self.last_http_status = response.status_code

                # Backoff on common block codes
                if response.status_code in (429, 403, 503):
                    backoff_seconds = max(1.5, (backoff_seconds * 2) if backoff_seconds else 1.5)
                    continue

                response.raise_for_status()
                self.last_request_time = time.time()
                self.last_error_message = None
                return response.json()
            except requests.exceptions.RequestException as e:
                self.last_error_message = f"Request error: {e}"
                # Transient network errors: try again with backoff
                backoff_seconds = max(1.5, (backoff_seconds * 2) if backoff_seconds else 1.5)
                continue
            except ValueError as e:
                self.last_error_message = f"JSON parse error: {e}"
                # Do not retry indefinitely on JSON errors
                break

        # If the regular client failed, try curl-cffi as a last resort (often bypasses 403/429)
        if self.cffi_session is not None:
            try:
                self.last_url = url
                resp = self.cffi_session.get(url, timeout=20)
                self.last_http_status = getattr(resp, "status_code", None)
                # curl-cffi raises for HTTP errors similar to requests when calling .raise_for_status()
                resp.raise_for_status()
                self.last_request_time = time.time()
                self.last_error_message = None
                return resp.json()
            except Exception as e:
                self.last_error_message = f"curl-cffi fallback error: {e}"

        raise Exception(
            f"Failed to fetch data from Reddit after retries (status={self.last_http_status}, url={self.last_url}). "
            f"Last error: {self.last_error_message}"
        )

    def _build_listing_urls(self, subreddit_name: str, listing: str, current_limit: int, after: Optional[str]) -> List[str]:
        """Construct a small set of candidate URLs to try in order."""
        params = f"limit={current_limit}&raw_json=1"
        if after:
            params += f"&after={after}"
        # Try api.reddit.com first; then fallback to www
        return [
            f"https://api.reddit.com/r/{subreddit_name}/{listing}?{params}",
            f"https://www.reddit.com/r/{subreddit_name}/{listing}.json?{params}",
        ]
    
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
                
                # Try a couple of endpoints (api.reddit.com then www)
                data = None
                for candidate_url in self._build_listing_urls(subreddit_name, "hot", current_limit, after):
                    try:
                        data = self._make_request(candidate_url)
                        break
                    except Exception:
                        # Try the next candidate
                        data = None
                        continue
                if data is None:
                    raise Exception(
                        f"All endpoints failed for r/{subreddit_name} hot listing (last status={self.last_http_status})"
                    )
                
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
                
                data = None
                for candidate_url in self._build_listing_urls(subreddit_name, "new", current_limit, after):
                    try:
                        data = self._make_request(candidate_url)
                        break
                    except Exception:
                        data = None
                        continue
                if data is None:
                    raise Exception(
                        f"All endpoints failed for r/{subreddit_name} new listing (last status={self.last_http_status})"
                    )
                
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
            # Try api first, then www
            data = None
            for url in [
                f"https://api.reddit.com/comments/{post_id}?limit={limit}&raw_json=1",
                f"https://www.reddit.com/comments/{post_id}.json?limit={limit}&raw_json=1",
            ]:
                try:
                    data = self._make_request(url)
                    break
                except Exception:
                    data = None
                    continue
            if data is None:
                raise Exception(
                    f"All endpoints failed for comments on {post_id} (last status={self.last_http_status})"
                )
            
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