#!/bin/bash

# Быстрое исправление .env на сервере
# Добавляет недостающие переменные окружения

SERVER="root@94.241.141.194"
APP_DIR="/opt/ritual-app"

echo "🔧 Исправление .env на сервере..."

ssh $SERVER << 'ENDSSH'
cd /opt/ritual-app

echo "📝 Текущие проблемные переменные:"
grep -E "^(SENTRY_DSN|CUSTOMER_BOT_TOKEN|ADMIN_BOT_TOKEN)=" .env || echo "Некоторые переменные отсутствуют"

# Создаем резервную копию
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Добавляем/исправляем SENTRY_DSN если отсутствует или пустой
if ! grep -q "^SENTRY_DSN=" .env; then
    echo "SENTRY_DSN=" >> .env
    echo "✓ Добавлен SENTRY_DSN="
fi

# Убедимся, что CUSTOMER_BOT_TOKEN есть (даже пустой)
if ! grep -q "^CUSTOMER_BOT_TOKEN=" .env; then
    echo "CUSTOMER_BOT_TOKEN=" >> .env
    echo "✓ Добавлен CUSTOMER_BOT_TOKEN="
fi

# Убедимся, что ADMIN_BOT_TOKEN есть (даже пустой)
if ! grep -q "^ADMIN_BOT_TOKEN=" .env; then
    echo "ADMIN_BOT_TOKEN=" >> .env
    echo "✓ Добавлен ADMIN_BOT_TOKEN="
fi

echo ""
echo "📝 Обновленные переменные:"
grep -E "^(SENTRY_DSN|CUSTOMER_BOT_TOKEN|ADMIN_BOT_TOKEN)=" .env

echo ""
echo "🔄 Перезапуск API..."
docker-compose -f docker-compose.production.yml restart api

echo ""
echo "⏳ Ожидание запуска (15 секунд)..."
sleep 15

echo ""
echo "📊 Статус сервисов:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "📋 Последние логи API:"
docker-compose -f docker-compose.production.yml logs api --tail=20
ENDSSH

echo ""
echo "✅ Готово! Проверьте https://optmramor.ru/api/health/live"



