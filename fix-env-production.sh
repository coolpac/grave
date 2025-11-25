#!/bin/bash

# Скрипт для исправления .env.production
# Устанавливает пустые значения для опциональных токенов, если они не заданы

ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Файл $ENV_FILE не найден!"
    echo "Создайте его из шаблона: cp env.production.template .env.production"
    exit 1
fi

echo "🔧 Исправление .env.production..."

# Если CUSTOMER_BOT_TOKEN не установлен или пустой, устанавливаем пустую строку
if ! grep -q "^CUSTOMER_BOT_TOKEN=" "$ENV_FILE"; then
    echo "CUSTOMER_BOT_TOKEN=" >> "$ENV_FILE"
    echo "✓ Добавлен CUSTOMER_BOT_TOKEN="
elif grep -q "^CUSTOMER_BOT_TOKEN=$" "$ENV_FILE" || grep -q "^CUSTOMER_BOT_TOKEN=\"\"" "$ENV_FILE"; then
    echo "✓ CUSTOMER_BOT_TOKEN уже пустой"
else
    echo "ℹ CUSTOMER_BOT_TOKEN уже установлен"
fi

# Если ADMIN_BOT_TOKEN не установлен или пустой, устанавливаем пустую строку
if ! grep -q "^ADMIN_BOT_TOKEN=" "$ENV_FILE"; then
    echo "ADMIN_BOT_TOKEN=" >> "$ENV_FILE"
    echo "✓ Добавлен ADMIN_BOT_TOKEN="
elif grep -q "^ADMIN_BOT_TOKEN=$" "$ENV_FILE" || grep -q "^ADMIN_BOT_TOKEN=\"\"" "$ENV_FILE"; then
    echo "✓ ADMIN_BOT_TOKEN уже пустой"
else
    echo "ℹ ADMIN_BOT_TOKEN уже установлен"
fi

# Проверяем DATABASE_URL
if ! grep -q "^DATABASE_URL=" "$ENV_FILE"; then
    echo "⚠️  DATABASE_URL не установлен в .env.production"
    echo "   Это нормально, если используется docker-compose (DATABASE_URL берется оттуда)"
fi

echo ""
echo "✅ Готово! Теперь можно задеплоить:"
echo "   ./quick-deploy.sh"


