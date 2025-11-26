#!/bin/bash

# Deployment script for production server
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SERVER_IP="94.241.141.194"
DEPLOY_USER="root"
PROJECT_DIR="/opt/ritual-app"
BACKUP_DIR="/opt/backups/ritual-app"

echo "🚀 Starting deployment to $ENVIRONMENT environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    echo "Please create .env.production file with all required environment variables."
    exit 1
fi

# Emergency cleanup BEFORE copying anything
print_status "Attempting emergency cleanup via SSH..."
ssh ${DEPLOY_USER}@${SERVER_IP} "rm -f /swapfile && docker system prune -a -f || true" || echo "Cleanup warning (might be connection issue)"

# Copy rescue script first
print_status "Copying rescue script..."
scp rescue-disk.sh ${DEPLOY_USER}@${SERVER_IP}:/root/
ssh ${DEPLOY_USER}@${SERVER_IP} "chmod +x /root/rescue-disk.sh"

# Copy files to server
print_status "Copying project files to server..."
rsync -avz --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude '.env.local' \
    ./ ${DEPLOY_USER}@${SERVER_IP}:${PROJECT_DIR}/

# НЕ копируем .env файл - он должен быть настроен один раз на сервере
print_info ".env файл на сервере НЕ обновляется (сохраняются ваши настройки)"

# Deploy on server
print_status "Executing deployment on server..."
ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    
    # 1. Run rescue script to fix disk/memory
    echo "Running system rescue/optimization..."
    /root/rescue-disk.sh
    
    cd /opt/ritual-app
    
    # Проверяем, что .env существует
    if [ ! -f .env ]; then
        echo "❌ .env файл не найден на сервере!"
        echo "Создайте его вручную:"
        echo "  ssh root@94.241.141.194 'nano /opt/ritual-app/.env'"
        echo "Или скопируйте с локальной машины:"
        echo "  scp .env.production root@94.241.141.194:/opt/ritual-app/.env"
        exit 1
    fi
    
    echo "✓ .env файл найден, используем существующие настройки"
    
    # Stop services (already stopped by rescue script, but just in case)
    echo "Ensuring services are stopped..."
    docker-compose -f docker-compose.production.yml down || true
    
    # Build services SEQUENTIALLY to avoid OOM
    echo "------------------------------------------------"
    echo "🏗️  Building API (Backend)..."
    echo "------------------------------------------------"
    DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml build api
    
    echo "------------------------------------------------"
    echo "🏗️  Building Web (Frontend)..."
    echo "------------------------------------------------"
    DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml build web
    
    echo "------------------------------------------------"
    echo "🤖 Building Bots..."
    echo "------------------------------------------------"
    DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml build customer-bot || echo "Bot build skipped"
    
    # Start services
    echo "🚀 Starting services..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be healthy
    echo "Waiting for services to be healthy..."
    sleep 10
    
    # Run database migrations
    echo "Running database migrations..."
    docker-compose -f docker-compose.production.yml exec -T api sh -c "cd /app/apps/api && npx prisma migrate deploy" || true
    
    # Check service status
    echo "Checking service status..."
    docker-compose -f docker-compose.production.yml ps
    
    echo "Deployment completed!"
ENDSSH

print_status "Deployment completed successfully!"
echo ""
echo "Services are available at:"
echo "  - Frontend: http://${SERVER_IP}"
echo "  - API: http://${SERVER_IP}/api"
