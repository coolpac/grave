#!/bin/bash

# Database Restore Script for PostgreSQL
# Usage: ./restore-db.sh <backup_file>
# 
# This script restores a PostgreSQL database from a backup file
# 
# Requirements:
# - PostgreSQL client tools (psql)
# - DATABASE_URL environment variable set
# - Backup file (compressed .sql.gz or plain .sql)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ $# -eq 0 ]; then
  echo -e "${RED}Error: Backup file not specified${NC}"
  echo "Usage: $0 <backup_file>"
  echo "Example: $0 backups/backup_20241120_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

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

echo -e "${YELLOW}⚠ WARNING: This will restore the database from backup!${NC}"
echo "Database: $PGDATABASE"
echo "Host: $PGHOST:$PGPORT"
echo "User: $PGUSER"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${YELLOW}Restore cancelled${NC}"
  exit 0
fi

echo -e "${GREEN}Starting database restore...${NC}"

# Determine if backup is compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "Decompressing and restoring from compressed backup..."
  if gunzip -c "$BACKUP_FILE" | PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"; then
    echo -e "${GREEN}✓ Restore completed successfully!${NC}"
  else
    echo -e "${RED}✗ Restore failed!${NC}"
    exit 1
  fi
else
  echo "Restoring from plain SQL backup..."
  if PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" < "$BACKUP_FILE"; then
    echo -e "${GREEN}✓ Restore completed successfully!${NC}"
  else
    echo -e "${RED}✗ Restore failed!${NC}"
    exit 1
  fi
fi

echo -e "\n${GREEN}Restore process completed!${NC}"
echo -e "${YELLOW}Note: You may need to run migrations after restore:${NC}"
echo "  pnpm prisma migrate deploy"

