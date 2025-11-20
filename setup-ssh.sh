#!/bin/bash

# Скрипт для настройки SSH доступа к серверу
# Usage: ./setup-ssh.sh

set -e

SERVER_IP="94.241.141.194"
DEPLOY_USER="root"
SSH_KEY="${HOME}/.ssh/id_ed25519"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

echo "🔐 Настройка SSH доступа к серверу"
echo ""

# 1. Проверка существования SSH ключа
if [ ! -f "${SSH_KEY}" ] && [ ! -f "${SSH_KEY}.pub" ]; then
    print_warning "SSH ключ не найден. Создаю новый..."
    ssh-keygen -t ed25519 -f "${SSH_KEY}" -N "" -C "ritual-app-${USER}"
    print_status "SSH ключ создан: ${SSH_KEY}"
else
    print_status "SSH ключ найден: ${SSH_KEY}"
fi

# 2. Добавление конфигурации в ~/.ssh/config
SSH_CONFIG="${HOME}/.ssh/config"
mkdir -p ~/.ssh
chmod 700 ~/.ssh

if ! grep -q "Host ritual-server" "${SSH_CONFIG}" 2>/dev/null; then
    print_info "Добавляю конфигурацию в ~/.ssh/config..."
    cat >> "${SSH_CONFIG}" << EOF

# Ritual App Production Server
Host ritual-server
    HostName ${SERVER_IP}
    User ${DEPLOY_USER}
    IdentityFile ${SSH_KEY}
    ServerAliveInterval 60
    ServerAliveCountMax 3
    StrictHostKeyChecking yes
    UserKnownHostsFile ~/.ssh/known_hosts

EOF
    print_status "Конфигурация добавлена в ~/.ssh/config"
else
    print_status "Конфигурация уже существует в ~/.ssh/config"
fi

# 3. Копирование публичного ключа на сервер
print_info "Копирую SSH ключ на сервер..."
print_warning "Вам может потребоваться ввести пароль для root@${SERVER_IP}"

# Пробуем скопировать ключ
if ssh-copy-id -i "${SSH_KEY}.pub" "${DEPLOY_USER}@${SERVER_IP}" 2>/dev/null; then
    print_status "SSH ключ успешно скопирован на сервер"
else
    print_warning "Не удалось автоматически скопировать ключ"
    echo ""
    echo "Публичный ключ для ручного копирования:"
    echo "----------------------------------------"
    cat "${SSH_KEY}.pub"
    echo "----------------------------------------"
    echo ""
    echo "Скопируйте этот ключ на сервер вручную:"
    echo "  ssh ${DEPLOY_USER}@${SERVER_IP}"
    echo "  mkdir -p ~/.ssh"
    echo "  echo '$(cat ${SSH_KEY}.pub)' >> ~/.ssh/authorized_keys"
    echo "  chmod 700 ~/.ssh"
    echo "  chmod 600 ~/.ssh/authorized_keys"
fi

# 4. Тест подключения
echo ""
print_info "Тестирую SSH подключение..."
if ssh -o ConnectTimeout=5 -i "${SSH_KEY}" "${DEPLOY_USER}@${SERVER_IP}" "echo 'SSH connection successful'" 2>/dev/null; then
    print_status "SSH подключение работает!"
    echo ""
    echo "Теперь вы можете подключаться просто:"
    echo "  ssh ritual-server"
    echo ""
    echo "Или использовать в скриптах:"
    echo "  ssh ritual-server 'команда'"
else
    print_warning "SSH подключение не работает автоматически"
    echo "Проверьте:"
    echo "  1. Доступен ли сервер: ping ${SERVER_IP}"
    echo "  2. Правильный ли пароль"
    echo "  3. Разрешен ли SSH доступ на сервере"
fi

echo ""
print_status "Настройка SSH завершена!"


