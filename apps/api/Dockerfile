# Multi-stage build for NestJS API in monorepo
FROM node:20-alpine AS base

# Enable corepack (includes pnpm)
RUN corepack enable && corepack prepare pnpm@10.17.0 --activate

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy package files first (for better caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies (including devDependencies for build)
# Use --shamefully-hoist to ensure all dependencies are accessible
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy source code
COPY apps/api ./apps/api
COPY packages ./packages
COPY turbo.json tsconfig.json ./

# Generate Prisma Client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build the application
# Set NODE_PATH to help webpack resolve modules
ENV NODE_PATH=/app/node_modules
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --shamefully-hoist

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./prisma

# Generate Prisma Client for production (needed because of shamefully-hoist)
# Install prisma CLI first
RUN npm install -g prisma@5.9.1
WORKDIR /app/apps/api
RUN npx prisma generate
WORKDIR /app

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
