import { NextResponse } from 'next/server';
import { DataController } from '@/lib/services/data-controller';

// Initialize data controller
const dataController = new DataController();

export async function GET() {
  try {
    const status = await dataController.getProcessingStatus();
    
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}