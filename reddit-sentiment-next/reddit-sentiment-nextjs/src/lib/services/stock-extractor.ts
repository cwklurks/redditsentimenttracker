const VALID_TICKERS = new Set([
  // Major US stocks commonly mentioned on WSB
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA', 'AMD', 'INTC',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'V', 'MA', 'PYPL', 'SQ',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'SCHD', 'SCHA', 'SCHB', 'SCHX',
  'GME', 'AMC', 'BB', 'NOK', 'PLTR', 'NIO', 'XPEV', 'LI', 'BABA', 'JD',
  'F', 'GM', 'TLRY', 'APHA', 'CGC', 'ACB', 'SNDL', 'HEXO', 'OGI', 'CRON',
  'RIOT', 'MARA', 'COIN', 'SQ', 'HOOD', 'SOFI', 'UPST', 'AFRM', 'OPEN', 'RDFN',
  'ARKK', 'ARKQ', 'ARKW', 'ARKG', 'ARKF', 'ICLN', 'QCLN', 'PBW', 'SMOG', 'FAN',
  'XLF', 'XLK', 'XLE', 'XLI', 'XLV', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLY',
  'SPCE', 'RKLB', 'ASTR', 'PL', 'MAXR', 'BKNG', 'ABNB', 'UBER', 'LYFT', 'DASH',
  'SHOP', 'ETSY', 'EBAY', 'WMT', 'TGT', 'COST', 'HD', 'LOW', 'NKE', 'LULU'
]);

const EXCLUDED_WORDS = new Set([
  // Common English words
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR',
  'HAD', 'BY', 'WORD', 'BUT', 'WHAT', 'SOME', 'WE', 'CAN', 'OUT', 'OTHER', 'WERE', 'WHICH',
  'DO', 'THEIR', 'TIME', 'IF', 'WILL', 'HOW', 'SAID', 'AN', 'EACH', 'TELL', 'DOES',
  'SET', 'THREE', 'WANT', 'AIR', 'WELL', 'ALSO', 'PLAY', 'SMALL', 'END', 'PUT', 'HOME',
  'READ', 'HAND', 'PORT', 'LARGE', 'SPELL', 'ADD', 'EVEN', 'LAND', 'HERE', 'MUST',
  'BIG', 'HIGH', 'SUCH', 'FOLLOW', 'ACT', 'WHY', 'ASK', 'MEN', 'CHANGE', 'WENT',
  'LIGHT', 'KIND', 'OFF', 'NEED', 'HOUSE', 'PICTURE', 'TRY', 'US', 'AGAIN', 'ANIMAL',
  'POINT', 'MOTHER', 'WORLD', 'NEAR', 'BUILD', 'SELF', 'EARTH', 'FATHER', 'HEAD', 'STAND',
  'OWN', 'PAGE', 'SHOULD', 'COUNTRY', 'FOUND', 'ANSWER', 'SCHOOL', 'GROW', 'STUDY', 'STILL',
  'LEARN', 'PLANT', 'COVER', 'FOOD', 'SUN', 'FOUR', 'BETWEEN', 'STATE', 'KEEP', 'EYE',
  'NEVER', 'LAST', 'LET', 'THOUGHT', 'CITY', 'TREE', 'CROSS', 'FARM', 'HARD', 'START',
  'MIGHT', 'STORY', 'SAW', 'FAR', 'SEA', 'DRAW', 'LEFT', 'LATE', 'RUN', 'WHILE', 'PRESS',
  'CLOSE', 'NIGHT', 'REAL', 'LIFE', 'FEW', 'NORTH', 'OPEN', 'SEEM', 'TOGETHER', 'NEXT',
  'WHITE', 'CHILDREN', 'SIDE', 'FEET', 'CAR', 'MILE', 'WALK', 'EXAMPLE', 'EASE', 'PAPER',
  'GROUP', 'ALWAYS', 'MUSIC', 'THOSE', 'BOTH', 'MARK', 'OFTEN', 'LETTER', 'UNTIL', 'RIVER',
  'SCHOOL', 'TREE', 'BEGAN', 'GROW', 'TOOK', 'RIVER', 'FOUR', 'CARRY', 'STATE', 'ONCE',
  'BOOK', 'HEAR', 'STOP', 'WITHOUT', 'SECOND', 'LATER', 'MISS', 'IDEA', 'ENOUGH', 'EAT',
  'FACE', 'WATCH', 'FAR', 'INDIAN', 'REALLY', 'ALMOST', 'SOMETHING', 'TALK', 'SONG', 'BEING',
  'LEAVE', 'FAMILY', 'IT\'S',
  
  // Reddit/WallStreetBets/Finance specific acronyms and slang
  'DD', 'YOLO', 'HODL', 'WSB', 'TA', 'PT', 'EOD', 'AH', 'PM', 'MOON', 'LAMBO', 'TENDIES',
  'EDIT', 'TLDR', 'TL;DR', 'IMO', 'IMHO', 'FYI', 'BTW', 'ATH', 'ATL', 'YTD', 'QOQ', 'YOY',
  'LOL', 'WTF', 'OMG', 'CEO', 'IPO', 'SEC', 'FDA', 'NYSE', 'NASDAQ', 'ETF', 'REIT',
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BTC', 'ETH',
  'CALLS', 'PUTS', 'BUY', 'SELL', 'HOLD', 'DCA', 'FOMO', 'FUD', 'PUMP', 'DUMP',
  'BEAR', 'BULL', 'APE', 'APES', 'RETARD', 'SMOOTH', 'BRAIN', 'DIAMOND', 'HANDS',
  'PAPER', 'ROCKET', 'SQUEEZE', 'SHORT', 'LONG', 'MARGIN', 'LEVERAGE', 'OPTIONS',
  'STRIKE', 'EXPIRY', 'IV', 'THETA', 'DELTA', 'GAMMA', 'VEGA', 'RHO', 'GREEKS',
  'CREDIT', 'DEBIT', 'SPREAD', 'IRON', 'CONDOR', 'BUTTERFLY', 'STRANGLE', 'STRADDLE',
  'COLLAR', 'COVERED', 'NAKED', 'CASH', 'SECURED', 'PROTECTIVE', 'SYNTHETIC',
  
  // Internet/Social Media acronyms
  'LMAO', 'ROFL', 'SMH', 'AF', 'FR', 'NGL', 'TBH', 'IRL', 'AFK', 'BRB', 'GTG',
  'IDK', 'IKR', 'IIRC', 'AFAIK', 'ELI5', 'AMA', 'TIL', 'PSA', 'LPT', 'YSK',
  
  // Common abbreviations
  'USA', 'UK', 'EU', 'NASA', 'FBI', 'CIA', 'IRS', 'DMV', 'GPS', 'TV', 'PC', 'MAC',
  'iOS', 'APP', 'API', 'URL', 'HTML', 'CSS', 'JS', 'SQL', 'AI', 'ML', 'VR', 'AR',
  'COVID', 'WHO', 'CDC', 'NFL', 'NBA', 'MLB', 'NHL', 'UFC', 'WWE', 'ESPN'
]);

export interface TickerMention {
  ticker: string;
  count: number;
  contexts: string[];
}

export class StockExtractor {
  extractTickers(text: string): TickerMention[] {
    const tickerMap = new Map<string, TickerMention>();
    
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    // Enhanced regex pattern to match potential tickers
    // Prioritize $TICKER format, be more restrictive with standalone words
    const tickerPattern = /\$([A-Z]{1,5})|(?:^|\s)([A-Z]{2,5})(?=\s|$|[^\w])/g;
    let match;
    
    while ((match = tickerPattern.exec(text)) !== null) {
      const ticker = (match[1] || match[2]).toUpperCase();
      
      if (this.isValidTicker(ticker)) {
        if (!tickerMap.has(ticker)) {
          tickerMap.set(ticker, {
            ticker,
            count: 0,
            contexts: []
          });
        }
        
        const mention = tickerMap.get(ticker)!;
        mention.count++;
        
        // Extract context (50 characters before and after)
        const start = Math.max(0, match.index - 50);
        const end = Math.min(text.length, match.index + match[0].length + 50);
        const context = text.slice(start, end).trim();
        
        if (context && !mention.contexts.includes(context)) {
          mention.contexts.push(context);
        }
      }
    }
    
    return Array.from(tickerMap.values()).sort((a, b) => b.count - a.count);
  }
  
  extractFromPosts(posts: Array<{ title: string; content: string; comments: string[] }>): TickerMention[] {
    const allTickerMentions = new Map<string, TickerMention>();
    
    for (const post of posts) {
      // Extract from title
      const titleTickers = this.extractTickers(post.title);
      this.mergeTickers(allTickerMentions, titleTickers);
      
      // Extract from content
      const contentTickers = this.extractTickers(post.content);
      this.mergeTickers(allTickerMentions, contentTickers);
      
      // Extract from comments
      for (const comment of post.comments) {
        const commentTickers = this.extractTickers(comment);
        this.mergeTickers(allTickerMentions, commentTickers);
      }
    }
    
    return Array.from(allTickerMentions.values()).sort((a, b) => b.count - a.count);
  }
  
  private mergeTickers(mainMap: Map<string, TickerMention>, newTickers: TickerMention[]): void {
    for (const ticker of newTickers) {
      if (!mainMap.has(ticker.ticker)) {
        mainMap.set(ticker.ticker, {
          ticker: ticker.ticker,
          count: 0,
          contexts: []
        });
      }
      
      const existing = mainMap.get(ticker.ticker)!;
      existing.count += ticker.count;
      
      // Merge contexts (avoid duplicates)
      for (const context of ticker.contexts) {
        if (!existing.contexts.includes(context)) {
          existing.contexts.push(context);
        }
      }
    }
  }
  
  private isValidTicker(ticker: string): boolean {
    // Basic validation
    if (!ticker || ticker.length < 1 || ticker.length > 5) {
      return false;
    }
    
    // Check if it's a common English word that should be excluded
    if (EXCLUDED_WORDS.has(ticker)) {
      return false;
    }
    
    // For 2-letter "tickers", be very restrictive - only allow known ones
    if (ticker.length === 2) {
      const knownTwoLetter = new Set(['GM', 'GE', 'HP', 'GO', 'RF', 'MS', 'MA', 'KO']);
      return knownTwoLetter.has(ticker);
    }
    
    // Check if it's in our valid tickers list first (highest confidence)
    if (VALID_TICKERS.has(ticker)) {
      return true;
    }
    
    // For unknown tickers, apply stricter rules
    // Must be 3-5 characters and not look like common words
    if (ticker.length >= 3 && ticker.length <= 5) {
      // Additional heuristics to filter out false positives
      const commonPatterns = [
        /^(THE|AND|FOR|ARE|BUT|NOT|YOU|ALL|CAN|WAS|ONE|OUR|DAY|GET|HAS|HIM|HIS|HOW|ITS|MAY|NEW|NOW|OLD|SEE|TWO|WHO|BOY|DID|LET|PUT|SAY|SHE|TOO|USE|WAY|WIN|YES|YET)$/,
        /^(EDIT|TLDR|YOLO|HODL)$/, // Reddit slang
        /^(USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|BTC|ETH)$/, // Currencies
        /^(CEO|IPO|SEC|FDA|NYSE|NASDAQ|ETF|REIT)$/, // Finance acronyms
        /^(LOL|WTF|OMG|LMAO|ROFL|SMH)$/, // Internet slang
      ];
      
      for (const pattern of commonPatterns) {
        if (pattern.test(ticker)) {
          return false;
        }
      }
      
      return /^[A-Z]{3,5}$/.test(ticker);
    }
    
    return false;
  }
}