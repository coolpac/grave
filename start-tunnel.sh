#!/bin/bash

# Скрипт для запуска API с Cloudflare Tunnel

echo "🚀 Запуск API сервера..."
cd apps/api
pnpm start:dev &
API_PID=$!

echo "⏳ Ожидание запуска API (5 секунд)..."
sleep 5

echo "🌐 Запуск Cloudflare Tunnel..."
echo "📋 URL будет показан ниже. Используйте его для доступа к API."
echo ""

# Запускаем туннель
cloudflared tunnel --url http://localhost:3000

# При завершении убиваем API
trap "echo '🛑 Остановка API...'; kill $API_PID 2>/dev/null" EXIT



