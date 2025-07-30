import { RedditPost } from '@/types';

export class RedditScraperError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'RedditScraperError';
  }
}

export class RedditScraper {
  private readonly subreddit = 'wallstreetbets';
  private readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
  ];
  private currentUserAgentIndex = 0;
  private lastRequestTime = 0;
  private readonly requestDelay = 2000; // 2 seconds between requests
  private readonly maxRetries = 3;
  
  // Backup APIs for when Reddit blocks us
  private readonly backupApis = [
    'https://api.reddiw.com', // Alternative Reddit API
    // Add more backup APIs as needed
  ];
  private currentApiIndex = 0;
  
  async fetchPosts(postLimit: number = 25): Promise<RedditPost[]> {
    console.log(`🎯 Fetching ${postLimit} posts from r/${this.subreddit}`);
    
    // Try multiple methods in order of reliability
    const methods = [
      () => this.fetchViaJsonEndpoint(postLimit),
      () => this.fetchViaBackupApi(postLimit),
      () => this.fetchViaWebScraping(postLimit)
    ];
    
    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`📡 Attempting method ${i + 1}/3`);
        const posts = await methods[i]();
        
        if (posts && posts.length > 0) {
          console.log(`✅ Successfully fetched ${posts.length} posts using method ${i + 1}`);
          return posts.slice(0, postLimit);
        }
      } catch (error) {
        console.warn(`❌ Method ${i + 1} failed:`, error);
        
        if (i < methods.length - 1) {
          console.log(`🔄 Trying next method...`);
          await this.delay(1000);
        }
      }
    }
    
    throw new RedditScraperError('All fetching methods failed');
  }
  
  // Method 1: Reddit's .json endpoint (most reliable)
  private async fetchViaJsonEndpoint(postLimit: number): Promise<RedditPost[]> {
    console.log('🔗 Using Reddit .json endpoint method');
    
    const posts: RedditPost[] = [];
    const feedTypes = ['hot', 'new', 'top'];
    let currentFeedIndex = 0;
    
    while (posts.length < postLimit && currentFeedIndex < feedTypes.length) {
      const feedType = feedTypes[currentFeedIndex];
      
      try {
        await this.respectRateLimit();
        
        const url = `https://www.reddit.com/r/${this.subreddit}/${feedType}.json?limit=25`;
        console.log(`📥 Fetching from: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.getRotatedUserAgent(),
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });
        
        if (response.status === 429) {
          console.warn('⚠️ Rate limited, waiting longer...');
          await this.delay(10000); // Wait 10 seconds
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const newPosts = this.parseRedditJsonResponse(data);
        
        // Filter out duplicates
        const uniquePosts = newPosts.filter(newPost => 
          !posts.some(existingPost => existingPost.id === newPost.id)
        );
        
        posts.push(...uniquePosts);
        console.log(`📊 Got ${uniquePosts.length} new posts from ${feedType}, total: ${posts.length}`);
        
        currentFeedIndex++;
        
        if (currentFeedIndex < feedTypes.length) {
          await this.delay(3000); // Wait between feeds
        }
        
      } catch (error) {
        console.warn(`Failed to fetch ${feedType}:`, error);
        currentFeedIndex++;
      }
    }
    
    return posts.slice(0, postLimit);
  }
  
  // Method 2: Backup API (Reddiw)
  private async fetchViaBackupApi(postLimit: number): Promise<RedditPost[]> {
    console.log('🔄 Using backup API method');
    
    const backupApi = this.backupApis[this.currentApiIndex];
    
    try {
      await this.respectRateLimit();
      
      const url = `${backupApi}/r/${this.subreddit}/hot`;
      console.log(`📥 Fetching from backup API: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.getRotatedUserAgent(),
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Backup API failed: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseRedditJsonResponse(data);
      
    } catch (error) {
      console.warn('Backup API failed:', error);
      throw error;
    }
  }
  
  // Method 3: Web scraping fallback
  private async fetchViaWebScraping(postLimit: number): Promise<RedditPost[]> {
    console.log('🕷️ Using web scraping method');
    
    try {
      await this.respectRateLimit();
      
      const url = `https://www.reddit.com/r/${this.subreddit}/hot/`;
      console.log(`📥 Scraping from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.getRotatedUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Scraping failed: ${response.status}`);
      }
      
      const html = await response.text();
      return this.parseRedditHtml(html, postLimit);
      
    } catch (error) {
      console.warn('Web scraping failed:', error);
      throw error;
    }
  }
  
  private parseRedditJsonResponse(data: any): RedditPost[] {
    if (!data?.data?.children) {
      console.warn('Invalid Reddit JSON response format');
      return [];
    }
    
    const posts: RedditPost[] = [];
    
    for (const item of data.data.children) {
      if (item.kind !== 't3') continue; // Only process link posts
      
      const postData = item.data;
      
      // Skip pinned/stickied posts
      if (postData.stickied || postData.pinned) continue;
      
      // Skip posts without content
      if (!postData.title) continue;
      
      const post: RedditPost = {
        id: postData.id,
        title: postData.title,
        content: postData.selftext || '',
        comments: [], // We'll skip comments to avoid rate limiting
        created_utc: new Date(postData.created_utc * 1000),
        score: postData.score || 0,
      };
      
      posts.push(post);
    }
    
    return posts;
  }
  
  private parseRedditHtml(html: string, limit: number): RedditPost[] {
    // Simple HTML parsing for post titles and basic info
    const posts: RedditPost[] = [];
    
    // Look for post titles in the HTML
    const titleRegex = /<h3[^>]*class="[^"]*Post[^"]*"[^>]*>.*?<a[^>]*href="\/r\/\w+\/comments\/([^\/]+)\/[^"]*"[^>]*>([^<]+)<\/a>/gi;
    
    let match;
    let count = 0;
    
    while ((match = titleRegex.exec(html)) !== null && count < limit) {
      const postId = match[1];
      const title = match[2].trim();
      
      if (postId && title) {
        posts.push({
          id: postId,
          title: title,
          content: '',
          comments: [],
          created_utc: new Date(),
          score: 0,
        });
        count++;
      }
    }
    
    console.log(`🔍 Extracted ${posts.length} posts from HTML`);
    return posts;
  }
  
  private getRotatedUserAgent(): string {
    const agent = this.userAgents[this.currentUserAgentIndex];
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
    return agent;
  }
  

  
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms`);
      await this.delay(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
}