#!/bin/bash

# Скрипт для выполнения НА СЕРВЕРЕ
# Исправляет проблему с отсутствующими переменными окружения

PROJECT_DIR="/opt/ritual-app"
ENV_FILE="${PROJECT_DIR}/.env"

echo "🔧 Исправление переменных окружения"
echo ""

cd "$PROJECT_DIR" || exit 1

# Проверка существования .env файла
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠ Файл .env не найден. Создаю из шаблона..."
    if [ -f "env.production.template" ]; then
        cp env.production.template "$ENV_FILE"
        echo "✓ Файл .env создан из шаблона"
    else
        echo "✗ Шаблон env.production.template не найден"
        exit 1
    fi
fi

echo "Текущие значения CUSTOMER_BOT_TOKEN и ADMIN_BOT_TOKEN:"
grep -E "CUSTOMER_BOT_TOKEN|ADMIN_BOT_TOKEN" "$ENV_FILE" || echo "  Переменные не найдены"
echo ""

# Проверка, есть ли BOT_TOKEN
BOT_TOKEN=$(grep "^BOT_TOKEN=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$BOT_TOKEN" ] || [ "$BOT_TOKEN" = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz" ]; then
    echo "⚠ BOT_TOKEN не установлен или имеет значение по умолчанию"
    echo "  Установите реальный токен от @BotFather"
    echo ""
fi

# Если CUSTOMER_BOT_TOKEN отсутствует или пустой, используем BOT_TOKEN
if ! grep -q "^CUSTOMER_BOT_TOKEN=" "$ENV_FILE" || grep "^CUSTOMER_BOT_TOKEN=$" "$ENV_FILE" || grep "^CUSTOMER_BOT_TOKEN=\"\"" "$ENV_FILE"; then
    echo "Добавляю CUSTOMER_BOT_TOKEN..."
    if [ -n "$BOT_TOKEN" ] && [ "$BOT_TOKEN" != "123456789:ABCdefGHIjklMNOpqrsTUVwxyz" ]; then
        # Если есть BOT_TOKEN, используем его
        if grep -q "^CUSTOMER_BOT_TOKEN=" "$ENV_FILE"; then
            sed -i "s|^CUSTOMER_BOT_TOKEN=.*|CUSTOMER_BOT_TOKEN=$BOT_TOKEN|" "$ENV_FILE"
        else
            echo "CUSTOMER_BOT_TOKEN=$BOT_TOKEN" >> "$ENV_FILE"
        fi
        echo "✓ CUSTOMER_BOT_TOKEN установлен в значение BOT_TOKEN"
    else
        # Иначе устанавливаем временное значение (API будет падать, но это лучше чем пустая строка)
        if grep -q "^CUSTOMER_BOT_TOKEN=" "$ENV_FILE"; then
            sed -i 's|^CUSTOMER_BOT_TOKEN=.*|CUSTOMER_BOT_TOKEN=PLACEHOLDER_REPLACE_WITH_REAL_TOKEN|' "$ENV_FILE"
        else
            echo "CUSTOMER_BOT_TOKEN=PLACEHOLDER_REPLACE_WITH_REAL_TOKEN" >> "$ENV_FILE"
        fi
        echo "⚠ CUSTOMER_BOT_TOKEN установлен в PLACEHOLDER - замените на реальный токен!"
    fi
fi

# Если ADMIN_BOT_TOKEN отсутствует или пустой, устанавливаем значение
if ! grep -q "^ADMIN_BOT_TOKEN=" "$ENV_FILE" || grep "^ADMIN_BOT_TOKEN=$" "$ENV_FILE" || grep "^ADMIN_BOT_TOKEN=\"\"" "$ENV_FILE"; then
    echo "Добавляю ADMIN_BOT_TOKEN..."
    if [ -n "$BOT_TOKEN" ] && [ "$BOT_TOKEN" != "123456789:ABCdefGHIjklMNOpqrsTUVwxyz" ]; then
        # Если есть BOT_TOKEN, используем его
        if grep -q "^ADMIN_BOT_TOKEN=" "$ENV_FILE"; then
            sed -i "s|^ADMIN_BOT_TOKEN=.*|ADMIN_BOT_TOKEN=$BOT_TOKEN|" "$ENV_FILE"
        else
            echo "ADMIN_BOT_TOKEN=$BOT_TOKEN" >> "$ENV_FILE"
        fi
        echo "✓ ADMIN_BOT_TOKEN установлен в значение BOT_TOKEN"
    else
        # Иначе устанавливаем временное значение
        if grep -q "^ADMIN_BOT_TOKEN=" "$ENV_FILE"; then
            sed -i 's|^ADMIN_BOT_TOKEN=.*|ADMIN_BOT_TOKEN=PLACEHOLDER_REPLACE_WITH_REAL_TOKEN|' "$ENV_FILE"
        else
            echo "ADMIN_BOT_TOKEN=PLACEHOLDER_REPLACE_WITH_REAL_TOKEN" >> "$ENV_FILE"
        fi
        echo "⚠ ADMIN_BOT_TOKEN установлен в PLACEHOLDER - замените на реальный токен!"
    fi
fi

echo ""
echo "Проверка результата:"
grep -E "CUSTOMER_BOT_TOKEN|ADMIN_BOT_TOKEN" "$ENV_FILE"
echo ""

# Проверка на PLACEHOLDER
if grep -q "PLACEHOLDER_REPLACE_WITH_REAL_TOKEN" "$ENV_FILE"; then
    echo "⚠ ВНИМАНИЕ: В файле есть PLACEHOLDER значения!"
    echo "  Замените их на реальные токены от @BotFather"
    echo ""
    echo "  Для редактирования:"
    echo "    nano $ENV_FILE"
    echo ""
fi

echo "=========================================="
echo "📋 СЛЕДУЮЩИЕ ШАГИ"
echo "=========================================="
echo ""
echo "1. Если есть PLACEHOLDER, замените на реальные токены:"
echo "   nano $ENV_FILE"
echo ""
echo "2. Перезапустите API контейнер:"
echo "   docker-compose -f docker-compose.production.yml restart api"
echo ""
echo "3. Проверьте логи:"
echo "   docker-compose -f docker-compose.production.yml logs -f api"
echo ""

