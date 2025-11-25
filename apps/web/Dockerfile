# Multi-stage build for React frontend + Admin panel
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10.17.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web
COPY apps/admin ./apps/admin
COPY packages ./packages
COPY turbo.json tsconfig.json ./

# Build the web application
WORKDIR /app/apps/web
RUN pnpm build

# Build the admin application
WORKDIR /app/apps/admin
RUN pnpm build

# Production stage with nginx
FROM nginx:alpine

# Copy built files - web app to root
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy built files - admin app to /admin
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html/admin

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx cache directory
RUN mkdir -p /var/cache/nginx/client_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
