import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Check if running in Electron environment
  const userAgent = request.headers.get('user-agent') || '';
  const isElectron = userAgent.includes('Electron');

  if (isElectron) {
    // Remove any existing CSP headers that might conflict
    response.headers.delete('Content-Security-Policy');
    response.headers.delete('X-Content-Security-Policy');

    // Set a more permissive CSP for Electron environments
    response.headers.set(
      'Content-Security-Policy',
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *; img-src * data: blob:; frame-src *; style-src * 'unsafe-inline';"
    );
  }

  return response;
}

export const config = {
  matcher: '/:path*',
};