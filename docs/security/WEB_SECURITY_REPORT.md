# WealthOS — Web Application Security Report

## 1. Scope & Verification Standard

This report audits and verifies the web presentation tier (`apps/web`) built with Next.js App Router and React 18, benchmarked against **OWASP ASVS 5.0 Level 2/3**.

---

## 2. Implemented Web Controls & Verification

### 2.1 Content-Security-Policy & Browser Defense Headers
- **Configuration** (`apps/web/next.config.js`):
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http: https: ws: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';`
  - Zero `'unsafe-eval'` in production builds.
  - `X-Frame-Options: DENY` (anti-clickjacking).
  - `X-Content-Type-Options: nosniff` (MIME confusion defense).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`.
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

### 2.2 Edge Route Protection & Anti-Caching
- **Middleware** (`apps/web/src/middleware.ts`):
  - Intercepts requests to all financial routes (`/dashboard`, `/accounts`, `/investments`, `/analytics`, `/net-worth`, etc.).
  - Rejects unauthenticated visits with automatic redirect to `/auth/login?redirect=...`.
  - Injects anti-caching headers on all authenticated financial views:
    `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, private`
    `Pragma: no-cache`
    `Expires: 0`
  - Verified in `apps/web/src/webSecurity.test.ts`.

### 2.3 Zero Browser Storage Retention
- Tokens are held strictly in memory in React state and sent via ambient HttpOnly cookies.
- Verified in `apps/web/src/webSecurity.test.ts`: zero long-lived credentials in `localStorage`.

### 2.4 CSRF Protection
- Backend FastAPI middleware validates `Origin` and `Referer` against `CORS_ORIGINS` for cookie-based state-changing requests (`POST`, `PUT`, `DELETE`).
