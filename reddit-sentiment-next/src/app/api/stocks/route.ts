import { NextRequest, NextResponse } from 'next/server';
import { DataController } from '@/lib/services/data-controller';

// Initialize data controller
const dataController = new DataController();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postLimit = parseInt(searchParams.get('post_limit') || '200');
    const stockLimit = parseInt(searchParams.get('stock_limit') || '20');
    const forceRefresh = searchParams.get('force_refresh') === 'true';

    let stockData;
    
    if (forceRefresh) {
      stockData = await dataController.forceRefresh(postLimit, stockLimit);
    } else {
      stockData = await dataController.processRedditData(postLimit, stockLimit);
    }

    return NextResponse.json({
      success: true,
      data: stockData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/stocks:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stock data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tickers, post_limit, stock_limit } = body;

    if (action === 'add_tickers' && Array.isArray(tickers)) {
      dataController.addCustomTickers(tickers);
      return NextResponse.json({
        success: true,
        message: `Added ${tickers.length} custom tickers`,
      });
    }

    if (action === 'remove_tickers' && Array.isArray(tickers)) {
      dataController.removeTickers(tickers);
      return NextResponse.json({
        success: true,
        message: `Removed ${tickers.length} tickers`,
      });
    }

    if (action === 'refresh') {
      const stockData = await dataController.forceRefresh(
        post_limit || 200,
        stock_limit || 20
      );
      return NextResponse.json({
        success: true,
        data: stockData,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST /api/stocks:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}