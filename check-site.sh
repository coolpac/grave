#!/bin/bash

# Скрипт для проверки доступности сайта
# Usage: ./check-site.sh

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

echo "🔍 Проверка доступности сайта ${DOMAIN}"
echo ""

# 1. Проверка DNS
print_info "Проверка DNS..."
DNS_RESULT=$(dig +short ${DOMAIN} 2>/dev/null | head -1)
if [ "$DNS_RESULT" = "$SERVER_IP" ]; then
    print_ok "DNS настроен правильно: ${DOMAIN} → ${SERVER_IP}"
else
    print_error "DNS настроен неправильно: ${DOMAIN} → ${DNS_RESULT:-не найден}"
    print_warning "Ожидается: ${DOMAIN} → ${SERVER_IP}"
fi

# 2. Проверка доступности по IP
print_info "Проверка доступности по IP..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${SERVER_IP}" | grep -q "200\|301\|302"; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${SERVER_IP}")
    print_ok "Сайт доступен по IP: http://${SERVER_IP} (HTTP ${HTTP_CODE})"
else
    print_error "Сайт недоступен по IP: http://${SERVER_IP}"
fi

# 3. Проверка доступности по домену
print_info "Проверка доступности по домену..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${DOMAIN}" | grep -q "200\|301\|302"; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${DOMAIN}")
    print_ok "Сайт доступен по домену: http://${DOMAIN} (HTTP ${HTTP_CODE})"
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${DOMAIN}" 2>&1)
    print_error "Сайт недоступен по домену: http://${DOMAIN}"
    print_warning "Код ответа: ${HTTP_CODE}"
fi

# 4. Проверка HTTPS
print_info "Проверка HTTPS..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://${DOMAIN}" 2>/dev/null | grep -q "200\|301\|302"; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://${DOMAIN}" 2>/dev/null)
    print_ok "HTTPS работает: https://${DOMAIN} (HTTP ${HTTP_CODE})"
else
    print_warning "HTTPS не настроен: https://${DOMAIN}"
    print_info "Для настройки SSL используйте Let's Encrypt или Cloudflare"
fi

# 5. Проверка содержимого
print_info "Проверка содержимого..."
CONTENT=$(curl -s --max-time 5 "http://${DOMAIN}" | head -5)
if echo "$CONTENT" | grep -q "html\|DOCTYPE"; then
    print_ok "Сайт возвращает HTML контент"
    echo "Первые строки:"
    echo "$CONTENT" | head -3 | sed 's/^/  /'
else
    print_warning "Не удалось получить HTML контент"
fi

# 6. Проверка API
print_info "Проверка API..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${DOMAIN}/api/health" | grep -q "200\|404"; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${DOMAIN}/api/health")
    print_ok "API endpoint доступен: /api/health (HTTP ${HTTP_CODE})"
else
    print_warning "API endpoint недоступен: /api/health"
fi

echo ""
echo "📊 Итоговая информация:"
echo "  - Домен: http://${DOMAIN}"
echo "  - IP: http://${SERVER_IP}"
echo "  - DNS: ${DOMAIN} → ${DNS_RESULT:-не настроен}"
echo ""
echo "💡 Если сайт не открывается в браузере:"
echo "  1. Очистите кэш браузера (Ctrl+Shift+Delete)"
echo "  2. Попробуйте в режиме инкогнито"
echo "  3. Проверьте с другого устройства/сети"
echo "  4. Подождите 5-30 минут после изменения DNS"


