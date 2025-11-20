# 🚀 Быстрое исправление проблем на сервере

## Проблема 1: SSH все еще требует пароль

**Решение:** SSH ключ уже добавлен, но возможно требуется настройка ssh-agent на локальной машине.

### На локальной машине выполните:

```bash
# 1. Запустите ssh-agent
eval "$(ssh-agent -s)"

# 2. Добавьте ключ (введете passphrase один раз)
ssh-add ~/.ssh/id_ed25519

# 3. Попробуйте подключиться
ssh root@94.241.141.194
```

Если все еще требует пароль, проверьте на сервере:

```bash
# На сервере
cat ~/.ssh/authorized_keys
# Должен содержать ваш ключ: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPY8B4kBbMCXrf6Ex3itm8HuZWgHQeQfG2beoMtVVxx+ monstrpete@gmail.com

ls -la ~/.ssh/
# Права должны быть: drwx------ для .ssh и -rw------- для authorized_keys
```

---

## Проблема 2: API падает из-за отсутствующих токенов

**Ошибка:**
```
Config validation error: "CUSTOMER_BOT_TOKEN" is not allowed to be empty
Config validation error: "ADMIN_BOT_TOKEN" is not allowed to be empty
```

### Решение на сервере:

```bash
cd /opt/ritual-app

# Скопируйте скрипт исправления (если еще не скопирован)
# Или выполните вручную:

# 1. Проверьте текущий .env
cat .env | grep -E "BOT_TOKEN|CUSTOMER_BOT_TOKEN|ADMIN_BOT_TOKEN"

# 2. Если переменные отсутствуют или пустые, добавьте их:

# Вариант A: Если у вас есть BOT_TOKEN, используйте его
BOT_TOKEN=$(grep "^BOT_TOKEN=" .env | cut -d'=' -f2-)
if [ -n "$BOT_TOKEN" ] && [ "$BOT_TOKEN" != "123456789:ABCdefGHIjklMNOpqrsTUVwxyz" ]; then
    # Добавьте или обновите CUSTOMER_BOT_TOKEN
    if grep -q "^CUSTOMER_BOT_TOKEN=" .env; then
        sed -i "s|^CUSTOMER_BOT_TOKEN=.*|CUSTOMER_BOT_TOKEN=$BOT_TOKEN|" .env
    else
        echo "CUSTOMER_BOT_TOKEN=$BOT_TOKEN" >> .env
    fi
    
    # Добавьте или обновите ADMIN_BOT_TOKEN
    if grep -q "^ADMIN_BOT_TOKEN=" .env; then
        sed -i "s|^ADMIN_BOT_TOKEN=.*|ADMIN_BOT_TOKEN=$BOT_TOKEN|" .env
    else
        echo "ADMIN_BOT_TOKEN=$BOT_TOKEN" >> .env
    fi
    echo "✓ Токены установлены"
else
    echo "⚠ BOT_TOKEN не установлен. Установите реальные токены:"
    echo ""
    echo "nano .env"
    echo ""
    echo "Добавьте:"
    echo "CUSTOMER_BOT_TOKEN=ваш_токен_от_botfather"
    echo "ADMIN_BOT_TOKEN=ваш_токен_от_botfather"
fi

# 3. Проверьте результат
cat .env | grep -E "CUSTOMER_BOT_TOKEN|ADMIN_BOT_TOKEN"

# 4. Перезапустите API
docker-compose -f docker-compose.production.yml restart api

# 5. Проверьте логи
docker-compose -f docker-compose.production.yml logs -f api
```

---

## Автоматическое исправление

Если скрипт `fix-env-on-server.sh` скопирован на сервер:

```bash
cd /opt/ritual-app
chmod +x fix-env-on-server.sh
./fix-env-on-server.sh
```

---

## Как получить токены ботов

1. Откройте Telegram
2. Найдите [@BotFather](https://t.me/BotFather)
3. Отправьте `/mybots` или `/newbot`
4. Скопируйте токен (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Добавьте в `.env` файл на сервере

---

## Проверка после исправления

```bash
# 1. Проверьте статус контейнеров
docker-compose -f docker-compose.production.yml ps

# 2. Проверьте логи API (не должно быть ошибок валидации)
docker-compose -f docker-compose.production.yml logs --tail=50 api

# 3. Проверьте доступность API
curl http://localhost:3000/health || echo "API не отвечает"

# 4. Проверьте сайт
curl -I http://localhost
```

---

## Если проблемы остались

1. **SSH все еще требует пароль:**
   - Проверьте права: `chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`
   - Проверьте логи SSH: `tail -f /var/log/auth.log`

2. **API все еще падает:**
   - Проверьте все обязательные переменные: `cat .env | grep -v "^#" | grep "="`
   - Убедитесь что нет пустых значений
   - Проверьте формат токенов (должны быть вида `123456789:ABC...`)

