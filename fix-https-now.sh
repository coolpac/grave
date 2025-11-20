#!/bin/bash

# Скрипт для исправления HTTPS на сервере
# Выполните на сервере

set -e

PROJECT_DIR="/opt/ritual-app"

echo "🔧 Исправление HTTPS"
echo ""

cd "$PROJECT_DIR" || exit 1

# 1. Проверка SSL сертификатов
echo "1. Проверка SSL сертификатов..."
if [ ! -f "ssl/fullchain.pem" ] || [ ! -f "ssl/privkey.pem" ]; then
    echo "✗ Сертификаты не найдены!"
    echo "  Выполните: ./setup-ssl.sh"
    exit 1
fi
echo "✓ Сертификаты найдены"

# 2. Проверка docker-compose.production.yml
echo ""
echo "2. Проверка docker-compose.production.yml..."
if ! grep -A 15 "container_name: ritual_web" docker-compose.production.yml | grep -q "volumes:"; then
    echo "⚠ volumes не настроены для web контейнера"
    echo "  Добавляю volumes..."
    
    # Создаем backup
    cp docker-compose.production.yml docker-compose.production.yml.backup.$(date +%Y%m%d_%H%M%S)
    
    # Добавляем volumes после ports
    sed -i '/ports:/a\
    volumes:\
      - ./ssl:/etc/nginx/ssl:ro\
      - /var/www/certbot:/var/www/certbot:ro
' docker-compose.production.yml
    
    echo "✓ volumes добавлены"
else
    echo "✓ volumes уже настроены"
fi

# 3. Проверка логов nginx
echo ""
echo "3. Проверка логов web контейнера..."
docker-compose -f docker-compose.production.yml logs --tail=30 web

# 4. Проверка конфигурации nginx внутри контейнера
echo ""
echo "4. Проверка конфигурации nginx..."
docker-compose -f docker-compose.production.yml exec web nginx -t 2>&1 || echo "⚠ Ошибка конфигурации nginx"

# 5. Проверка наличия сертификатов в контейнере
echo ""
echo "5. Проверка сертификатов в контейнере..."
docker-compose -f docker-compose.production.yml exec web ls -la /etc/nginx/ssl/ 2>&1 || echo "⚠ Директория /etc/nginx/ssl не найдена"

# 6. Пересборка и перезапуск
echo ""
echo "6. Пересборка web контейнера..."
docker-compose -f docker-compose.production.yml build web

echo ""
echo "7. Перезапуск web контейнера..."
docker-compose -f docker-compose.production.yml up -d web

# 7. Ожидание запуска
echo ""
echo "8. Ожидание запуска nginx..."
sleep 5

# 8. Проверка статуса
echo ""
echo "9. Статус контейнеров:"
docker-compose -f docker-compose.production.yml ps

# 9. Проверка логов после перезапуска
echo ""
echo "10. Логи web контейнера (последние 20 строк):"
docker-compose -f docker-compose.production.yml logs --tail=20 web

# 10. Проверка портов
echo ""
echo "11. Проверка портов:"
netstat -tlnp | grep -E ':(80|443)' || ss -tlnp | grep -E ':(80|443)'

# 11. Проверка HTTPS локально
echo ""
echo "12. Проверка HTTPS локально:"
curl -k -I https://localhost 2>&1 | head -5 || echo "⚠ HTTPS не работает"

echo ""
echo "=========================================="
echo "✅ Проверка завершена"
echo "=========================================="

