#!/bin/bash

# Скрипт для завершения настройки HTTPS на сервере
# Использование: выполните на сервере после получения SSL сертификатов

set -e

PROJECT_DIR="/opt/ritual-app"

echo "🔒 Завершение настройки HTTPS"
echo ""

cd "$PROJECT_DIR" || exit 1

# 1. Проверка наличия сертификатов
echo "1. Проверка SSL сертификатов..."
if [ ! -f "ssl/fullchain.pem" ] || [ ! -f "ssl/privkey.pem" ]; then
    echo "✗ Сертификаты не найдены в ssl/"
    echo "  Выполните: ./setup-ssl.sh"
    exit 1
fi
echo "✓ Сертификаты найдены"

# 2. Проверка docker-compose.production.yml
echo ""
echo "2. Проверка docker-compose.production.yml..."
if ! grep -q "ssl:/etc/nginx/ssl:ro" docker-compose.production.yml; then
    echo "⚠ docker-compose.production.yml не содержит монтирование SSL"
    echo "  Обновляю конфигурацию..."
    
    # Создаем backup
    cp docker-compose.production.yml docker-compose.production.yml.backup
    
    # Добавляем volumes для SSL (если их нет)
    if ! grep -q "volumes:" docker-compose.production.yml | grep -A 5 "web:" | grep -q "volumes:"; then
        # Находим секцию web и добавляем volumes
        sed -i '/container_name: ritual_web/,/healthcheck:/ {
            /ports:/a\
    volumes:\
      - ./ssl:/etc/nginx/ssl:ro\
      - /var/www/certbot:/var/www/certbot:ro
        }' docker-compose.production.yml
    fi
    
    echo "✓ Конфигурация обновлена"
else
    echo "✓ Конфигурация уже содержит монтирование SSL"
fi

# 3. Пересборка web контейнера
echo ""
echo "3. Пересборка web контейнера..."
docker-compose -f docker-compose.production.yml build web

# 4. Запуск web контейнера
echo ""
echo "4. Запуск web контейнера..."
docker-compose -f docker-compose.production.yml up -d web

# 5. Проверка статуса
echo ""
echo "5. Проверка статуса контейнеров..."
docker-compose -f docker-compose.production.yml ps

# 6. Проверка логов
echo ""
echo "6. Проверка логов web контейнера (последние 20 строк)..."
docker-compose -f docker-compose.production.yml logs --tail=20 web

# 7. Проверка HTTPS
echo ""
echo "7. Проверка HTTPS..."
sleep 3
if curl -k -I https://localhost 2>&1 | grep -q "HTTP"; then
    echo "✓ HTTPS работает!"
else
    echo "⚠ HTTPS может быть не настроен. Проверьте логи выше."
fi

echo ""
echo "=========================================="
echo "✅ Настройка HTTPS завершена!"
echo "=========================================="
echo ""
echo "Проверьте:"
echo "  - HTTPS: curl -I https://optmramor.ru"
echo "  - Редирект: curl -I http://optmramor.ru"
echo ""

