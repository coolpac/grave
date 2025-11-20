#!/bin/bash

# Скрипт для выполнения НА СЕРВЕРЕ для настройки SSH
# Использование: скопируйте и выполните на сервере

echo "🔐 Настройка SSH на сервере"
echo ""

# 1. Проверка директории .ssh
echo "1. Проверка директории ~/.ssh..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 2. Проверка authorized_keys
echo "2. Проверка authorized_keys..."
if [ -f ~/.ssh/authorized_keys ]; then
    chmod 600 ~/.ssh/authorized_keys
    echo "✓ authorized_keys существует, права установлены"
    echo "Количество ключей: $(wc -l < ~/.ssh/authorized_keys)"
else
    echo "⚠ authorized_keys не найден"
    touch ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
fi

# 3. Проверка настроек SSH
echo ""
echo "3. Проверка настроек SSH сервера..."
SSH_CONFIG="/etc/ssh/sshd_config"

if [ -f "$SSH_CONFIG" ]; then
    echo "Текущие настройки:"
    echo "  PubkeyAuthentication: $(grep -E '^PubkeyAuthentication|^#PubkeyAuthentication' $SSH_CONFIG | head -1)"
    echo "  PasswordAuthentication: $(grep -E '^PasswordAuthentication|^#PasswordAuthentication' $SSH_CONFIG | head -1)"
    echo "  PermitRootLogin: $(grep -E '^PermitRootLogin|^#PermitRootLogin' $SSH_CONFIG | head -1)"
fi

# 4. Проверка логов SSH
echo ""
echo "4. Последние записи в логах SSH (если есть ошибки):"
if [ -f /var/log/auth.log ]; then
    tail -20 /var/log/auth.log | grep -i "sshd\|key" || echo "Нет записей"
elif [ -f /var/log/secure ]; then
    tail -20 /var/log/secure | grep -i "sshd\|key" || echo "Нет записей"
fi

# 5. Инструкции
echo ""
echo "=========================================="
echo "📋 ИНСТРУКЦИИ"
echo "=========================================="
echo ""
echo "Если SSH все еще требует пароль:"
echo ""
echo "1. Убедитесь, что публичный ключ добавлен в ~/.ssh/authorized_keys"
echo "2. Проверьте права доступа:"
echo "   chmod 700 ~/.ssh"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "3. Проверьте содержимое authorized_keys:"
echo "   cat ~/.ssh/authorized_keys"
echo ""
echo "4. Если нужно добавить ключ вручную, попросите пользователя"
echo "   прислать публичный ключ (~/.ssh/id_ed25519.pub)"
echo ""

