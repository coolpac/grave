#!/bin/bash

# Script to configure Docker daemon with resource limits
# This prevents Docker from consuming all server resources
# Run this on the production server

set -e

echo "🔧 Configuring Docker daemon with resource limits..."

# Backup existing daemon.json
if [ -f /etc/docker/daemon.json ]; then
    cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d-%H%M%S)
    echo "✓ Backed up existing daemon.json"
fi

# Create or update daemon.json with resource limits
cat > /etc/docker/daemon.json << 'EOF'
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 3
}
EOF

echo "✓ Created /etc/docker/daemon.json with resource limits"

# Restart Docker daemon
echo "🔄 Restarting Docker daemon..."
systemctl restart docker || service docker restart

echo "✓ Docker daemon restarted with new limits"
echo ""
echo "New limits:"
echo "  - Max concurrent downloads: 3"
echo "  - Max concurrent uploads: 3"
echo "  - File descriptor limit: 64000"
echo "  - Log rotation: 10MB per file, 3 files max"
echo ""
echo "To verify, run: docker info"


