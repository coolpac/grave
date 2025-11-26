#!/bin/bash
# ============================================
# ПОЛНЫЙ ЗАСЕВ БАЗЫ ДАННЫХ
# ============================================
# Создаёт категории и товары для мрамора/гранита
# 
# Использование:
#   ./seed-all.sh              # Локально (требует токен)
#   ./seed-all.sh --server     # На сервере через docker

set -e

SERVER_IP="94.241.141.194"
DEPLOY_USER="root"
PROJECT_DIR="/opt/ritual-app"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$1" == "--server" ]; then
    echo -e "${BLUE}🌱 Засев данных на сервере...${NC}"
    
    ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/ritual-app

echo "📦 Проверка статуса API..."
docker-compose -f docker-compose.production.yml ps api

echo ""
echo "🌱 Запуск Prisma Seed (категории + товары)..."

# Простой способ - использует prisma/seed.ts напрямую
docker-compose -f docker-compose.production.yml exec -T api sh -c "
cd /app/apps/api && npx tsx prisma/seed.ts
"

echo ""
echo "✅ Засев завершён!"
ENDSSH

else
    echo -e "${BLUE}🌱 Локальный засев данных...${NC}"
    echo ""
    
    if [ -z "$AUTH_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  AUTH_TOKEN не установлен!${NC}"
        echo ""
        echo "Как получить токен:"
        echo "1. Откройте http://localhost:3000/api/auth/dev-token"
        echo "2. Скопируйте access_token"
        echo "3. Запустите: export AUTH_TOKEN='ваш_токен'"
        echo "4. Запустите этот скрипт снова"
        echo ""
        echo "Или запустите на сервере: ./seed-all.sh --server"
        exit 1
    fi
    
    API_URL="${API_URL:-http://localhost:3000/api}"
    
    echo "📂 Создание категорий..."
    cd apps/api && npx tsx scripts/create-categories.ts
    
    echo ""
    echo "📦 Создание товаров..."
    npx tsx scripts/create-products-production.ts
    
    echo ""
    echo -e "${GREEN}✅ Засев завершён!${NC}"
fi
