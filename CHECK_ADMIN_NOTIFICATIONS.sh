#!/bin/bash

# Скрипт для проверки и исправления настроек админских уведомлений

echo "🔍 Checking admin notification settings..."

cd /opt/ritual-app

# Проверка ADMIN_CHAT_ID в .env
echo ""
echo "📋 Current ADMIN_CHAT_ID:"
ADMIN_CHAT_ID=$(docker-compose -f docker-compose.production.yml exec -T admin-bot printenv ADMIN_CHAT_ID | tr -d '\r' || echo "")
TELEGRAM_MANAGER_CHAT_ID=$(docker-compose -f docker-compose.production.yml exec -T admin-bot printenv TELEGRAM_MANAGER_CHAT_ID | tr -d '\r' || echo "")

if [ -z "$ADMIN_CHAT_ID" ] && [ -z "$TELEGRAM_MANAGER_CHAT_ID" ]; then
    echo "❌ ADMIN_CHAT_ID and TELEGRAM_MANAGER_CHAT_ID are not set!"
    echo ""
    echo "To fix this, edit .env file and set:"
    echo "  TELEGRAM_MANAGER_CHAT_ID=YOUR_TELEGRAM_ID"
    echo ""
    echo "To get your Telegram ID:"
    echo "  1. Send a message to @userinfobot in Telegram"
    echo "  2. Copy your ID from the bot's response"
    echo "  3. Set it in .env file"
elif [ "$ADMIN_CHAT_ID" = "123456789" ] || [ "$TELEGRAM_MANAGER_CHAT_ID" = "123456789" ]; then
    echo "⚠️  ADMIN_CHAT_ID is set to default value (123456789) - this is incorrect!"
    echo ""
    echo "To fix this, edit .env file and set:"
    echo "  TELEGRAM_MANAGER_CHAT_ID=YOUR_ACTUAL_TELEGRAM_ID"
else
    echo "✅ ADMIN_CHAT_ID: ${ADMIN_CHAT_ID:-$TELEGRAM_MANAGER_CHAT_ID}"
fi

# Проверка логов админ бота
echo ""
echo "📋 Recent admin bot logs:"
docker-compose -f docker-compose.production.yml logs --tail=50 admin-bot | grep -E 'notify|notification|ADMIN_CHAT_ID|Failed|Error|Forbidden'

# Проверка логов API при отправке уведомлений
echo ""
echo "📋 Recent API notification logs:"
docker-compose -f docker-compose.production.yml logs --tail=50 api | grep -E 'admin.*notification|notifyAdmin|Failed to send admin'

# Тест отправки уведомления
echo ""
echo "🧪 Testing admin bot endpoint:"
curl -X POST http://localhost:8002/notify/admin \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "TEST-123",
    "orderId": 999,
    "customerName": "Test Customer",
    "customerPhone": "+79991234567",
    "items": "Test Item - 1 шт. × 1000 ₽",
    "total": 1000
  }' 2>/dev/null | jq '.' || echo "❌ Failed to send test notification"

echo ""
echo "✅ Check complete!"
echo ""
echo "If notifications still don't work:"
echo "1. Check ADMIN_CHAT_ID is set correctly in .env"
echo "2. Make sure you've sent /start to the admin bot"
echo "3. Check admin bot logs: docker-compose -f docker-compose.production.yml logs -f admin-bot"



