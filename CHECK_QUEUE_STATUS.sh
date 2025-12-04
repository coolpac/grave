#!/bin/bash

# Скрипт для проверки статуса очереди уведомлений на сервере

echo "🔍 Checking queue status..."

cd /opt/ritual-app

# Проверка логов процессора
echo ""
echo "📋 Recent processor logs:"
docker-compose -f docker-compose.production.yml logs --tail=50 api | grep -E 'TelegramNotificationProcessor|Processing Telegram notification|queue status'

# Проверка Redis очереди
echo ""
echo "📊 Redis queue status:"
docker-compose -f docker-compose.production.yml exec -T redis redis-cli -a "$(docker-compose -f docker-compose.production.yml exec -T api printenv REDIS_PASSWORD | tr -d '\r')" << 'EOF'
KEYS bull:telegram-notification:*
LLEN bull:telegram-notification:waiting
LLEN bull:telegram-notification:active
LLEN bull:telegram-notification:completed
LLEN bull:telegram-notification:failed
EOF

# Проверка последних задач
echo ""
echo "📝 Recent notification jobs:"
docker-compose -f docker-compose.production.yml logs --tail=100 api | grep -E 'notification job added|Processing Telegram notification|notification.*sent|notification.*failed'

echo ""
echo "✅ Check complete!"





