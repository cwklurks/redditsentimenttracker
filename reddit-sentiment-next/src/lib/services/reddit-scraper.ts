// Port of Python reddit_scraper.py to TypeScript

import { RedditPost } from '@/types';

export class RedditScraper {
  private userAgent: string;
  private requestDelay: number;
  private lastRequestTime: number;

  constructor(userAgent: string = 'RedditSentimentTracker/1.0') {
    this.userAgent = userAgent;
    this.requestDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
  }

  isAuthenticated(): boolean {
    return true; // Always true for JSON feeds
  }

  getAuthError(): string {
    return 'No authentication required for JSON feeds';
  }

  private async makeRequest(url: string): Promise<any> {
    // Rate limiting
    const currentTime = Date.now();
    const timeSinceLast = currentTime - this.lastRequestTime;
    if (timeSinceLast < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLast));
    }

    console.log('Making request to:', url);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
        cache: 'no-store', // Disable caching for now to debug
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Reddit API error:', errorText);
        throw new Error(`Failed to fetch data from Reddit: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Successfully fetched data, posts count:', data?.data?.children?.length || 0);
      
      this.lastRequestTime = Date.now();
      return data;
    } catch (error) {
      console.error('Request error:', error);
      throw error;
    }
  }

  async getHotPosts(subredditName: string = 'wallstreetbets', limit: number = 100): Promise<RedditPost[]> {
    try {
      const allPosts: RedditPost[] = [];
      let after: string | null = null;
      const postsPerRequest = Math.min(100, limit);

      while (allPosts.length < limit) {
        const remaining = limit - allPosts.length;
        const currentLimit = Math.min(postsPerRequest, remaining);

        let url = `https://www.reddit.com/r/${subredditName}/hot.json?limit=${currentLimit}`;
        if (after) {
          url += `&after=${after}`;
        }

        const data = await this.makeRequest(url);

        if (!data?.data?.children) {
          break;
        }

        const postsBatch: RedditPost[] = [];
        for (const item of data.data.children) {
          if (item.kind !== 't3') continue; // t3 = link/post

          const postData = item.data;
          
          // Skip stickied posts
          if (postData.stickied) continue;

          const post: RedditPost = {
            id: postData.id,
            title: postData.title,
            content: postData.selftext || '',
            comments: [], // Comments fetched separately if needed
            created_utc: new Date(postData.created_utc * 1000),
            score: postData.score,
          };
          postsBatch.push(post);
        }

        if (postsBatch.length === 0) break;

        allPosts.push(...postsBatch);

        // Get pagination token for next request
        after = data.data.after;
        if (!after) break;
      }

      return allPosts.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to fetch posts from r/${subredditName}: ${error}`);
    }
  }

  async getNewPosts(subredditName: string = 'wallstreetbets', limit: number = 100): Promise<RedditPost[]> {
    try {
      const allPosts: RedditPost[] = [];
      let after: string | null = null;
      const postsPerRequest = Math.min(100, limit);

      while (allPosts.length < limit) {
        const remaining = limit - allPosts.length;
        const currentLimit = Math.min(postsPerRequest, remaining);

        let url = `https://www.reddit.com/r/${subredditName}/new.json?limit=${currentLimit}`;
        if (after) {
          url += `&after=${after}`;
        }

        const data = await this.makeRequest(url);

        if (!data?.data?.children) {
          break;
        }

        const postsBatch: RedditPost[] = [];
        for (const item of data.data.children) {
          if (item.kind !== 't3') continue;

          const postData = item.data;
          
          if (postData.stickied) continue;

          const post: RedditPost = {
            id: postData.id,
            title: postData.title,
            content: postData.selftext || '',
            comments: [],
            created_utc: new Date(postData.created_utc * 1000),
            score: postData.score,
          };
          postsBatch.push(post);
        }

        if (postsBatch.length === 0) break;

        allPosts.push(...postsBatch);

        after = data.data.after;
        if (!after) break;
      }

      return allPosts.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to fetch new posts from r/${subredditName}: ${error}`);
    }
  }

  async getPostComments(postId: string, limit: number = 50): Promise<string[]> {
    try {
      const url = `https://www.reddit.com/comments/${postId}.json?limit=${limit}`;
      const data = await this.makeRequest(url);

      const comments: string[] = [];

      if (!Array.isArray(data) || data.length < 2) {
        return comments;
      }

      // Comments are in the second element of the response
      const commentsData = data[1]?.data?.children;
      if (!commentsData) return comments;

      for (const item of commentsData) {
        if (item.kind !== 't1') continue; // t1 = comment

        const commentData = item.data;
        const commentBody = commentData.body;

        // Skip deleted/removed comments
        if (!commentBody || commentBody === '[deleted]' || commentBody === '[removed]') {
          continue;
        }

        comments.push(commentBody);

        if (comments.length >= limit) {
          break;
        }
      }

      return comments;
    } catch (error) {
      throw new Error(`Failed to fetch comments for post ${postId}: ${error}`);
    }
  }

  async getPostsWithComments(
    subredditName: string = 'wallstreetbets',
    postLimit: number = 50,
    commentLimit: number = 20,
    useNewFeed: boolean = false
  ): Promise<RedditPost[]> {
    const posts = useNewFeed
      ? await this.getNewPosts(subredditName, postLimit)
      : await this.getHotPosts(subredditName, postLimit);

    // Fetch comments for each post (with rate limiting)
    for (const post of posts) {
      try {
        post.comments = await this.getPostComments(post.id, commentLimit);
      } catch (error) {
        // If comment fetching fails, continue with empty comments
        post.comments = [];
      }
    }

    return posts;
  }

  async getMixedFeed(subredditName: string = 'wallstreetbets', totalLimit: number = 50): Promise<RedditPost[]> {
    try {
      // Get 70% from hot (better engagement) and 30% from new (recent sentiment)
      const hotLimit = Math.floor(totalLimit * 0.7);
      const newLimit = totalLimit - hotLimit;

      const [hotPosts, newPosts] = await Promise.all([
        this.getHotPosts(subredditName, hotLimit),
        this.getNewPosts(subredditName, newLimit),
      ]);

      // Combine and remove duplicates by ID
      const seenIds = new Set<string>();
      const mixedPosts: RedditPost[] = [];

      for (const post of [...hotPosts, ...newPosts]) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          mixedPosts.push(post);
        }
      }

      // Sort by creation time (newest first) and limit
      mixedPosts.sort((a, b) => b.created_utc.getTime() - a.created_utc.getTime());
      return mixedPosts.slice(0, totalLimit);
    } catch (error) {
      // Fallback to just hot posts
      return this.getHotPosts(subredditName, totalLimit);
    }
  }
}