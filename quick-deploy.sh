#!/bin/bash

# Быстрый деплой с автоматическим выбором стратегии
# Использует локальную сборку если Docker доступен, иначе собирает на сервере
# Usage: ./quick-deploy.sh [api|web|all]

set -e

SERVICE=${1:-all}
SERVER_IP="94.241.141.194"
DEPLOY_USER="root"
PROJECT_DIR="/opt/ritual-app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Check if Docker is available locally
HAS_LOCAL_DOCKER=false
if command -v docker > /dev/null 2>&1 && docker info > /dev/null 2>&1; then
    HAS_LOCAL_DOCKER=true
fi

# Check .env.production
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    exit 1
fi

echo "🚀 Quick Deploy - Fastest deployment strategy"
echo ""

if [ "$HAS_LOCAL_DOCKER" = true ]; then
    print_info "Docker detected locally - using FAST local build strategy"
    echo ""
    
    # Build locally and deploy
    print_status "Step 1: Building images locally..."
    ./build-local.sh production || {
        print_error "Local build failed. Falling back to server build..."
        HAS_LOCAL_DOCKER=false
    }
    
    if [ "$HAS_LOCAL_DOCKER" = true ]; then
        print_status "Step 2: Deploying pre-built images..."
        ./deploy-local-images.sh production
        exit 0
    fi
fi

# Fallback to server build
print_warning "Using server build (slower but works without local Docker)"
echo ""

print_status "Copying files to server..."
rsync -avz --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude '.env.local' \
    ./ ${DEPLOY_USER}@${SERVER_IP}:${PROJECT_DIR}/

print_status "Copying environment file..."
scp .env.production ${DEPLOY_USER}@${SERVER_IP}:${PROJECT_DIR}/.env

print_status "Deploying on server..."
ssh ${DEPLOY_USER}@${SERVER_IP} << ENDSSH
    set -e
    cd ${PROJECT_DIR}
    
    # Stop services
    docker-compose -f docker-compose.production.yml down || true
    
    # Build only changed service or all
    if [ "$SERVICE" = "api" ]; then
        echo "Building API only..."
        DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml build api
    elif [ "$SERVICE" = "web" ]; then
        echo "Building Web only..."
        DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml build web
    else
        echo "Building all services..."
        DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml build api web
    fi
    
    # Start services
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait and migrate
    sleep 10
    docker-compose -f docker-compose.production.yml exec -T api sh -c "cd /app/apps/api && npx prisma migrate deploy" || true
    
    # Status
    docker-compose -f docker-compose.production.yml ps
ENDSSH

print_status "Deployment completed!"
echo "Services: http://${SERVER_IP}"



