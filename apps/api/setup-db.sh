#!/bin/bash

echo "🔧 Настройка базы данных для проекта"
echo ""
echo "Выберите вариант:"
echo "1) Docker PostgreSQL (рекомендуется)"
echo "2) Локальная PostgreSQL"
echo "3) Supabase (облачная БД)"
echo "4) Neon (облачная БД)"
echo ""
read -p "Ваш выбор (1-4): " choice

case $choice in
  1)
    echo "🐳 Запуск PostgreSQL в Docker..."
    docker run --name postgres-ritual \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=ritual_shop \
      -p 5432:5432 \
      -d postgres:15 2>/dev/null || docker start postgres-ritual
    
    echo "✅ PostgreSQL запущен!"
    echo "Обновляю DATABASE_URL в .env..."
    sed -i '' 's|DATABASE_URL=".*"|DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ritual_shop?schema=public"|' .env
    echo "✅ DATABASE_URL обновлен!"
    ;;
  2)
    echo "📦 Настройка локальной PostgreSQL..."
    read -p "Введите имя пользователя PostgreSQL (по умолчанию: postgres): " pg_user
    pg_user=${pg_user:-postgres}
    read -sp "Введите пароль: " pg_pass
    echo ""
    read -p "Введите хост (по умолчанию: localhost): " pg_host
    pg_host=${pg_host:-localhost}
    
    createdb -U $pg_user ritual_shop 2>/dev/null || echo "База данных уже существует или ошибка создания"
    
    sed -i '' "s|DATABASE_URL=\"postgresql://user:password@localhost:5432/ritual_shop?schema=public\"|DATABASE_URL=\"postgresql://$pg_user:$pg_pass@$pg_host:5432/ritual_shop?schema=public\"|" .env
    echo "✅ DATABASE_URL обновлен!"
    ;;
  3)
    echo "☁️  Настройка Supabase..."
    echo "1. Перейдите на https://supabase.com"
    echo "2. Создайте проект"
    echo "3. Перейдите в Settings → Database"
    echo "4. Скопируйте Connection String (URI)"
    echo ""
    read -p "Вставьте DATABASE_URL: " db_url
    sed -i '' "s|DATABASE_URL=\".*\"|DATABASE_URL=\"$db_url\"|" .env
    echo "✅ DATABASE_URL обновлен!"
    ;;
  4)
    echo "☁️  Настройка Neon..."
    echo "1. Перейдите на https://neon.tech"
    echo "2. Создайте проект"
    echo "3. Скопируйте Connection String"
    echo ""
    read -p "Вставьте DATABASE_URL: " db_url
    sed -i '' "s|DATABASE_URL=\".*\"|DATABASE_URL=\"$db_url\"|" .env
    echo "✅ DATABASE_URL обновлен!"
    ;;
  *)
    echo "❌ Неверный выбор"
    exit 1
    ;;
esac

echo ""
echo "🚀 Выполняю миграции..."
npx prisma migrate dev --name add_admin_features
npx prisma generate

echo ""
echo "✅ Готово! База данных настроена и миграции выполнены."
