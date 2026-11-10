# WealthOS Web Application Startup & Operations Guide

**Artifact Identifier:** `WEALTHOS-WEB-RELEASE-001`  
**Framework:** Next.js 14.2.35 (React 18, Tailwind CSS, Lucide Icons)  
**Distribution Directory:** `production-build/`  
**Prerendered Routes:** 30 statically prerendered routes (Dashboard, Investments, Net Worth, Budgets, Analytics, Copilot, Documents, Settings, Auth)  
**Build Artifact Size:** ~5.47 MB (excluding ephemeral build caches)  

---

## 1. Overview & Architecture

The WealthOS Web Application is compiled and optimized for production deployment:
- **Server-Side Rendering & SSG:** Prerendered static pages with hydration for maximum performance.
- **Offline & IndexedDB Integration:** Client-side financial caching with synchronization retry engine.
- **Enterprise Security:** Content Security Policy (CSP), strict HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and Referrer-Policy configured in `next.config.js`.

---

## 2. Prerequisites

- **Node.js:** v18.17.0 or v20.x LTS
- **Package Manager:** npm v9+ or pnpm v8+
- **Reverse Proxy (Recommended for Production):** Nginx, Caddy, or Cloudflare

---

## 3. Production Startup

### Step 1: Install Dependencies
From the `production-build` directory (or workspace web directory):
```bash
cd production-build
npm install --omit=dev
```

### Step 2: Configure Environment Variables
Set the required environment variables:

| Variable | Description | Example (Staging / Dev) | Example (Production) |
|---|---|---|---|
| `PORT` | Listening port for web server | `3000` or `3005` | `3000` |
| `NEXT_PUBLIC_API_URL` | Public browser API endpoint | `http://localhost:8000` | `https://api.wealthos.com` |
| `BACKEND_API_INTERNAL_URL` | Private network backend endpoint | `http://127.0.0.1:8000` | `http://backend:8000` |
| `NEXT_PUBLIC_ENVIRONMENT` | Environment identifier | `staging` | `production` |

### Step 3: Launch Production Server
```bash
# Example for staging or local production test
env PORT=3000 \
    NEXT_PUBLIC_API_URL="http://localhost:8000" \
    BACKEND_API_INTERNAL_URL="http://127.0.0.1:8000" \
    NEXT_PUBLIC_ENVIRONMENT="production" \
    npx next start -H 0.0.0.0 -p 3000
```

---

## 4. Reverse Proxy & SSL Configuration (Nginx Example)

```nginx
server {
    listen 443 ssl http2;
    server_name app.wealthos.com;

    ssl_certificate /etc/letsencrypt/live/app.wealthos.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.wealthos.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. Verification & Health Check

Test that the web server is running and delivering security headers:
```bash
curl -I http://localhost:3000/
```
Expected response headers include:
- `HTTP/1.1 200 OK`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

