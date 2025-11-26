#!/bin/bash
# Скрипт для получения админ-токена

# Ваш Telegram ID (получить у @userinfobot)
TELEGRAM_ID="${1:-150341162}"

echo "🔐 Получение токена для Telegram ID: $TELEGRAM_ID"

# Способ 1: Через wget (обычно установлен)
if command -v wget &> /dev/null; then
    echo "Используем wget..."
    TOKEN=$(wget -qO- --post-data="" "http://localhost:3000/api/auth/admin-token?telegramId=$TELEGRAM_ID" 2>/dev/null)
    echo "$TOKEN"
    exit 0
fi

# Способ 2: Через curl
if command -v curl &> /dev/null; then
    echo "Используем curl..."
    TOKEN=$(curl -s -X POST "http://localhost:3000/api/auth/admin-token?telegramId=$TELEGRAM_ID")
    echo "$TOKEN"
    exit 0
fi

# Способ 3: Через Python (всегда есть в Docker)
echo "Используем Python..."
python3 << EOF
import urllib.request
import json

url = "http://localhost:3000/api/auth/admin-token?telegramId=$TELEGRAM_ID"
req = urllib.request.Request(url, method='POST')
try:
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2))
        if 'access_token' in data:
            print(f"\n✅ Ваш токен:\n{data['access_token']}")
except Exception as e:
    print(f"❌ Ошибка: {e}")
EOF
