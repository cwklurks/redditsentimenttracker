import { NextResponse } from 'next/server';
import { DataController } from '@/lib/services/data-controller';
import { ApiResponse } from '@/types';

const dataController = new DataController();

export async function GET() {
  try {
    const cacheStatus = await dataController.getCacheStatus();
    
    const response: ApiResponse<typeof cacheStatus> = {
      success: true,
      data: cacheStatus
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Status API Error:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to get status'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}