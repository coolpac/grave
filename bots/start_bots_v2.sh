#!/bin/bash

# ============================================
# Скрипт запуска Telegram ботов v2.0
# ============================================

set -e

echo "🚀 Запуск Telegram ботов v2.0..."

# Определяем директорию скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Загружаем переменные окружения
if [ -f .env ]; then
    echo "📦 Загрузка переменных из .env..."
    export $(cat .env | grep -v '^#' | xargs)
elif [ -f ../.env.production ]; then
    echo "📦 Загрузка переменных из ../.env.production..."
    export $(cat ../.env.production | grep -v '^#' | xargs)
else
    echo "⚠️  Файл .env не найден!"
    echo "   Создайте .env на основе .env.example"
    exit 1
fi

# Проверяем токены
if [ -z "$CUSTOMER_BOT_TOKEN" ] || [ "$CUSTOMER_BOT_TOKEN" = "YOUR_CUSTOMER_BOT_TOKEN_HERE" ]; then
    echo "❌ CUSTOMER_BOT_TOKEN не настроен!"
    echo "   Получите токен у @BotFather и добавьте в .env"
    exit 1
fi

if [ -z "$ADMIN_BOT_TOKEN" ] || [ "$ADMIN_BOT_TOKEN" = "YOUR_ADMIN_BOT_TOKEN_HERE" ]; then
    echo "⚠️  ADMIN_BOT_TOKEN не настроен (admin bot будет пропущен)"
fi

# Проверяем Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не найден"
    exit 1
fi

# Создаем виртуальное окружение если его нет
if [ ! -d "venv" ]; then
    echo "📦 Создание виртуального окружения..."
    python3 -m venv venv
fi

# Активируем виртуальное окружение
source venv/bin/activate

# Устанавливаем зависимости
echo "📦 Установка зависимостей..."
pip install -q -r requirements_v2.txt

# Создаем директорию для логов
mkdir -p logs

# Функция для остановки процессов
cleanup() {
    echo ""
    echo "🛑 Останавливаем ботов..."
    [ -n "$CUSTOMER_PID" ] && kill $CUSTOMER_PID 2>/dev/null
    [ -n "$ADMIN_PID" ] && kill $ADMIN_PID 2>/dev/null
    [ -n "$CART_PID" ] && kill $CART_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Запускаем Customer Bot
echo "🤖 Запуск Customer Bot на порту ${CUSTOMER_BOT_PORT:-8001}..."
python3 customer_bot_v2.py > logs/customer_bot.log 2>&1 &
CUSTOMER_PID=$!
echo "   PID: $CUSTOMER_PID"

# Даём время на запуск
sleep 2

# Запускаем Admin Bot (если токен настроен)
if [ -n "$ADMIN_BOT_TOKEN" ] && [ "$ADMIN_BOT_TOKEN" != "YOUR_ADMIN_BOT_TOKEN_HERE" ]; then
    echo "🤖 Запуск Admin Bot на порту ${ADMIN_BOT_PORT:-8002}..."
    python3 admin_bot_v2.py > logs/admin_bot.log 2>&1 &
    ADMIN_PID=$!
    echo "   PID: $ADMIN_PID"
    sleep 2
fi

# Запускаем Abandoned Cart Bot
echo "🤖 Запуск Abandoned Cart Bot на порту ${ABANDONED_CART_BOT_PORT:-8003}..."
python3 abandoned_cart_bot_v2.py > logs/abandoned_cart_bot.log 2>&1 &
CART_PID=$!
echo "   PID: $CART_PID"

echo ""
echo "✅ Боты запущены!"
echo ""
echo "📊 Статус:"
echo "   Customer Bot:       http://localhost:${CUSTOMER_BOT_PORT:-8001}/health"
[ -n "$ADMIN_PID" ] && echo "   Admin Bot:          http://localhost:${ADMIN_BOT_PORT:-8002}/health"
echo "   Abandoned Cart Bot: http://localhost:${ABANDONED_CART_BOT_PORT:-8003}/health"
echo ""
echo "📝 Логи:"
echo "   tail -f logs/customer_bot.log"
echo "   tail -f logs/admin_bot.log"
echo "   tail -f logs/abandoned_cart_bot.log"
echo ""
echo "🛑 Для остановки нажмите Ctrl+C"
echo ""

# Ожидаем завершения
wait
