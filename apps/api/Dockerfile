# Multi-stage build for NestJS API in monorepo
# Optimized for pnpm workspaces and Prisma

FROM node:20-alpine AS base

# Enable corepack (includes pnpm)
RUN corepack enable && corepack prepare pnpm@10.17.0 --activate

# Builder stage - installs all deps and builds
FROM base AS builder
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/

# Install ALL dependencies (including devDependencies for build)
# Use --shamefully-hoist to make all deps accessible to webpack
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy source code
COPY apps/api ./apps/api
COPY packages ./packages
COPY turbo.json tsconfig.json ./

# Generate Prisma Client (must be done before build)
WORKDIR /app/apps/api
RUN npx prisma generate

# Build the application
# Set NODE_PATH to help webpack resolve modules
ENV NODE_PATH=/app/node_modules
WORKDIR /app/apps/api
RUN pnpm build

# Production stage - minimal runtime image
FROM base AS runner
WORKDIR /app

# Create app user (non-root for security)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/

# Install ONLY production dependencies
RUN pnpm install --prod --frozen-lockfile --shamefully-hoist

# Copy built application from builder
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma

# Copy Prisma Client from builder
# Copy @prisma/client package
RUN mkdir -p ./node_modules/@prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy entire @prisma+client package structure from pnpm
# This includes the .prisma directory with generated client
# Prisma generates to: .pnpm/@prisma+client@VERSION/node_modules/.prisma/client/default
# We need to copy the entire package structure to maintain the path
RUN mkdir -p ./node_modules/.pnpm
RUN --mount=from=builder,source=/app/node_modules/.pnpm,target=/tmp/pnpm \
    if [ -d /tmp/pnpm ]; then \
      for dir in /tmp/pnpm/@prisma+client*; do \
        if [ -d "$dir" ]; then \
          cp -r "$dir" ./node_modules/.pnpm/; \
        fi; \
      done; \
    fi

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/live || exit 1

# Start the application
WORKDIR /app
CMD ["node", "dist/main.js"]
