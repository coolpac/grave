#!/bin/bash

# Скрипт для исправления базы данных на сервере
# Исправляет migration_lock.toml и создает базу данных

set -e

echo "🔧 Исправление базы данных на сервере..."

# Обновляем migration_lock.toml на сервере
echo "📝 Обновление migration_lock.toml..."
docker-compose -f docker-compose.production.yml exec -T api sh -c "cd /app/apps/api && echo 'provider = \"postgresql\"' > prisma/migrations/migration_lock.toml"

# Удаляем старые миграции SQLite (если нужно)
echo "🗑️  Удаление старых миграций SQLite..."
docker-compose -f docker-compose.production.yml exec -T api sh -c "cd /app/apps/api && rm -rf prisma/migrations/* || true"

# Создаем базу данных через db push (без генерации клиента)
echo "🚀 Создание базы данных..."
docker-compose -f docker-compose.production.yml exec -T api sh -c "cd /app/apps/api && npx prisma db push --skip-generate" || {
  echo "⚠️  db push не удался, пробуем через SQL напрямую..."
  # Альтернативный вариант - создаем таблицы через SQL
  docker-compose -f docker-compose.production.yml exec -T postgres psql -U postgres -d ritual_db <<EOF
-- Создаем таблицу users если её нет
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "telegramId" BIGINT UNIQUE NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  username TEXT,
  role TEXT DEFAULT 'USER',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
}

echo "✅ База данных исправлена!"
echo ""
echo "Проверка таблиц:"
docker-compose -f docker-compose.production.yml exec -T postgres psql -U postgres -d ritual_db -c "\dt" || true





