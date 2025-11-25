#!/bin/bash

# Скрипт для проверки и исправления настроек на сервере
# Использование: ./check-and-fix-server.sh

SERVER="root@94.241.141.194"
APP_DIR="/opt/ritual-app"

echo "🔍 Проверка и исправление сервера..."
echo ""

ssh $SERVER << 'ENDSSH'
cd /opt/ritual-app

echo "=========================================="
echo "📋 ТЕКУЩИЕ НАСТРОЙКИ .env"
echo "=========================================="

echo ""
echo "🔐 Telegram токены:"
grep -E "^(BOT_TOKEN|CUSTOMER_BOT_TOKEN|ADMIN_BOT_TOKEN)=" .env | head -c 100
echo "..."
echo ""

echo "👥 Admin Whitelist:"
grep "^ADMIN_WHITELIST=" .env
echo ""

echo "🔧 JWT Secret (первые 10 символов):"
grep "^JWT_SECRET=" .env | cut -c1-20
echo "..."
echo ""

echo "🗄️ Database URL:"
grep "^DATABASE_URL=" .env | head -c 60
echo "..."
echo ""

echo "=========================================="
echo "📊 СТАТУС КОНТЕЙНЕРОВ"
echo "=========================================="
docker-compose -f docker-compose.production.yml ps

echo ""
echo "=========================================="
echo "🔄 ПЕРЕЗАПУСК API"
echo "=========================================="
docker-compose -f docker-compose.production.yml restart api

echo ""
echo "⏳ Ожидание запуска (20 секунд)..."
sleep 20

echo ""
echo "=========================================="
echo "📋 ПОСЛЕДНИЕ ЛОГИ API"
echo "=========================================="
docker-compose -f docker-compose.production.yml logs api --tail=30

ENDSSH

echo ""
echo "=========================================="
echo "✅ Проверка завершена"
echo "=========================================="
echo ""
echo "Если API работает, получите токен командой:"
echo "curl 'https://optmramor.ru/api/auth/admin-token?telegramId=ВАШ_TELEGRAM_ID'"
echo ""
echo "ВАШ_TELEGRAM_ID должен быть в ADMIN_WHITELIST в .env файле!"

