#!/bin/bash

# Скрипт для проверки состояния приложения на сервере
# Usage: ./check-server-status.sh

SERVER_IP="94.241.141.194"
DEPLOY_USER="root"
PROJECT_DIR="/opt/ritual-app"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

echo "🔍 Проверка состояния приложения на сервере..."
echo ""

ssh ${DEPLOY_USER}@${SERVER_IP} << 'ENDSSH'
    # Colors
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
    
    print_status() { echo -e "${GREEN}✓${NC} $1"; }
    print_error() { echo -e "${RED}✗${NC} $1"; }
    print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
    print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
    
    echo "=========================================="
    echo "📊 СИСТЕМНАЯ ИНФОРМАЦИЯ"
    echo "=========================================="
    echo ""
    
    # Disk space
    echo "💾 Дисковое пространство:"
    df -h / | tail -1 | awk '{print "  Использовано: " $3 " / " $2 " (" $5 ")"}'
    echo ""
    
    # Memory
    echo "🧠 Память:"
    free -h | grep Mem | awk '{print "  Использовано: " $3 " / " $2}'
    echo ""
    
    # Docker status
    echo "🐳 Docker:"
    if systemctl is-active --quiet docker; then
        print_status "Docker запущен"
    else
        print_error "Docker не запущен"
    fi
    echo ""
    
    echo "=========================================="
    echo "📦 DOCKER КОНТЕЙНЕРЫ"
    echo "=========================================="
    echo ""
    
    if [ -d "/opt/ritual-app" ]; then
        cd /opt/ritual-app
        
        if [ -f "docker-compose.production.yml" ]; then
            echo "Статус контейнеров:"
            docker-compose -f docker-compose.production.yml ps
            echo ""
            
            echo "Использование ресурсов контейнерами:"
            docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || echo "  Не удалось получить статистику"
            echo ""
        else
            print_warning "docker-compose.production.yml не найден"
        fi
    else
        print_error "Директория /opt/ritual-app не существует"
    fi
    
    echo "=========================================="
    echo "🌐 СЕТЕВЫЕ ПОРТЫ"
    echo "=========================================="
    echo ""
    
    echo "Слушающие порты:"
    ss -tlnp | grep -E ':(80|443|3000|5432|6379)' | awk '{print "  " $0}' || echo "  Нет активных портов"
    echo ""
    
    echo "=========================================="
    echo "📝 ЛОГИ (последние 10 строк)"
    echo "=========================================="
    echo ""
    
    if [ -d "/opt/ritual-app" ]; then
        cd /opt/ritual-app
        
        if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
            echo "API логи:"
            docker-compose -f docker-compose.production.yml logs --tail=10 api 2>/dev/null || echo "  Нет логов"
            echo ""
            
            echo "Web логи:"
            docker-compose -f docker-compose.production.yml logs --tail=10 web 2>/dev/null || echo "  Нет логов"
            echo ""
        else
            print_warning "Контейнеры не запущены"
        fi
    fi
    
    echo "=========================================="
    echo "✅ ПРОВЕРКА ЗАВЕРШЕНА"
    echo "=========================================="
ENDSSH

echo ""
print_status "Проверка завершена!"

