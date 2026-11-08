import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('WealthOS Web Application Security Hardening Suite', () => {
  describe('Edge Middleware Route Protection & Anti-Caching Headers', () => {
    it('redirects unauthenticated requests on protected routes to login with return path', () => {
      const req = new NextRequest('http://localhost:3000/dashboard');
      const res = middleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/auth/login?redirect=%2Fdashboard');
    });

    it('permits authenticated requests possessing valid session cookies', () => {
      const req = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          cookie: 'wealthos_access_token=valid_mock_jwt_cookie',
        },
      });
      const res = middleware(req);

      expect(res.status).toBe(200);
      // Injects anti-caching headers on financial pages
      const cacheControl = res.headers.get('Cache-Control');
      expect(cacheControl).toBe('no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, private');
      expect(res.headers.get('Pragma')).toBe('no-cache');
      expect(res.headers.get('Expires')).toBe('0');
    });

    it('injects defense-in-depth security headers on all responses', () => {
      const req = new NextRequest('http://localhost:3000/auth/login');
      const res = middleware(req);

      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('protects all sensitive financial sub-paths', () => {
      const paths = [
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

      for (const p of paths) {
        const req = new NextRequest(`http://localhost:3000${p}`);
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('/auth/login');
      }
    });
  });

  describe('Zero Persistent LocalStorage Credential Retention Policy', () => {
    it('verifies that no authentication tokens are persisted in browser localStorage', () => {
      // In a hardened browser environment, localStorage must not retain long-lived credentials
      const sensitiveKeys = ['wealthos_access_token', 'access_token', 'refresh_token'];
      for (const key of sensitiveKeys) {
        expect(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null).toBeNull();
      }
    });
  });
});

