# WealthOS Deployment Guide: Vercel & Render

This guide explains how to deploy the WealthOS Next.js web application and backend API to **Vercel** and **Render** with complete zero-configuration CI/CD.

---

## 1. Deploying Web Application to Vercel (Recommended for Frontend)

WealthOS Web is a production Next.js 14 application configured with WCAG 2.1 AA tokens and offline-resilient local ledger caching.

### Option A: One-Click / GitHub Import (Monorepo Root)

1. In the **Vercel Dashboard**, click **Add New...** → **Project**.
2. Select your GitHub repository containing the WealthOS codebase.
3. In **Project Settings**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: `npm run build:packages && npm run --workspace=@wealthos/web build`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `npm install`
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_ENVIRONMENT`: `production`
   - `BACKEND_API_INTERNAL_URL`: `https://your-backend-api.onrender.com` (or your live API URL)
5. Click **Deploy**. Vercel will build the shared packages (`@wealthos/shared-types`, `@wealthos/design-tokens`, `@wealthos/api-client`) and launch the Next.js production build.

### Option B: Deploying with `apps/web` as Root Directory

If you set **Root Directory** to `apps/web` in Vercel:
- The pre-configured [apps/web/vercel.json](file:///Users/livesh/WEALTHOS/apps/web/vercel.json) will automatically execute:
  - Install: `cd ../.. && npm install`
  - Build: `cd ../.. && npm run build:packages && cd apps/web && npm run build`
- No manual command changes needed!

---

## 2. Deploying Full Stack to Render (Web + FastAPI Backend + PostgreSQL + Redis)

WealthOS includes a complete **Render Blueprint** configuration in [render.yaml](file:///Users/livesh/WEALTHOS/render.yaml).

### Step-by-Step Blueprint Deployment

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New** → **Blueprint**.
3. Connect your repository.
4. Render will automatically parse `render.yaml` and discover four managed resources:
   - **`wealthos-web`**: Next.js 14 web application on port 3000.
   - **`wealthos-api`**: FastAPI Python 3.11 financial accounting backend on port 8000.
   - **`wealthos-db`**: Managed PostgreSQL database with automated daily backups.
   - **`wealthos-redis`**: Managed Redis instance for queueing and event dispatching.
5. Click **Apply**.
6. Render will automatically provision the database and Redis, run database migrations (`alembic upgrade head`), and deploy both web and backend services.

---

## 3. Environment Variable Summary

| Variable | Description | Recommended Production Value |
|---|---|---|
| `NEXT_PUBLIC_ENVIRONMENT` | Frontend deployment environment flag | `production` |
| `BACKEND_API_INTERNAL_URL` | Reverse proxy upstream for `/api/v1/*` | Upstream API host (e.g. `https://wealthos-api.onrender.com`) |
| `DATABASE_URL` | PostgreSQL connection string | Injected by Render Blueprint (`wealthos-db`) |
| `REDIS_URL` | Redis connection string | Injected by Render Blueprint (`wealthos-redis`) |
| `ENVIRONMENT` | Backend environment mode | `production` |
| `SECRET_KEY` | Cryptographic secret for session token signing | 256-bit secure hex string |

