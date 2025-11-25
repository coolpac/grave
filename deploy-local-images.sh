#!/bin/bash

# Deployment script using pre-built images from local machine
# This prevents server overload during deployment
# Usage: ./deploy-local-images.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SERVER_IP="94.241.141.194"
DEPLOY_USER="root"
PROJECT_DIR="/opt/ritual-app"
BACKUP_DIR="/opt/backups/ritual-app"

echo "🚀 Starting deployment with pre-built images..."

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

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if images exist on server
print_status "Checking if images are available on server..."
ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
    if ! docker images | grep -q "ritual-api"; then
        echo "ERROR: ritual-api image not found on server"
        echo "Please run ./build-local.sh first to build and upload images"
        exit 1
    fi
    
    if ! docker images | grep -q "ritual-web"; then
        echo "ERROR: ritual-web image not found on server"
        echo "Please run ./build-local.sh first to build and upload images"
        exit 1
    fi
    
    echo "Images found on server"
ENDSSH

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    echo "Please create .env.production file with all required environment variables."
    exit 1
fi

# Create backup before deployment
print_status "Creating backup..."
ssh ${DEPLOY_USER}@${SERVER_IP} "mkdir -p ${BACKUP_DIR} && \
    if [ -d ${PROJECT_DIR} ]; then \
        tar -czf ${BACKUP_DIR}/backup-\$(date +%Y%m%d-%H%M%S).tar.gz -C ${PROJECT_DIR} .; \
    fi"

# Copy files to server (excluding node_modules, dist, etc.)
print_status "Copying files to server..."
rsync -avz --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '*.tar.gz' \
    ./ ${DEPLOY_USER}@${SERVER_IP}:${PROJECT_DIR}/

# НЕ копируем .env файл - он должен быть настроен один раз на сервере
print_info "ℹ️  .env файл на сервере НЕ обновляется (сохраняются ваши настройки)"

# Update docker-compose to use pre-built images
print_status "Updating docker-compose to use pre-built images..."
ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    cd /opt/ritual-app
    
    # Create backup of docker-compose
    cp docker-compose.production.yml docker-compose.production.yml.backup
    
    # Update docker-compose to use images instead of build
    # This is done by creating a temporary file with image references
    cat > /tmp/docker-compose-update.yml << 'EOF'
services:
  api:
    image: ritual-api:latest
    # Remove build section if exists
  web:
    image: ritual-web:latest
    # Remove build section if exists
EOF
    
    # Use sed or python to update docker-compose.yml
    python3 << 'PYTHON_SCRIPT'
import yaml
import sys

with open('/opt/ritual-app/docker-compose.production.yml', 'r') as f:
    compose = yaml.safe_load(f)

# Update api service
if 'api' in compose['services']:
    if 'build' in compose['services']['api']:
        del compose['services']['api']['build']
    compose['services']['api']['image'] = 'ritual-api:latest'

# Update web service
if 'web' in compose['services']:
    if 'build' in compose['services']['web']:
        del compose['services']['web']['build']
    compose['services']['web']['image'] = 'ritual-web:latest'

with open('/opt/ritual-app/docker-compose.production.yml', 'w') as f:
    yaml.dump(compose, f, default_flow_style=False, sort_keys=False)

print("Updated docker-compose.production.yml to use pre-built images")
PYTHON_SCRIPT
    
    if [ $? -ne 0 ]; then
        echo "Python not available, using sed instead..."
        # Fallback to sed if python not available
        sed -i.bak 's|build:.*||g' docker-compose.production.yml
        sed -i.bak '/dockerfile:/d' docker-compose.production.yml
        sed -i.bak '/context:/d' docker-compose.production.yml
        # Add image lines after container_name
        sed -i.bak '/container_name: ritual_api/a\    image: ritual-api:latest' docker-compose.production.yml
        sed -i.bak '/container_name: ritual_web/a\    image: ritual-web:latest' docker-compose.production.yml
    fi
ENDSSH

# Deploy on server
print_status "Deploying on server (no build needed - using pre-built images)..."
ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
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
    
    # Create necessary directories with proper permissions
    echo "Creating directories..."
    mkdir -p apps/api/uploads/thumbnails apps/api/logs apps/api/reports
    chmod -R 777 apps/api/uploads apps/api/logs apps/api/reports
    
    # Stop services gracefully
    echo "Stopping services..."
    docker-compose -f docker-compose.production.yml down || true
    
    # Clean up old resources to free memory
    echo "Cleaning up Docker resources..."
    docker system prune -f || true
    
    # Pull latest images if needed (they should already be loaded)
    echo "Ensuring images are up to date..."
    docker-compose -f docker-compose.production.yml pull || true
    
    # Start services (no build needed!)
    echo "Starting services..."
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
    
    # Show resource usage
    echo ""
    echo "Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
    
    echo "Deployment completed!"
ENDSSH

print_status "Deployment completed successfully!"
echo ""
echo "Services are available at:"
echo "  - Frontend: http://${SERVER_IP}"
echo "  - API: http://${SERVER_IP}/api"
echo "  - Health: http://${SERVER_IP}/api/health"
echo ""
echo "To view logs:"
echo "  ssh ${DEPLOY_USER}@${SERVER_IP} 'cd ${PROJECT_DIR} && docker-compose -f docker-compose.production.yml logs -f'"


