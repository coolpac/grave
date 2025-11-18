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

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

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

# Copy files to server
print_status "Copying files to server..."
rsync -avz --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude '.env.local' \
    ./ ${DEPLOY_USER}@${SERVER_IP}:${PROJECT_DIR}/

# Copy production .env file
print_status "Copying environment file..."
scp .env.production ${DEPLOY_USER}@${SERVER_IP}:${PROJECT_DIR}/.env

# Deploy on server
print_status "Deploying on server..."
ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    cd /opt/ritual-app
    
    # Stop services
    echo "Stopping services..."
    docker-compose -f docker-compose.production.yml down || true
    
    # Build and start services
    echo "Building and starting services..."
    docker-compose -f docker-compose.production.yml build --no-cache
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be healthy
    echo "Waiting for services to be healthy..."
    sleep 10
    
    # Run database migrations
    echo "Running database migrations..."
    docker-compose -f docker-compose.production.yml exec -T api npx prisma migrate deploy || true
    
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
echo "  - Health: http://${SERVER_IP}/api/health"
echo ""
echo "To view logs:"
echo "  ssh ${DEPLOY_USER}@${SERVER_IP} 'cd ${PROJECT_DIR} && docker-compose -f docker-compose.production.yml logs -f'"

