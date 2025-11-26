#!/bin/bash
# Скрипт для засева товаров на сервере

set -e

cd /opt/ritual-app

echo "🌱 Засев товаров..."

# Способ 1: Через npm внутри контейнера
echo "Запуск сидинга через docker exec..."
docker-compose -f docker-compose.production.yml exec -T api npm run seed:products 2>/dev/null || {
    echo "npm run seed:products не найден, пробуем альтернативный способ..."
    
    # Способ 2: Через ts-node
    docker-compose -f docker-compose.production.yml exec -T api npx ts-node src/database/seeds/products.seed.ts 2>/dev/null || {
        echo "ts-node недоступен, пробуем через node..."
        
        # Способ 3: Через скомпилированный JS
        docker-compose -f docker-compose.production.yml exec -T api node dist/database/seeds/products.seed.js 2>/dev/null || {
            echo ""
            echo "❌ Автоматический сидинг не удался."
            echo ""
            echo "Попробуйте вручную:"
            echo "1. docker-compose -f docker-compose.production.yml exec api sh"
            echo "2. Внутри контейнера: npm run seed:products"
            echo ""
            echo "Или через API с токеном:"
            echo "curl -X POST http://localhost:3000/api/admin/seed-products -H 'Authorization: Bearer YOUR_TOKEN'"
            exit 1
        }
    }
}

echo "✅ Сидинг завершён!"
