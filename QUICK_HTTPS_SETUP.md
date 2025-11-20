# 🚀 Быстрая настройка HTTPS

## Шаг 1: Получите SSL сертификаты

**На сервере выполните:**

```bash
cd /opt/ritual-app

# 1. Установите certbot (если не установлен)
apt-get update && apt-get install -y certbot python3-certbot-nginx

# 2. Остановите web контейнер
docker-compose -f docker-compose.production.yml stop web

# 3. Получите сертификат
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email monstrpete@gmail.com \
    -d optmramor.ru \
    -d www.optmramor.ru \
    --preferred-challenges http

# 4. Скопируйте сертификаты
mkdir -p ssl
cp /etc/letsencrypt/live/optmramor.ru/fullchain.pem ssl/fullchain.pem
cp /etc/letsencrypt/live/optmramor.ru/privkey.pem ssl/privkey.pem
cp /etc/letsencrypt/live/optmramor.ru/chain.pem ssl/chain.pem
chmod 644 ssl/fullchain.pem
chmod 600 ssl/privkey.pem
chmod 644 ssl/chain.pem
```

## Шаг 2: Обновите конфигурацию

Конфигурация nginx уже обновлена для HTTPS. Убедитесь что файлы скопированы на сервер:

```bash
# На локальной машине
./quick-deploy.sh web
```

Или вручную на сервере:

```bash
cd /opt/ritual-app

# Пересоберите web контейнер
docker-compose -f docker-compose.production.yml build web

# Запустите
docker-compose -f docker-compose.production.yml up -d web
```

## Шаг 3: Проверьте

```bash
# Проверьте HTTPS
curl -I https://optmramor.ru

# Проверьте редирект с HTTP на HTTPS
curl -I http://optmramor.ru
# Должен вернуть 301 редирект на HTTPS
```

## Шаг 4: Настройте автообновление

```bash
cat > /etc/cron.d/certbot-renew << 'EOF'
0 */12 * * * root certbot renew --quiet --deploy-hook "cd /opt/ritual-app && cp /etc/letsencrypt/live/optmramor.ru/fullchain.pem ssl/fullchain.pem && cp /etc/letsencrypt/live/optmramor.ru/privkey.pem ssl/privkey.pem && cp /etc/letsencrypt/live/optmramor.ru/chain.pem ssl/chain.pem && docker-compose -f docker-compose.production.yml restart web"
EOF
```

---

## Если сертификаты еще не получены

Используйте временную конфигурацию без SSL:

```bash
# На сервере
cd /opt/ritual-app
cp apps/web/nginx.conf apps/web/nginx.conf.ssl
cp apps/web/nginx.conf.no-ssl apps/web/nginx.conf

# Пересоберите
docker-compose -f docker-compose.production.yml build web
docker-compose -f docker-compose.production.yml up -d web
```

После получения сертификатов верните SSL конфигурацию:

```bash
cp apps/web/nginx.conf.ssl apps/web/nginx.conf
docker-compose -f docker-compose.production.yml build web
docker-compose -f docker-compose.production.yml up -d web
```

---

## Автоматическая настройка

Или используйте скрипт:

```bash
# На локальной машине
./setup-ssl.sh
```

