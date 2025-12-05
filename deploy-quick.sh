#!/bin/bash
# Быстрый деплой ritual-app на продакшн
# Использование: ./deploy-quick.sh [--seed] [--admin] [--all]
# ============================================
# БЫСТРЫЙ ДЕПЛОЙ - только rsync + rebuild
# ============================================
# Использование: ./deploy-quick.sh [service]
# 
# Примеры:
#   ./deploy-quick.sh           # Обновить всё
#   ./deploy-quick.sh web       # Только frontend
#   ./deploy-quick.sh api       # Только backend  
#   ./deploy-quick.sh bots      # Только боты
#   ./deploy-quick.sh --seed    # Деплой + засев товаров

set -e

SERVER_IP="94.241.141.194"
DEPLOY_USER="root"
PROJECT_DIR="/opt/ritual-app"
SERVICE="${1:-all}"

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Быстрый деплой: ${SERVICE}${NC}"

# 1. Синхронизация файлов
echo -e "${YELLOW}📂 Синхронизация файлов...${NC}"
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '.env.production' \
    --exclude 'postgres_data' \
    --exclude 'redis_data' \
    ./ ${DEPLOY_USER}@${SERVER_IP}:${PROJECT_DIR}/

echo -e "${GREEN}✓ Файлы синхронизированы${NC}"

# 2. Пересборка на сервере
echo -e "${YELLOW}🔨 Пересборка на сервере...${NC}"

case $SERVICE in
    web|frontend)
        ssh ${DEPLOY_USER}@${SERVER_IP} "cd ${PROJECT_DIR} && docker-compose -f docker-compose.production.yml build web && docker-compose -f docker-compose.production.yml up -d web"
        ;;
    api|backend)
        ssh ${DEPLOY_USER}@${SERVER_IP} \"cd ${PROJECT_DIR} && docker-compose -f docker-compose.production.yml build api && docker-compose -f docker-compose.production.yml up -d api && docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy\"
        ;;
    bots|bot)
        ssh ${DEPLOY_USER}@${SERVER_IP} "cd ${PROJECT_DIR} && docker-compose -f docker-compose.production.yml build customer-bot && docker-compose -f docker-compose.production.yml up -d customer-bot abandoned-cart-bot"
        ;;
    admin)
        ssh ${DEPLOY_USER}@${SERVER_IP} "cd ${PROJECT_DIR} && docker-compose -f docker-compose.production.yml build admin && docker-compose -f docker-compose.production.yml up -d admin && docker-compose -f docker-compose.production.yml exec nginx nginx -s reload"
        ;;
    --seed)
        # Только засев товаров (файлы должны быть уже синхронизированы)
        ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/ritual-app
echo "📦 Копируем seed.ts в контейнер..."
docker cp apps/api/prisma/seed.ts $(docker-compose -f docker-compose.production.yml ps -q api):/app/apps/api/prisma/seed.ts
echo "🌱 Запуск засева товаров..."
docker-compose -f docker-compose.production.yml exec -T api sh -c "cd /app/apps/api && npx tsx prisma/seed.ts"
ENDSSH
        ;;
    --admin-seed)
        # Пересборка админки + засев
        ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/ritual-app
echo "🏗️ Сборка админки..."
docker-compose -f docker-compose.production.yml build admin
docker-compose -f docker-compose.production.yml up -d admin
echo "📦 Копируем seed.ts в контейнер..."
docker cp apps/api/prisma/seed.ts $(docker-compose -f docker-compose.production.yml ps -q api):/app/apps/api/prisma/seed.ts
echo "🌱 Запуск засева товаров..."
docker-compose -f docker-compose.production.yml exec -T api sh -c "cd /app/apps/api && npx tsx prisma/seed.ts"
docker-compose -f docker-compose.production.yml exec nginx nginx -s reload
ENDSSH
        ;;
    all|*)
        ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/ritual-app
echo "🏗️ Сборка API..."
docker-compose -f docker-compose.production.yml build api
echo "🏗️ Сборка Web..."
docker-compose -f docker-compose.production.yml build web
echo "🤖 Сборка ботов..."
docker-compose -f docker-compose.production.yml build customer-bot || true
echo "🚀 Запуск сервисов..."
docker-compose -f docker-compose.production.yml up -d
echo "🗄️ Миграции prisma..."
docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy
echo "⏳ Ожидание запуска..."
sleep 5
docker-compose -f docker-compose.production.yml ps
ENDSSH
        ;;
esac

echo ""
echo -e "${GREEN}✅ Деплой завершён!${NC}"
echo ""
echo "📍 Frontend: http://${SERVER_IP}"
echo "📍 API:      http://${SERVER_IP}/api"
echo ""
echo "Полезные команды на сервере:"
echo "  ssh ${DEPLOY_USER}@${SERVER_IP}"
echo "  docker-compose -f docker-compose.production.yml logs -f [service]"
echo "  docker-compose -f docker-compose.production.yml restart [service]"
