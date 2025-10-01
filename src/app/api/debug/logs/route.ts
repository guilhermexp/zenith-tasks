import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/utils/logger';
import type { LogLevel } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level') as LogLevel | null;
    const limit = searchParams.get('limit');

    const logs = logger.getLogs(
      level || undefined,
      limit ? parseInt(limit, 10) : 100
    );

    return NextResponse.json({
      logs,
      total: logs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to retrieve logs',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    logger.clearLogs();

    return NextResponse.json({
      message: 'Logs cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to clear logs',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}