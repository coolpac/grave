#!/bin/bash

# Script to build Docker images locally and upload to production server
# This prevents server overload during build process
# Usage: ./build-local.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
SERVER_IP="94.241.141.194"
DEPLOY_USER="root"
PROJECT_DIR="/opt/ritual-app"
TEMP_DIR="/tmp/ritual-docker-builds"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check available disk space (need at least 5GB)
AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ -z "$AVAILABLE_SPACE" ] || [ "$AVAILABLE_SPACE" -lt 5 ]; then
    print_warning "Low disk space. Make sure you have at least 5GB free."
fi

print_info "Building Docker images locally..."
print_info "This will prevent server overload and is much faster!"

# Create temp directory
mkdir -p ${TEMP_DIR}
cd ${TEMP_DIR}

# Build API image
print_status "Building API image..."
cd - > /dev/null
docker build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    -t ritual-api:latest \
    -f apps/api/Dockerfile \
    . || {
    print_error "Failed to build API image"
    exit 1
}

# Build Web image
print_status "Building Web image..."
docker build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    -t ritual-web:latest \
    -f apps/web/Dockerfile \
    . || {
    print_error "Failed to build Web image"
    exit 1
}

# Save images to compressed files
print_status "Saving images to files..."
docker save ritual-api:latest | gzip > ${TEMP_DIR}/ritual-api.tar.gz
docker save ritual-web:latest | gzip > ${TEMP_DIR}/ritual-web.tar.gz

# Get file sizes
API_SIZE=$(du -h ${TEMP_DIR}/ritual-api.tar.gz | cut -f1)
WEB_SIZE=$(du -h ${TEMP_DIR}/ritual-web.tar.gz | cut -f1)

print_info "API image size: ${API_SIZE}"
print_info "Web image size: ${WEB_SIZE}"

# Upload to server
print_status "Uploading images to server..."
scp ${TEMP_DIR}/ritual-api.tar.gz ${DEPLOY_USER}@${SERVER_IP}:/tmp/ || {
    print_error "Failed to upload API image"
    exit 1
}

scp ${TEMP_DIR}/ritual-web.tar.gz ${DEPLOY_USER}@${SERVER_IP}:/tmp/ || {
    print_error "Failed to upload Web image"
    exit 1
}

# Load images on server
print_status "Loading images on server..."
ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    echo "Loading API image..."
    docker load < /tmp/ritual-api.tar.gz || {
        echo "Failed to load API image"
        exit 1
    }
    
    echo "Loading Web image..."
    docker load < /tmp/ritual-web.tar.gz || {
        echo "Failed to load Web image"
        exit 1
    }
    
    # Clean up uploaded files
    rm -f /tmp/ritual-api.tar.gz /tmp/ritual-web.tar.gz
    
    echo "Images loaded successfully!"
ENDSSH

# Clean up local temp files
print_status "Cleaning up local files..."
rm -f ${TEMP_DIR}/ritual-api.tar.gz ${TEMP_DIR}/ritual-web.tar.gz
rmdir ${TEMP_DIR} 2>/dev/null || true

print_status "Build and upload completed successfully!"
print_info "Now you can deploy using: ./deploy-local-images.sh"


