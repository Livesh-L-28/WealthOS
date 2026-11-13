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

export function isJwtActive(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return false;
  }
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const raw = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8');
      const payload = JSON.parse(raw);
      if (payload && typeof payload.exp === 'number') {
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp <= nowSec) {
          return false; // Expired token
        }
      }
      return true;
    } catch {
      return false; // Malformed payload
    }
  }

  // Non-JWT tokens only permitted in test/development environments if minimum length satisfied
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return token.length >= 8;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route requires authentication
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    // Validate structural integrity and expiration of session cookies
    const accessToken = request.cookies.get('wealthos_access_token')?.value || request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;

    const hasValidAccessToken = isJwtActive(accessToken);
    const hasValidRefreshToken = isJwtActive(refreshToken);

    if (!hasValidAccessToken && !hasValidRefreshToken) {
      // In development, mobile API requests, or e2e tests where bearer token is passed in header
      const authHeader = request.headers.get('authorization');
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!isJwtActive(bearerToken)) {
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

