#!/bin/bash

# Initial server setup script
# Run this script on the server after first connection

set -e

echo "🚀 Starting server setup..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    print_warning "Cannot detect OS. Assuming Ubuntu/Debian."
    OS="ubuntu"
fi

print_status "Detected OS: $OS"

# Update system
print_status "Updating system packages..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt update && apt upgrade -y
    apt install -y curl wget git vim htop ufw fail2ban
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    yum update -y
    yum install -y curl wget git vim htop firewalld fail2ban
fi

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    print_status "Docker installed"
else
    print_status "Docker already installed"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed"
else
    print_status "Docker Compose already installed"
fi

# Configure firewall
print_status "Configuring firewall..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    print_status "UFW configured"
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    systemctl start firewalld
    systemctl enable firewalld
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    print_status "Firewalld configured"
fi

# Create directories
print_status "Creating project directories..."
mkdir -p /opt/ritual-app
mkdir -p /opt/backups/ritual-app
mkdir -p /opt/ritual-app/apps/api/uploads
mkdir -p /opt/ritual-app/apps/api/logs
chmod -R 755 /opt/ritual-app
print_status "Directories created"

# Setup Fail2Ban
print_status "Configuring Fail2Ban..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    systemctl enable fail2ban
    systemctl start fail2ban
    print_status "Fail2Ban configured"
fi

# Install unattended-upgrades (Ubuntu/Debian only)
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    print_status "Configuring automatic security updates..."
    apt install -y unattended-upgrades
    print_status "Automatic updates configured"
fi

# Create backup script
print_status "Creating backup script..."
cat > /opt/ritual-app/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/ritual-app"
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec ritual_postgres pg_dump -U postgres ritual_db | gzip > $BACKUP_DIR/db-$DATE.sql.gz

# Backup Redis (optional)
docker exec ritual_redis redis-cli --rdb - | gzip > $BACKUP_DIR/redis-$DATE.rdb.gz 2>/dev/null || true

# Backup uploads
if [ -d "/opt/ritual-app/apps/api/uploads" ]; then
    tar -czf $BACKUP_DIR/uploads-$DATE.tar.gz -C /opt/ritual-app/apps/api uploads
fi

# Remove backups older than 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/ritual-app/backup-db.sh
print_status "Backup script created"

# Setup cron for backups
print_status "Setting up automatic backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/ritual-app/backup-db.sh >> /var/log/ritual-backup.log 2>&1") | crontab -
print_status "Automatic backups configured (daily at 2:00 AM)"

echo ""
print_status "Server setup completed!"
echo ""
echo "Next steps:"
echo "1. Copy your project files to /opt/ritual-app"
echo "2. Create .env file with production variables"
echo "3. Run: cd /opt/ritual-app && docker-compose -f docker-compose.production.yml up -d"
echo ""
echo "For detailed instructions, see SERVER_MANAGEMENT_GUIDE.md"

