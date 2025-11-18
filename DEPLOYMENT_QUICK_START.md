# 🚀 Быстрый старт деплоя

## Шаг 1: Подготовка локальной машины

1. **Создайте файл `.env.production`:**

```bash
cp env.production.template .env.production
vim .env.production  # Заполните все переменные
```

**Обязательно заполните:**
- `POSTGRES_PASSWORD` - сильный пароль для БД
- `REDIS_PASSWORD` - сильный пароль для Redis
- `JWT_SECRET` - минимум 32 символа (сгенерируйте: `openssl rand -base64 32`)
- `BOT_TOKEN` - токен Telegram бота от @BotFather
- `TELEGRAM_MANAGER_CHAT_ID` - ваш Telegram ID
- `ADMIN_WHITELIST` - список ID администраторов через запятую

2. **Проверьте доступ к серверу:**

```bash
ssh root@94.241.141.194
```

---

## Шаг 2: Первоначальная настройка сервера

**На сервере выполните:**

```bash
# Скачайте и запустите скрипт настройки
curl -o setup-server.sh https://raw.githubusercontent.com/your-repo/setup-server.sh
# Или скопируйте файл setup-server.sh на сервер
chmod +x setup-server.sh
./setup-server.sh
```

Скрипт автоматически:
- Обновит систему
- Установит Docker и Docker Compose
- Настроит firewall
- Создаст необходимые директории
- Настроит автоматические backup

---

## Шаг 3: Деплой приложения

**На локальной машине:**

```bash
# Убедитесь, что .env.production заполнен
cat .env.production

# Запустите деплой
./deploy.sh production
```

Скрипт автоматически:
- Создаст backup
- Скопирует файлы на сервер
- Построит Docker образы
- Запустит все сервисы
- Применит миграции БД

---

## Шаг 4: Проверка

**Проверьте, что всё работает:**

```bash
# На сервере
ssh root@94.241.141.194
cd /opt/ritual-app
docker-compose -f docker-compose.production.yml ps

# Проверьте health checks
curl http://localhost:3000/api/health
curl http://localhost/health
```

**Доступ к приложению:**
- Frontend: http://94.241.141.194
- API: http://94.241.141.194/api
- Health: http://94.241.141.194/api/health

---

## Ручной деплой (если скрипт не работает)

### 1. Копирование файлов

```bash
# С локальной машины
rsync -avz --exclude 'node_modules' --exclude '.git' \
  --exclude 'dist' --exclude '*.log' \
  ./ root@94.241.141.194:/opt/ritual-app/
```

### 2. Настройка на сервере

```bash
ssh root@94.241.141.194
cd /opt/ritual-app

# Создайте .env файл
cp env.production.template .env
vim .env  # Заполните все переменные
```

### 3. Запуск

```bash
cd /opt/ritual-app
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Примените миграции
docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy
```

---

## Полезные команды

```bash
# Просмотр логов
docker-compose -f docker-compose.production.yml logs -f

# Перезапуск сервиса
docker-compose -f docker-compose.production.yml restart api

# Остановка всех сервисов
docker-compose -f docker-compose.production.yml down

# Просмотр статуса
docker-compose -f docker-compose.production.yml ps
```

---

## Решение проблем

### Сервисы не запускаются

```bash
# Проверьте логи
docker-compose -f docker-compose.production.yml logs

# Проверьте .env файл
cat .env | grep -v PASSWORD
```

### База данных не подключается

```bash
# Проверьте статус PostgreSQL
docker exec ritual_postgres pg_isready

# Проверьте переменные окружения
docker-compose -f docker-compose.production.yml exec api env | grep DATABASE
```

### Проблемы с правами доступа

```bash
# Исправьте права на директории
chown -R 1001:1001 /opt/ritual-app/apps/api/uploads
chown -R 1001:1001 /opt/ritual-app/apps/api/logs
```

---

## Дополнительная информация

Подробное руководство: [SERVER_MANAGEMENT_GUIDE.md](./SERVER_MANAGEMENT_GUIDE.md)

