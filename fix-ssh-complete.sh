#!/bin/bash

# Полная настройка SSH для passwordless доступа
# Выполните на ЛОКАЛЬНОЙ машине

set -e

SERVER_IP="94.241.141.194"
DEPLOY_USER="root"
SSH_KEY="${HOME}/.ssh/id_ed25519"

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

echo "🔐 Полная настройка SSH для passwordless доступа"
echo ""

# 1. Проверка SSH ключа
if [ ! -f "${SSH_KEY}" ]; then
    print_error "SSH ключ не найден: ${SSH_KEY}"
    echo "Создаю новый ключ..."
    ssh-keygen -t ed25519 -f "${SSH_KEY}" -N "" -C "ritual-app-${USER}"
    print_status "SSH ключ создан"
fi

# 2. Показываем публичный ключ
echo ""
print_info "Ваш публичный ключ:"
echo "----------------------------------------"
cat "${SSH_KEY}.pub"
echo "----------------------------------------"
echo ""

# 3. Инструкции для ручного добавления
print_warning "Для настройки passwordless доступа выполните на сервере:"
echo ""
echo "1. Подключитесь к серверу (потребуется пароль):"
echo "   ssh ${DEPLOY_USER}@${SERVER_IP}"
echo ""
echo "2. На сервере выполните:"
echo "   mkdir -p ~/.ssh"
echo "   chmod 700 ~/.ssh"
echo "   echo '$(cat ${SSH_KEY}.pub)' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "3. Или скопируйте этот ключ и добавьте вручную:"
echo "   $(cat ${SSH_KEY}.pub)"
echo ""

# 4. Попытка автоматического копирования
print_info "Попытка автоматического копирования ключа..."
echo "Введите пароль сервера когда попросит:"
echo ""

if ssh-copy-id -i "${SSH_KEY}.pub" -o StrictHostKeyChecking=no "${DEPLOY_USER}@${SERVER_IP}" 2>&1; then
    print_status "Ключ успешно скопирован!"
else
    print_warning "Автоматическое копирование не удалось"
    echo "Используйте ручную инструкцию выше"
fi

# 5. Настройка ssh-agent для автоматического использования ключа с passphrase
echo ""
print_info "Настройка ssh-agent для автоматического использования ключа..."
if [ -z "$SSH_AUTH_SOCK" ]; then
    eval "$(ssh-agent -s)" > /dev/null
    print_status "ssh-agent запущен"
fi

# Добавляем ключ в ssh-agent (если есть passphrase, попросит один раз)
if ssh-add -l | grep -q "${SSH_KEY}" 2>/dev/null; then
    print_status "Ключ уже добавлен в ssh-agent"
else
    print_info "Добавляю ключ в ssh-agent..."
    ssh-add "${SSH_KEY}" 2>&1 || print_warning "Не удалось добавить ключ (возможно, требуется passphrase)"
fi

# 6. Тест подключения
echo ""
print_info "Тестирую подключение..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes "${DEPLOY_USER}@${SERVER_IP}" "echo 'SSH работает без пароля!'" 2>/dev/null; then
    print_status "✅ SSH работает без пароля!"
else
    print_warning "SSH все еще требует пароль"
    echo ""
    echo "Проверьте на сервере:"
    echo "  1. Ключ добавлен в ~/.ssh/authorized_keys"
    echo "  2. Права: chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
    echo "  3. Настройки SSH: /etc/ssh/sshd_config"
fi

echo ""
print_status "Настройка завершена!"

