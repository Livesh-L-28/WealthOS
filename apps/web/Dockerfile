# ==============================================================================
# WealthOS Next.js Web Client Dockerfile
# ==============================================================================

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy monorepo package configurations
COPY package.json package-lock.json ./
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/web/package.json ./apps/web/

RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build shared packages first, then build Next.js application
RUN npm run --workspace=@wealthos/design-tokens build && \
    npm run --workspace=@wealthos/shared-types build && \
    npm run --workspace=@wealthos/api-client build && \
    npm run --workspace=@wealthos/web build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts and standalone bundle
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/packages ./packages

USER nextjs

EXPOSE 3000

CMD ["npx", "next", "start", "apps/web", "-p", "3000"]

