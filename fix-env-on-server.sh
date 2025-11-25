#!/bin/bash

# Скрипт для исправления .env.production на сервере
# Использование: ./fix-env-on-server.sh

SERVER="root@94.241.141.194"
APP_DIR="/opt/ritual-app"
ENV_FILE="$APP_DIR/.env.production"

echo "🔧 Исправление .env.production на сервере..."
echo ""

# Подключаемся к серверу и исправляем .env
ssh $SERVER << 'ENDSSH'
cd /opt/ritual-app

echo "📝 Текущий .env.production:"
echo "---"
cat .env.production | grep -E "(CUSTOMER_BOT_TOKEN|ADMIN_BOT_TOKEN|DATABASE_URL)" || echo "Переменные не найдены"
echo "---"
echo ""

# Создаем резервную копию
cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Создана резервная копия"

# Исправляем CUSTOMER_BOT_TOKEN - если не установлен или пустой, устанавливаем пустую строку
if ! grep -q "^CUSTOMER_BOT_TOKEN=" .env.production; then
    echo "CUSTOMER_BOT_TOKEN=" >> .env.production
    echo "✓ Добавлен CUSTOMER_BOT_TOKEN="
elif grep -q "^CUSTOMER_BOT_TOKEN=$" .env.production || grep -q "^CUSTOMER_BOT_TOKEN=\"\"" .env.production; then
    echo "✓ CUSTOMER_BOT_TOKEN уже пустой"
else
    # Если установлен, но нужно сделать пустым, комментируем или заменяем
    sed -i 's/^CUSTOMER_BOT_TOKEN=.*/CUSTOMER_BOT_TOKEN=/' .env.production
    echo "✓ CUSTOMER_BOT_TOKEN установлен как пустой"
fi

# Исправляем ADMIN_BOT_TOKEN
if ! grep -q "^ADMIN_BOT_TOKEN=" .env.production; then
    echo "ADMIN_BOT_TOKEN=" >> .env.production
    echo "✓ Добавлен ADMIN_BOT_TOKEN="
elif grep -q "^ADMIN_BOT_TOKEN=$" .env.production || grep -q "^ADMIN_BOT_TOKEN=\"\"" .env.production; then
    echo "✓ ADMIN_BOT_TOKEN уже пустой"
else
    sed -i 's/^ADMIN_BOT_TOKEN=.*/ADMIN_BOT_TOKEN=/' .env.production
    echo "✓ ADMIN_BOT_TOKEN установлен как пустой"
fi

echo ""
echo "📝 Обновленный .env.production:"
echo "---"
cat .env.production | grep -E "(CUSTOMER_BOT_TOKEN|ADMIN_BOT_TOKEN|DATABASE_URL)" || echo "Переменные не найдены"
echo "---"
echo ""

echo "🔄 Перезапуск контейнеров..."
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

echo ""
echo "⏳ Ожидание запуска API (10 секунд)..."
sleep 10

echo ""
echo "📊 Статус контейнеров:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "📋 Последние логи API:"
docker-compose -f docker-compose.production.yml logs api --tail 20

ENDSSH

echo ""
echo "✅ Готово! Проверьте логи выше."
echo ""
echo "💡 Если API все еще не запускается, проверьте:"
echo "   1. ssh $SERVER 'cd $APP_DIR && docker-compose -f docker-compose.production.yml logs api'"
echo "   2. ssh $SERVER 'cd $APP_DIR && docker-compose -f docker-compose.production.yml ps'"
