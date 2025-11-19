#!/bin/bash

# Resource monitoring script for production server
# Usage: ./monitor-resources.sh [server_ip]

SERVER_IP=${1:-94.241.141.194}
DEPLOY_USER="root"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "📊 Monitoring server resources..."
echo ""

ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
    # Memory usage
    echo "=== MEMORY ==="
    free -h
    echo ""
    
    # Disk usage
    echo "=== DISK ==="
    df -h | grep -E '^/dev|Filesystem'
    echo ""
    
    # CPU load
    echo "=== CPU LOAD ==="
    uptime
    echo ""
    
    # Docker stats
    echo "=== DOCKER CONTAINERS ==="
    if command -v docker > /dev/null; then
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers running"
        echo ""
        echo "=== DOCKER RESOURCE USAGE ==="
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null || echo "No stats available"
    else
        echo "Docker not installed"
    fi
    echo ""
    
    # Top processes
    echo "=== TOP PROCESSES (by CPU) ==="
    ps aux --sort=-%cpu | head -10
    echo ""
    
    # Top processes by memory
    echo "=== TOP PROCESSES (by Memory) ==="
    ps aux --sort=-%mem | head -10
    echo ""
    
    # Docker disk usage
    if command -v docker > /dev/null; then
        echo "=== DOCKER DISK USAGE ==="
        docker system df
    fi
ENDSSH

echo ""
echo "✅ Monitoring complete"


