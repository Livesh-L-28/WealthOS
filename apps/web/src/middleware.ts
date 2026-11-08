import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * WealthOS Enterprise Edge Security Middleware
 *
 * Implements:
 * 1. Protected route authorization checks at the edge.
 * 2. Strict anti-caching headers for sensitive financial pages (OWASP ASVS 5.0).
 * 3. Browser defense headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
 */

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/accounts',
  '/transactions',
  '/budgets',
  '/investments',
  '/analytics',
  '/net-worth',
  '/goals',
  '/copilot',
  '/household',
  '/documents',
  '/reconciliation',
  '/settings',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route requires authentication
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    // Check for presence of active auth token cookie
    const hasAccessToken = request.cookies.has('wealthos_access_token') || request.cookies.has('access_token');
    const hasRefreshToken = request.cookies.has('refresh_token');

    if (!hasAccessToken && !hasRefreshToken) {
      // In development or e2e tests where bearer token is stored in localStorage or headers,
      // allow through if requested with Authorization header or if running in test bypass
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  const response = NextResponse.next();

  // 1. Anti-caching headers for financial data views (prevents disk caching of balances and net worth)
  if (isProtected) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // 2. Defense-in-depth security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (assets, icons)
     * - api routes (handled directly by rewrites / backend)
     */
    '/((?!_next/static|_next/image|favicon.ico|assets/|api/).*)',
  ],
};

