# 🖥️ Руководство по управлению сервером

**IP сервера:** `94.241.141.194`  
**Тип:** Root сервер (полный доступ)

---

## 📋 Содержание

1. [Первоначальная настройка сервера](#первоначальная-настройка-сервера)
2. [Безопасность](#безопасность)
3. [Установка зависимостей](#установка-зависимостей)
4. [Деплой приложения](#деплой-приложения)
5. [Управление сервисами](#управление-сервисами)
6. [Мониторинг и логи](#мониторинг-и-логи)
7. [Резервное копирование](#резервное-копирование)
8. [Обновление приложения](#обновление-приложения)
9. [Решение проблем](#решение-проблем)
10. [Полезные команды](#полезные-команды)

---

## 🚀 Первоначальная настройка сервера

### 1. Подключение к серверу

```bash
ssh root@94.241.141.194
```

### 2. Обновление системы

```bash
# Для Ubuntu/Debian
apt update && apt upgrade -y

# Для CentOS/RHEL
yum update -y
```

### 3. Установка базовых утилит

```bash
apt install -y curl wget git vim htop ufw fail2ban
```

### 4. Настройка firewall (UFW)

```bash
# Разрешить SSH
ufw allow 22/tcp

# Разрешить HTTP и HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Включить firewall
ufw enable

# Проверить статус
ufw status
```

### 5. Установка Docker и Docker Compose

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker --version
docker-compose --version

# Добавить пользователя в группу docker (если создан не-root пользователь)
usermod -aG docker $USER
```

### 6. Создание структуры директорий

```bash
mkdir -p /opt/ritual-app
mkdir -p /opt/backups/ritual-app
mkdir -p /opt/ritual-app/apps/api/uploads
mkdir -p /opt/ritual-app/apps/api/logs
```

---

## 🔒 Безопасность

### 1. Настройка SSH

**ВАЖНО:** Настройте SSH ключи вместо паролей!

```bash
# На локальной машине сгенерируйте ключ (если еще нет)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Скопируйте публичный ключ на сервер
ssh-copy-id root@94.241.141.194

# На сервере отредактируйте /etc/ssh/sshd_config
vim /etc/ssh/sshd_config

# Добавьте/измените:
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin yes  # или no, если создадите отдельного пользователя

# Перезапустите SSH
systemctl restart sshd
```

### 2. Настройка Fail2Ban

```bash
# Fail2Ban уже установлен, настройте базовую конфигурацию
systemctl enable fail2ban
systemctl start fail2ban

# Проверить статус
fail2ban-client status
```

### 3. Создание не-root пользователя (рекомендуется)

```bash
# Создать пользователя
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Настроить SSH ключи для нового пользователя
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 4. Настройка автоматических обновлений безопасности

```bash
# Для Ubuntu/Debian
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

---

## 📦 Установка зависимостей

### Node.js (если нужен для разработки на сервере)

```bash
# Установка Node.js 20 через nvm (рекомендуется)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Или через пакетный менеджер
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### pnpm (если нужен для разработки)

```bash
npm install -g pnpm@10.17.0
```

---

## 🚀 Деплой приложения

### Вариант 1: Автоматический деплой (рекомендуется)

1. **На локальной машине подготовьте `.env.production`:**

```bash
cd /path/to/project
cp .env.production.example .env.production
vim .env.production  # Заполните все переменные
```

2. **Запустите скрипт деплоя:**

```bash
./deploy.sh production
```

Скрипт автоматически:
- Создаст backup
- Скопирует файлы на сервер
- Построит Docker образы
- Запустит сервисы
- Применит миграции БД

### Вариант 2: Ручной деплой

1. **Скопируйте проект на сервер:**

```bash
# С локальной машины
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ root@94.241.141.194:/opt/ritual-app/
```

2. **На сервере создайте `.env` файл:**

```bash
cd /opt/ritual-app
vim .env  # Скопируйте содержимое из .env.production
```

3. **Запустите Docker Compose:**

```bash
cd /opt/ritual-app
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

4. **Примените миграции БД:**

```bash
docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy
```

---

## 🎮 Управление сервисами

### Основные команды

```bash
cd /opt/ritual-app

# Запустить все сервисы
docker-compose -f docker-compose.production.yml up -d

# Остановить все сервисы
docker-compose -f docker-compose.production.yml down

# Перезапустить сервис
docker-compose -f docker-compose.production.yml restart api
docker-compose -f docker-compose.production.yml restart web

# Просмотр статуса
docker-compose -f docker-compose.production.yml ps

# Просмотр логов
docker-compose -f docker-compose.production.yml logs -f
docker-compose -f docker-compose.production.yml logs -f api
docker-compose -f docker-compose.production.yml logs -f web
```

### Управление отдельными контейнерами

```bash
# Остановить контейнер
docker stop ritual_api

# Запустить контейнер
docker start ritual_api

# Перезапустить контейнер
docker restart ritual_api

# Удалить контейнер
docker rm ritual_api

# Просмотр логов контейнера
docker logs -f ritual_api
```

### Пересборка после изменений

```bash
cd /opt/ritual-app

# Пересобрать и перезапустить
docker-compose -f docker-compose.production.yml up -d --build

# Пересобрать без кэша
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

---

## 📊 Мониторинг и логи

### Просмотр логов

```bash
# Все сервисы
docker-compose -f docker-compose.production.yml logs -f

# Только API
docker-compose -f docker-compose.production.yml logs -f api

# Последние 100 строк
docker-compose -f docker-compose.production.yml logs --tail=100 api

# Логи с временными метками
docker-compose -f docker-compose.production.yml logs -f --timestamps api
```

### Логи приложения

```bash
# Логи API (файлы)
tail -f /opt/ritual-app/apps/api/logs/*.log

# Логи nginx (frontend)
docker logs -f ritual_web
```

### Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
df -h
du -sh /opt/ritual-app/*

# Использование памяти
free -h

# Процессы
htop
```

### Health checks

```bash
# Проверка здоровья API
curl http://localhost:3000/api/health

# Проверка здоровья frontend
curl http://localhost/health

# Детальная проверка
curl http://localhost:3000/api/health/detailed
```

### Prometheus и Grafana (опционально)

```bash
# Запустить мониторинг
docker-compose -f docker-compose.production.yml --profile monitoring up -d

# Доступ к Prometheus
# http://94.241.141.194:9090 (только локально, настройте nginx для внешнего доступа)

# Доступ к Grafana
# http://94.241.141.194:3001 (только локально, настройте nginx для внешнего доступа)
```

---

## 💾 Резервное копирование

### Автоматический backup БД

```bash
# Создать backup скрипт
cat > /opt/ritual-app/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/ritual-app"
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec ritual_postgres pg_dump -U postgres ritual_db | gzip > $BACKUP_DIR/db-$DATE.sql.gz

# Backup Redis (опционально)
docker exec ritual_redis redis-cli --rdb - | gzip > $BACKUP_DIR/redis-$DATE.rdb.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads-$DATE.tar.gz -C /opt/ritual-app/apps/api uploads

# Удалить старые backup (старше 30 дней)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/ritual-app/backup-db.sh
```

### Настройка cron для автоматических backup

```bash
# Редактировать crontab
crontab -e

# Добавить строку (backup каждый день в 2:00)
0 2 * * * /opt/ritual-app/backup-db.sh >> /var/log/ritual-backup.log 2>&1
```

### Восстановление из backup

```bash
# Восстановить БД
gunzip < /opt/backups/ritual-app/db-20250101-020000.sql.gz | \
  docker exec -i ritual_postgres psql -U postgres ritual_db

# Восстановить uploads
tar -xzf /opt/backups/ritual-app/uploads-20250101-020000.tar.gz -C /opt/ritual-app/apps/api
```

---

## 🔄 Обновление приложения

### Процесс обновления

```bash
cd /opt/ritual-app

# 1. Создать backup
./backup-db.sh

# 2. Остановить сервисы
docker-compose -f docker-compose.production.yml down

# 3. Обновить код (если используете git)
git pull origin main

# Или скопировать новые файлы через rsync
# rsync -avz --exclude 'node_modules' ./ root@94.241.141.194:/opt/ritual-app/

# 4. Обновить .env если нужно
vim .env

# 5. Пересобрать и запустить
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# 6. Применить миграции
docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy

# 7. Проверить статус
docker-compose -f docker-compose.production.yml ps
curl http://localhost:3000/api/health
```

### Откат к предыдущей версии

```bash
# Остановить текущие контейнеры
docker-compose -f docker-compose.production.yml down

# Восстановить из backup
# (см. раздел "Восстановление из backup")

# Запустить предыдущую версию
docker-compose -f docker-compose.production.yml up -d
```

---

## 🔧 Решение проблем

### Проблема: Контейнер не запускается

```bash
# Проверить логи
docker-compose -f docker-compose.production.yml logs api

# Проверить статус контейнера
docker ps -a | grep ritual

# Проверить использование ресурсов
docker stats

# Пересоздать контейнер
docker-compose -f docker-compose.production.yml up -d --force-recreate api
```

### Проблема: База данных не подключается

```bash
# Проверить статус PostgreSQL
docker exec ritual_postgres pg_isready -U postgres

# Проверить логи PostgreSQL
docker logs ritual_postgres

# Проверить переменные окружения
docker-compose -f docker-compose.production.yml exec api env | grep DATABASE

# Подключиться к БД вручную
docker exec -it ritual_postgres psql -U postgres -d ritual_db
```

### Проблема: Redis не работает

```bash
# Проверить статус Redis
docker exec ritual_redis redis-cli ping

# Проверить логи
docker logs ritual_redis

# Перезапустить Redis
docker restart ritual_redis
```

### Проблема: Фронтенд не загружается

```bash
# Проверить логи nginx
docker logs ritual_web

# Проверить доступность API
curl http://localhost:3000/api/health

# Проверить конфигурацию nginx
docker exec ritual_web cat /etc/nginx/conf.d/default.conf

# Перезапустить frontend
docker restart ritual_web
```

### Проблема: Нехватка места на диске

```bash
# Проверить использование диска
df -h

# Очистить неиспользуемые Docker образы
docker system prune -a

# Очистить старые логи
find /opt/ritual-app/apps/api/logs -type f -mtime +30 -delete

# Очистить старые backup
find /opt/backups/ritual-app -type f -mtime +30 -delete
```

### Проблема: Высокое использование памяти

```bash
# Проверить использование памяти
free -h
docker stats

# Ограничить память для контейнеров (в docker-compose.production.yml)
# Добавить в секцию api:
# deploy:
#   resources:
#     limits:
#       memory: 1G
```

---

## 📝 Полезные команды

### Docker

```bash
# Просмотр всех контейнеров
docker ps -a

# Просмотр всех образов
docker images

# Очистка неиспользуемых ресурсов
docker system prune -a

# Просмотр использования диска Docker
docker system df

# Выполнить команду в контейнере
docker exec -it ritual_api sh
docker exec -it ritual_postgres psql -U postgres
```

### База данных

```bash
# Подключиться к PostgreSQL
docker exec -it ritual_postgres psql -U postgres -d ritual_db

# Создать backup БД
docker exec ritual_postgres pg_dump -U postgres ritual_db > backup.sql

# Восстановить БД
docker exec -i ritual_postgres psql -U postgres ritual_db < backup.sql

# Применить миграции
docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy

# Открыть Prisma Studio
docker-compose -f docker-compose.production.yml exec api npx prisma studio
```

### Система

```bash
# Перезагрузка сервера
reboot

# Просмотр системных логов
journalctl -xe
journalctl -u docker -f

# Просмотр использования ресурсов
htop
iostat -x 1

# Просмотр сетевых подключений
netstat -tulpn
ss -tulpn
```

### Мониторинг

```bash
# Проверка доступности сервисов
curl http://localhost:3000/api/health
curl http://localhost/health

# Проверка метрик
curl http://localhost:3000/api/metrics

# Проверка Prometheus (если включен)
curl http://localhost:9090/api/v1/query?query=up
```

---

## 🔐 Безопасность - Дополнительные рекомендации

### 1. Регулярные обновления

```bash
# Настроить автоматические обновления безопасности
apt install -y unattended-upgrades
```

### 2. Мониторинг подозрительной активности

```bash
# Просмотр неудачных попыток входа
grep "Failed password" /var/log/auth.log

# Просмотр активных подключений
netstat -an | grep ESTABLISHED
```

### 3. Ограничение доступа к портам

- PostgreSQL и Redis доступны только внутри Docker сети
- API доступен только через nginx (порт 80)
- Мониторинг (Prometheus/Grafana) доступен только локально

### 4. Регулярная ротация паролей

```bash
# Сгенерировать новый пароль для PostgreSQL
openssl rand -base64 32

# Обновить в .env и перезапустить
vim .env
docker-compose -f docker-compose.production.yml restart postgres
```

---

## 📞 Контакты и поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose -f docker-compose.production.yml logs -f`
2. Проверьте health checks: `curl http://localhost:3000/api/health`
3. Проверьте использование ресурсов: `docker stats`
4. Проверьте раздел "Решение проблем" выше

---

## ✅ Чеклист после деплоя

- [ ] Все сервисы запущены: `docker-compose ps`
- [ ] API отвечает: `curl http://localhost:3000/api/health`
- [ ] Frontend доступен: `curl http://localhost/health`
- [ ] База данных работает: `docker exec ritual_postgres pg_isready`
- [ ] Redis работает: `docker exec ritual_redis redis-cli ping`
- [ ] Логи без ошибок: `docker-compose logs | grep -i error`
- [ ] Настроен автоматический backup
- [ ] Настроен firewall (UFW)
- [ ] Настроен Fail2Ban
- [ ] SSH доступ только по ключам
- [ ] Регулярные обновления безопасности включены

---

**Последнее обновление:** 2025-01-18

