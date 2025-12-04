#!/bin/bash

# Скрипт для проверки тестового заказа и всех логов

echo "🔍 Testing order notifications and checking logs..."
echo ""

cd /opt/ritual-app

# 1. Проверка настроек админов
echo "═══════════════════════════════════════════════════════════"
echo "1️⃣  Проверка настроек админов"
echo "═══════════════════════════════════════════════════════════"
ADMIN_CHAT_ID=$(docker-compose -f docker-compose.production.yml exec -T admin-bot printenv ADMIN_CHAT_ID 2>/dev/null | tr -d '\r' || echo "")
TELEGRAM_MANAGER_CHAT_ID=$(docker-compose -f docker-compose.production.yml exec -T admin-bot printenv TELEGRAM_MANAGER_CHAT_ID 2>/dev/null | tr -d '\r' || echo "")
ADMIN_WHITELIST=$(docker-compose -f docker-compose.production.yml exec -T admin-bot printenv ADMIN_WHITELIST 2>/dev/null | tr -d '\r' || echo "")

echo "ADMIN_CHAT_ID: ${ADMIN_CHAT_ID:-не установлен}"
echo "TELEGRAM_MANAGER_CHAT_ID: ${TELEGRAM_MANAGER_CHAT_ID:-не установлен}"
echo "ADMIN_WHITELIST: ${ADMIN_WHITELIST:-не установлен}"
echo ""

# 2. Проверка логов админ бота (последние 30 строк)
echo "═══════════════════════════════════════════════════════════"
echo "2️⃣  Логи админ бота (последние 30 строк)"
echo "═══════════════════════════════════════════════════════════"
docker-compose -f docker-compose.production.yml logs --tail=30 admin-bot | grep -E 'notify|notification|Admin|ADMIN|Processing|Sending|sent|Failed|Error|Forbidden|whitelist' || echo "Нет релевантных логов"
echo ""

# 3. Проверка логов API (уведомления)
echo "═══════════════════════════════════════════════════════════"
echo "3️⃣  Логи API - уведомления (последние 50 строк)"
echo "═══════════════════════════════════════════════════════════"
docker-compose -f docker-compose.production.yml logs --tail=50 api | grep -E 'notification|order_created|notifyAdmin|notifyCustomer|Processing Telegram|Admin notification|Customer notification' || echo "Нет релевантных логов"
echo ""

# 4. Проверка логов процессора очереди
echo "═══════════════════════════════════════════════════════════"
echo "4️⃣  Логи процессора очереди"
echo "═══════════════════════════════════════════════════════════"
docker-compose -f docker-compose.production.yml logs --tail=30 api | grep -E 'TelegramNotificationProcessor|Processing Telegram notification|Queue status' || echo "Нет релевантных логов"
echo ""

# 5. Тест отправки уведомления админу
echo "═══════════════════════════════════════════════════════════"
echo "5️⃣  Тест отправки уведомления админу"
echo "═══════════════════════════════════════════════════════════"
TEST_RESPONSE=$(curl -s -X POST http://localhost:8002/notify/admin \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "TEST-'$(date +%s)'",
    "orderId": 999,
    "customerName": "Тестовый Клиент",
    "customerPhone": "+79991234567",
    "customerEmail": "test@example.com",
    "customerAddress": "Тестовый адрес",
    "comment": "Тестовый заказ для проверки",
    "items": "  • Тестовый товар - 1 шт. × 1000 ₽",
    "total": 1000,
    "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }')

echo "Ответ от админ бота:"
echo "$TEST_RESPONSE" | jq '.' 2>/dev/null || echo "$TEST_RESPONSE"
echo ""

# 6. Проверка логов после теста (подождать 2 секунды)
echo "Ожидание 2 секунды для обработки..."
sleep 2

echo "═══════════════════════════════════════════════════════════"
echo "6️⃣  Логи админ бота после теста"
echo "═══════════════════════════════════════════════════════════"
docker-compose -f docker-compose.production.yml logs --tail=20 admin-bot | grep -E 'TEST-|notify|notification|Sending|sent|Failed|Error|Admin IDs' || echo "Нет новых логов"
echo ""

# 7. Проверка статуса очереди
echo "═══════════════════════════════════════════════════════════"
echo "7️⃣  Статус очереди уведомлений"
echo "═══════════════════════════════════════════════════════════"
docker-compose -f docker-compose.production.yml logs --tail=20 api | grep -E 'notification job added|Processing Telegram notification|notification.*sent|notification.*failed' | tail -5 || echo "Нет данных о очереди"
echo ""

# 8. Проверка здоровья ботов
echo "═══════════════════════════════════════════════════════════"
echo "8️⃣  Проверка здоровья ботов"
echo "═══════════════════════════════════════════════════════════"
echo "Customer Bot:"
curl -s http://localhost:8001/health | jq '.' 2>/dev/null || curl -s http://localhost:8001/health
echo ""
echo "Admin Bot:"
curl -s http://localhost:8002/health | jq '.' 2>/dev/null || curl -s http://localhost:8002/health
echo ""

# 9. Инструкции
echo "═══════════════════════════════════════════════════════════"
echo "📋 Инструкции для проверки"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Для мониторинга логов в реальном времени:"
echo "  # Логи админ бота:"
echo "  docker-compose -f docker-compose.production.yml logs -f admin-bot | grep -E 'notify|notification|sent|Failed'"
echo ""
echo "  # Логи API:"
echo "  docker-compose -f docker-compose.production.yml logs -f api | grep -E 'notification|order_created'"
echo ""
echo "  # Все логи админ бота:"
echo "  docker-compose -f docker-compose.production.yml logs -f admin-bot"
echo ""
echo "Для проверки настроек:"
echo "  # Проверить переменные окружения админ бота:"
echo "  docker-compose -f docker-compose.production.yml exec admin-bot env | grep -E 'ADMIN|TELEGRAM'"
echo ""
echo "Для получения вашего Telegram ID:"
echo "  1. Откройте Telegram"
echo "  2. Найдите бота @userinfobot"
echo "  3. Отправьте ему /start"
echo "  4. Скопируйте ваш ID"
echo "  5. Добавьте в .env: ADMIN_WHITELIST=ваш_id,другой_id"
echo ""
echo "✅ Проверка завершена!"





