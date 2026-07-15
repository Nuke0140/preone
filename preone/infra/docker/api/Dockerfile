# PreOne API — Multi-stage Dockerfile
# Per ADR-111 §3.4 — multi-stage build, Alpine base, pruned devDeps
# Final image size target: ~110 MB

# ─────────────────────────────────────────────
# Stage 1: Base — install all deps (cached)
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace manifest files first (for layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Install all deps (including devDeps for build)
RUN pnpm install --frozen-lockfile

# ─────────────────────────────────────────────
# Stage 2: Build — compile TS → JS
# ─────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Copy Prisma schema + generate client
COPY packages/database/prisma ./packages/database/prisma
RUN pnpm --filter @preone/database exec prisma generate

# Copy source + build
COPY apps/api ./apps/api
COPY packages ./packages
COPY tsconfig*.json ./
COPY turbo.json ./

RUN pnpm --filter @preone/api run build

# Prune devDependencies for production image
RUN pnpm install --prod --frozen-lockfile

# ─────────────────────────────────────────────
# Stage 3: Runtime — minimal Alpine + production deps
# ─────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Install tini for proper signal handling (K8s SIGTERM)
RUN apk add --no-cache tini curl

# Create non-root user (security — BTD §20)
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs

# Copy built artifacts + production deps
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/prisma ./prisma

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health/live || exit 1

# tini handles SIGTERM/SIGINT properly for K8s grace shutdown
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
