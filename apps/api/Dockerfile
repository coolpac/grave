# Base image
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN npm install -g pnpm@10.17.0

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy all files (respecting .dockerignore)
COPY . .

# Install dependencies (frozen-lockfile for consistency)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build the application
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application and dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy API build
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma

# Copy necessary node_modules (pruned for production)
# Note: In a monorepo, pruning can be tricky. We'll use a safer approach:
# 1. Copy all node_modules from builder (simplest, uses more space but guaranteed to work)
# OR 2. Re-install prod dependencies (cleaner image)

# Let's go with re-installing prod dependencies to keep image small
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/ui/package.json ./packages/ui/
# We need to copy the root package.json too
COPY --from=builder /app/package.json ./

# Install ONLY production dependencies
RUN pnpm install --prod --frozen-lockfile

# Re-generate prisma client for production
WORKDIR /app/apps/api
RUN npx prisma generate

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
CMD ["node", "dist/main.js"]
