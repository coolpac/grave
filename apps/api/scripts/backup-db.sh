#!/bin/bash

# Database Backup Script for PostgreSQL
# Usage: ./backup-db.sh [backup_name]
# 
# This script creates a backup of the PostgreSQL database
# Backups are stored in ./backups/ directory
# 
# Requirements:
# - PostgreSQL client tools (pg_dump)
# - DATABASE_URL environment variable set
# - Or individual connection parameters

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${1:-backup_${TIMESTAMP}}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to extract connection details from DATABASE_URL
parse_database_url() {
  local url="$1"
  
  if [[ "$url" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    export PGUSER="${BASH_REMATCH[1]}"
    export PGPASSWORD="${BASH_REMATCH[2]}"
    export PGHOST="${BASH_REMATCH[3]}"
    export PGPORT="${BASH_REMATCH[4]}"
    export PGDATABASE="${BASH_REMATCH[5]%%\?*}"  # Remove query string
  else
    echo -e "${RED}Error: Invalid DATABASE_URL format${NC}"
    exit 1
  fi
}

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${YELLOW}Warning: DATABASE_URL not set. Trying individual parameters...${NC}"
  
  # Try to use individual parameters
  if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
    echo -e "${RED}Error: Either DATABASE_URL or POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB must be set${NC}"
    exit 1
  fi
  
  export PGUSER="${POSTGRES_USER}"
  export PGPASSWORD="${POSTGRES_PASSWORD}"
  export PGHOST="${POSTGRES_HOST:-localhost}"
  export PGPORT="${POSTGRES_PORT:-5432}"
  export PGDATABASE="${POSTGRES_DB}"
else
  parse_database_url "$DATABASE_URL"
fi

# Backup file paths
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"
BACKUP_FILE_COMPRESSED="${BACKUP_FILE}.gz"

echo -e "${GREEN}Starting database backup...${NC}"
echo "Database: $PGDATABASE"
echo "Host: $PGHOST:$PGPORT"
echo "User: $PGUSER"
echo "Backup file: $BACKUP_FILE_COMPRESSED"

# Perform backup with compression
if pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  --verbose \
  | gzip > "$BACKUP_FILE_COMPRESSED"; then
  
  # Get backup size
  BACKUP_SIZE=$(du -h "$BACKUP_FILE_COMPRESSED" | cut -f1)
  
  echo -e "${GREEN}✓ Backup completed successfully!${NC}"
  echo "Backup size: $BACKUP_SIZE"
  echo "Location: $BACKUP_FILE_COMPRESSED"
  
  # Create a symlink to latest backup
  LATEST_LINK="${BACKUP_DIR}/latest.sql.gz"
  ln -sf "$(basename "$BACKUP_FILE_COMPRESSED")" "$LATEST_LINK"
  echo "Latest backup link: $LATEST_LINK"
  
else
  echo -e "${RED}✗ Backup failed!${NC}"
  exit 1
fi

# Cleanup old backups (older than RETENTION_DAYS)
if [ -d "$BACKUP_DIR" ]; then
  echo -e "${YELLOW}Cleaning up backups older than $RETENTION_DAYS days...${NC}"
  find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
  echo -e "${GREEN}✓ Cleanup completed${NC}"
fi

# List recent backups
echo -e "\n${GREEN}Recent backups:${NC}"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -5 || echo "No backups found"

echo -e "\n${GREEN}Backup process completed!${NC}"

