#!/bin/bash

# Скрипт для запуска всех ботов

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

# Запускаем бот для автоматических напоминаний о брошенных корзинах
if [ -f abandoned_cart_bot.py ]; then
    echo "🤖 Запуск Abandoned Cart Bot..."
    python3 abandoned_cart_bot.py &
    ABANDONED_CART_PID=$!
    echo "   Abandoned Cart Bot PID: $ABANDONED_CART_PID"
else
    echo "⚠️  abandoned_cart_bot.py не найден, пропускаем"
    ABANDONED_CART_PID=""
fi

echo "✅ Боты запущены!"
echo "   Customer Bot PID: $CUSTOMER_PID"
echo "   Admin Bot PID: $ADMIN_PID"
if [ ! -z "$ABANDONED_CART_PID" ]; then
    echo "   Abandoned Cart Bot PID: $ABANDONED_CART_PID"
fi
echo ""
if [ ! -z "$ABANDONED_CART_PID" ]; then
    echo "Для остановки используйте: kill $CUSTOMER_PID $ADMIN_PID $ABANDONED_CART_PID"
else
    echo "Для остановки используйте: kill $CUSTOMER_PID $ADMIN_PID"
fi

# Ожидание завершения
wait

