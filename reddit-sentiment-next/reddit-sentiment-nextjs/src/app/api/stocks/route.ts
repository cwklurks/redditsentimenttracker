import { NextRequest, NextResponse } from 'next/server';
import { DataController } from '@/lib/services/data-controller';
import { ApiResponse, StockMention } from '@/types';

const dataController = new DataController();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postLimit = parseInt(searchParams.get('postLimit') || '100');
    const topStocksLimit = parseInt(searchParams.get('topStocksLimit') || '20');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    // Validate parameters
    if (postLimit < 10 || postLimit > 200) {
      return NextResponse.json({
        success: false,
        error: 'postLimit must be between 10 and 200'
      } as ApiResponse<StockMention[]>, { status: 400 });
    }
    
    if (topStocksLimit < 5 || topStocksLimit > 50) {
      return NextResponse.json({
        success: false,
        error: 'topStocksLimit must be between 5 and 50'
      } as ApiResponse<StockMention[]>, { status: 400 });
    }
    
    console.log(`Processing request: ${postLimit} posts, ${topStocksLimit} top stocks, forceRefresh: ${forceRefresh}`);
    
    const result = await dataController.processRedditData(postLimit, topStocksLimit, forceRefresh);
    
    const response: ApiResponse<StockMention[]> = {
      success: true,
      data: result.stockMentions,
      cached: result.cached,
      lastUpdated: result.lastUpdated
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    const response: ApiResponse<StockMention[]> = {
      success: false,
      error: errorMessage
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await dataController.clearCache();
    
    const response: ApiResponse<null> = {
      success: true,
      data: null
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error clearing cache:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to clear cache'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}