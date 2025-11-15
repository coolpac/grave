#!/bin/bash

# Скрипт для запуска обоих ботов

echo "🚀 Запуск Telegram ботов..."

# Загружаем переменные окружения
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  Файл .env не найден. Создайте его на основе .env.example"
    exit 1
fi

# Проверяем наличие Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не установлен"
    exit 1
fi

# Устанавливаем зависимости
echo "📦 Установка зависимостей..."
pip3 install -r requirements.txt

# Запускаем боты в фоне
echo "🤖 Запуск Customer Bot на порту 8001..."
python3 customer_bot.py &
CUSTOMER_PID=$!

echo "🤖 Запуск Admin Bot на порту 8002..."
python3 admin_bot.py &
ADMIN_PID=$!

echo "✅ Боты запущены!"
echo "   Customer Bot PID: $CUSTOMER_PID"
echo "   Admin Bot PID: $ADMIN_PID"
echo ""
echo "Для остановки используйте: kill $CUSTOMER_PID $ADMIN_PID"

# Ожидание завершения
wait

