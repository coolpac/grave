#!/bin/bash

# Диагностика белой страницы
# Usage: ./debug-white-screen.sh

set -e

DOMAIN="optmramor.ru"
SERVER_IP="94.241.141.194"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_ok() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

echo "🔍 Диагностика белой страницы"
echo ""

# 1. Проверка HTML
print_info "Проверка HTML..."
HTML=$(curl -s "http://${DOMAIN}")
if echo "$HTML" | grep -q "id=\"root\""; then
    print_ok "HTML содержит div#root"
else
    print_error "HTML не содержит div#root"
fi

# 2. Проверка JS файлов
print_info "Проверка JS файлов..."
JS_FILES=$(echo "$HTML" | grep -oP 'src="[^"]*\.js"' | sed 's/src="//;s/"//' | head -5)
for js in $JS_FILES; do
    if curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}${js}" | grep -q "200"; then
        print_ok "JS файл доступен: ${js}"
    else
        print_error "JS файл недоступен: ${js}"
    fi
done

# 3. Проверка CSS файлов
print_info "Проверка CSS файлов..."
CSS_FILES=$(echo "$HTML" | grep -oP 'href="[^"]*\.css"' | sed 's/href="//;s/"//' | head -5)
for css in $CSS_FILES; do
    if curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}${css}" | grep -q "200"; then
        print_ok "CSS файл доступен: ${css}"
    else
        print_error "CSS файл недоступен: ${css}"
    fi
done

# 4. Проверка API
print_info "Проверка API..."
if curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}/api/health" | grep -q "200\|404"; then
    API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}/api/health")
    print_ok "API отвечает (HTTP ${API_CODE})"
else
    print_warning "API не отвечает"
fi

# 5. Проверка Telegram SDK
print_info "Проверка Telegram SDK..."
if curl -s -o /dev/null -w "%{http_code}" "https://telegram.org/js/telegram-web-app.js" | grep -q "200"; then
    print_ok "Telegram SDK доступен"
else
    print_warning "Telegram SDK недоступен (может быть проблема с интернетом)"
fi

echo ""
echo "📋 Инструкция для проверки в браузере:"
echo ""
echo "1. Откройте сайт: http://${DOMAIN}"
echo "2. Откройте консоль разработчика:"
echo "   - Chrome/Edge: F12 или Ctrl+Shift+I (Cmd+Option+I на Mac)"
echo "   - Firefox: F12 или Ctrl+Shift+K (Cmd+Option+K на Mac)"
echo "   - Safari: Cmd+Option+I (нужно включить меню разработчика)"
echo ""
echo "3. Проверьте вкладки:"
echo "   - Console - ищите красные ошибки"
echo "   - Network - проверьте что все файлы загружаются (статус 200)"
echo "   - Elements - проверьте что есть <div id=\"root\">"
echo ""
echo "4. Частые проблемы:"
echo "   - CORS ошибки - проверьте настройки API"
echo "   - 'Telegram is not defined' - приложение работает вне Telegram"
echo "   - Ошибки загрузки модулей - проверьте пути к JS файлам"
echo "   - CSP (Content Security Policy) - проверьте заголовки безопасности"
echo ""
echo "5. Если видите ошибки, скопируйте их и отправьте для диагностики"


