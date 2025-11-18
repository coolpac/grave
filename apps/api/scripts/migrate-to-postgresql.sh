#!/bin/bash

# Migration Script: SQLite to PostgreSQL
# 
# This script helps migrate your database from SQLite to PostgreSQL
# 
# Usage:
#   1. Ensure PostgreSQL is running and accessible
#   2. Set DATABASE_URL to PostgreSQL connection string
#   3. Run: ./migrate-to-postgresql.sh
#
# WARNING: This will create a new database. Make sure to backup your SQLite data first!

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SQLite to PostgreSQL Migration Tool${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
  echo ""
  echo "Please set DATABASE_URL to your PostgreSQL connection string:"
  echo "  export DATABASE_URL='postgresql://user:password@localhost:5432/dbname?schema=public'"
  echo ""
  exit 1
fi

# Check if DATABASE_URL is PostgreSQL
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
  echo -e "${RED}Error: DATABASE_URL must be a PostgreSQL connection string${NC}"
  echo "Current value: $DATABASE_URL"
  exit 1
fi

# Check if SQLite database exists
SQLITE_DB="./prisma/dev.db"
if [ ! -f "$SQLITE_DB" ]; then
  echo -e "${YELLOW}Warning: SQLite database not found at $SQLITE_DB${NC}"
  echo "If you're starting fresh, you can skip this step."
  read -p "Continue anyway? (yes/no): " -r
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    exit 0
  fi
fi

echo -e "${GREEN}Step 1: Backup SQLite database${NC}"
if [ -f "$SQLITE_DB" ]; then
  BACKUP_FILE="./prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$SQLITE_DB" "$BACKUP_FILE"
  echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
  echo -e "${YELLOW}⚠ Skipping backup (SQLite DB not found)${NC}"
fi

echo ""
echo -e "${GREEN}Step 2: Switch to PostgreSQL schema${NC}"
SCHEMA_FILE="./prisma/schema.postgresql.prisma"
if [ ! -f "$SCHEMA_FILE" ]; then
  echo -e "${RED}Error: PostgreSQL schema file not found: $SCHEMA_FILE${NC}"
  exit 1
fi

# Backup current schema
cp ./prisma/schema.prisma ./prisma/schema.prisma.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Current schema backed up${NC}"

# Copy PostgreSQL schema
cp "$SCHEMA_FILE" ./prisma/schema.prisma
echo -e "${GREEN}✓ PostgreSQL schema activated${NC}"

echo ""
echo -e "${GREEN}Step 3: Generate Prisma Client${NC}"
cd "$(dirname "$0")/.."
pnpm prisma:generate
echo -e "${GREEN}✓ Prisma Client generated${NC}"

echo ""
echo -e "${GREEN}Step 4: Create database migration${NC}"
echo -e "${YELLOW}This will create a new migration for PostgreSQL${NC}"
read -p "Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]; then
  echo "Migration cancelled"
  exit 0
fi

pnpm prisma migrate dev --name init_postgresql
echo -e "${GREEN}✓ Migration created${NC}"

echo ""
echo -e "${GREEN}Step 5: Seed database (optional)${NC}"
read -p "Run seed script? (yes/no): " -r
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  pnpm prisma:seed
  echo -e "${GREEN}✓ Database seeded${NC}"
else
  echo -e "${YELLOW}⚠ Skipping seed${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Migration completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Verify your data: pnpm prisma studio"
echo "2. Test your application: pnpm start:dev"
echo "3. If everything works, you can remove SQLite files:"
echo "   - rm ./prisma/dev.db"
echo "   - rm ./prisma/dev.db-journal"
echo ""
echo -e "${YELLOW}To rollback:${NC}"
echo "1. Restore schema: cp ./prisma/schema.prisma.backup.* ./prisma/schema.prisma"
echo "2. Update DATABASE_URL to SQLite: file:./prisma/dev.db"
echo "3. Run: pnpm prisma:generate"
echo ""

