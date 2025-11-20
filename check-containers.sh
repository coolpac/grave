#!/bin/bash

# Проверка статуса контейнеров на сервере
# Usage: ./check-containers.sh

SERVER_IP="94.241.141.194"
DEPLOY_USER="root"

echo "🔍 Проверка контейнеров на сервере..."
echo ""

# Пробуем подключиться и проверить контейнеры
ssh -o ConnectTimeout=5 ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH' 2>&1 || echo "❌ Не удалось подключиться. Проверьте SSH доступ."
    cd /opt/ritual-app 2>/dev/null || { echo "❌ Директория /opt/ritual-app не найдена"; exit 1; }
    
    echo "📦 Статус контейнеров:"
    docker-compose -f docker-compose.production.yml ps 2>/dev/null || docker ps -a | grep ritual
    
    echo ""
    echo "📋 Логи API (последние 20 строк):"
    docker-compose -f docker-compose.production.yml logs --tail 20 api 2>/dev/null || docker logs --tail 20 ritual_api 2>/dev/null || echo "Контейнер API не найден"
    
    echo ""
    echo "📋 Логи Web (последние 20 строк):"
    docker-compose -f docker-compose.production.yml logs --tail 20 web 2>/dev/null || docker logs --tail 20 ritual_web 2>/dev/null || echo "Контейнер Web не найден"
ENDSSH

echo ""
echo "💡 Если контейнеры не запущены, выполните:"
echo "   ssh ${DEPLOY_USER}@${SERVER_IP}"
echo "   cd /opt/ritual-app"
echo "   docker-compose -f docker-compose.production.yml up -d"


