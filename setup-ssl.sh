#!/bin/bash

# Скрипт для настройки SSL сертификатов на сервере
# Использование: ./setup-ssl.sh

set -e

SERVER_IP="94.241.141.194"
DEPLOY_USER="root"
PROJECT_DIR="/opt/ritual-app"
DOMAIN="optmramor.ru"
EMAIL="monstrpete@gmail.com"  # Замените на ваш email

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo "🔒 Настройка SSL сертификатов для $DOMAIN"
echo ""

# Проверка подключения к серверу
print_info "Проверка подключения к серверу..."
if ! ssh -o ConnectTimeout=5 "${DEPLOY_USER}@${SERVER_IP}" "echo 'Connected'" > /dev/null 2>&1; then
    print_error "Не удалось подключиться к серверу"
    echo "Убедитесь что SSH настроен: ./fix-ssh-complete.sh"
    exit 1
fi

print_info "Настройка SSL на сервере..."
echo ""

ssh "${DEPLOY_USER}@${SERVER_IP}" << ENDSSH
    set -e
    
    PROJECT_DIR="${PROJECT_DIR}"
    DOMAIN="${DOMAIN}"
    EMAIL="${EMAIL}"
    
    cd "\$PROJECT_DIR"
    
    # 1. Установка certbot (если не установлен)
    if ! command -v certbot > /dev/null 2>&1; then
        echo "Установка certbot..."
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    # 2. Создание директорий для сертификатов
    mkdir -p "\$PROJECT_DIR/ssl"
    mkdir -p /var/www/certbot
    
    # 3. Временная остановка web контейнера для получения сертификата
    echo "Останавливаю web контейнер..."
    docker-compose -f docker-compose.production.yml stop web || true
    
    # 4. Получение сертификата через standalone режим
    echo "Получение SSL сертификата..."
    certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "\$EMAIL" \
        -d "\$DOMAIN" \
        -d "www.\$DOMAIN" \
        --preferred-challenges http \
        --keep-until-expiring || {
        echo "Ошибка получения сертификата"
        echo "Проверьте:"
        echo "  1. Домен указывает на этот сервер (A-запись)"
        echo "  2. Порт 80 открыт в firewall"
        exit 1
    }
    
    # 5. Копирование сертификатов в директорию проекта
    echo "Копирование сертификатов..."
    cp /etc/letsencrypt/live/\$DOMAIN/fullchain.pem "\$PROJECT_DIR/ssl/fullchain.pem"
    cp /etc/letsencrypt/live/\$DOMAIN/privkey.pem "\$PROJECT_DIR/ssl/privkey.pem"
    cp /etc/letsencrypt/live/\$DOMAIN/chain.pem "\$PROJECT_DIR/ssl/chain.pem"
    
    # Установка правильных прав
    chmod 644 "\$PROJECT_DIR/ssl/fullchain.pem"
    chmod 600 "\$PROJECT_DIR/ssl/privkey.pem"
    chmod 644 "\$PROJECT_DIR/ssl/chain.pem"
    
    echo "✓ Сертификаты скопированы"
    
    # 6. Настройка автоматического обновления
    echo "Настройка автоматического обновления сертификатов..."
    cat > /etc/cron.d/certbot-renew << 'CRONEOF'
# Обновление SSL сертификатов каждые 12 часов
0 */12 * * * root certbot renew --quiet --deploy-hook "cd ${PROJECT_DIR} && cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ssl/fullchain.pem && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ssl/privkey.pem && cp /etc/letsencrypt/live/${DOMAIN}/chain.pem ssl/chain.pem && docker-compose -f docker-compose.production.yml restart web"
CRONEOF
    
    echo "✓ Автоматическое обновление настроено"
    
    echo ""
    echo "✓ SSL сертификаты получены и настроены!"
ENDSSH

print_status "SSL сертификаты получены!"
echo ""
print_info "Теперь нужно обновить docker-compose.production.yml для монтирования сертификатов"
echo ""
print_info "Запустите на сервере:"
echo "  cd ${PROJECT_DIR}"
echo "  docker-compose -f docker-compose.production.yml up -d web"

