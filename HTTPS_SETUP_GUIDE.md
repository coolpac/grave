# 🔒 Настройка HTTPS для optmramor.ru

## Текущая ситуация

- ✅ Домен настроен и указывает на сервер
- ✅ HTTP работает (порт 80)
- ❌ HTTPS не настроен (порт 443)

## Решение: Настройка Let's Encrypt SSL

### Вариант 1: Автоматическая настройка (РЕКОМЕНДУЕТСЯ)

```bash
# На локальной машине
./setup-ssl.sh
```

Скрипт автоматически:
1. Установит certbot на сервере
2. Получит SSL сертификаты для домена
3. Скопирует сертификаты в нужную директорию
4. Настроит автоматическое обновление

### Вариант 2: Ручная настройка на сервере

#### Шаг 1: Подключитесь к серверу

```bash
ssh root@94.241.141.194
cd /opt/ritual-app
```

#### Шаг 2: Установите certbot

```bash
apt-get update
apt-get install -y certbot python3-certbot-nginx
```

#### Шаг 3: Остановите web контейнер

```bash
docker-compose -f docker-compose.production.yml stop web
```

#### Шаг 4: Получите SSL сертификат

```bash
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email monstrpete@gmail.com \
    -d optmramor.ru \
    -d www.optmramor.ru \
    --preferred-challenges http
```

**Важно:** Убедитесь что:
- Домен `optmramor.ru` указывает на IP `94.241.141.194` (A-запись)
- Порт 80 открыт в firewall
- Web контейнер остановлен (чтобы certbot мог использовать порт 80)

#### Шаг 5: Скопируйте сертификаты

```bash
mkdir -p ssl
cp /etc/letsencrypt/live/optmramor.ru/fullchain.pem ssl/fullchain.pem
cp /etc/letsencrypt/live/optmramor.ru/privkey.pem ssl/privkey.pem
cp /etc/letsencrypt/live/optmramor.ru/chain.pem ssl/chain.pem

# Установите правильные права
chmod 644 ssl/fullchain.pem
chmod 600 ssl/privkey.pem
chmod 644 ssl/chain.pem
```

#### Шаг 6: Обновите конфигурацию

Конфигурация nginx уже обновлена в `apps/web/nginx.conf` для поддержки HTTPS.

#### Шаг 7: Пересоберите и запустите web контейнер

```bash
# Пересоберите контейнер с новой конфигурацией
docker-compose -f docker-compose.production.yml build web

# Запустите контейнер
docker-compose -f docker-compose.production.yml up -d web
```

#### Шаг 8: Настройте автоматическое обновление сертификатов

```bash
cat > /etc/cron.d/certbot-renew << 'EOF'
# Обновление SSL сертификатов каждые 12 часов
0 */12 * * * root certbot renew --quiet --deploy-hook "cd /opt/ritual-app && cp /etc/letsencrypt/live/optmramor.ru/fullchain.pem ssl/fullchain.pem && cp /etc/letsencrypt/live/optmramor.ru/privkey.pem ssl/privkey.pem && cp /etc/letsencrypt/live/optmramor.ru/chain.pem ssl/chain.pem && docker-compose -f docker-compose.production.yml restart web"
EOF
```

---

## Проверка HTTPS

После настройки проверьте:

```bash
# С локальной машины
curl -I https://optmramor.ru
curl -I https://www.optmramor.ru

# Должен вернуть HTTP 200 или 301/302
```

В браузере откройте `https://optmramor.ru` - должен быть зеленый замочек 🔒

---

## Если что-то пошло не так

### Ошибка: "Failed to obtain certificate"

**Причины:**
1. Домен не указывает на сервер
2. Порт 80 заблокирован firewall
3. Web контейнер не остановлен

**Решение:**
```bash
# Проверьте DNS
dig optmramor.ru +short
# Должен вернуть: 94.241.141.194

# Проверьте порт 80
netstat -tlnp | grep :80

# Убедитесь что web контейнер остановлен
docker-compose -f docker-compose.production.yml stop web
```

### Ошибка: "nginx: [emerg] SSL certificate not found"

**Причина:** Сертификаты не скопированы в директорию `ssl/`

**Решение:**
```bash
cd /opt/ritual-app
ls -la ssl/
# Должны быть файлы: fullchain.pem, privkey.pem, chain.pem

# Если нет, скопируйте:
mkdir -p ssl
cp /etc/letsencrypt/live/optmramor.ru/*.pem ssl/
```

### HTTPS не работает после настройки

**Проверьте:**
1. Контейнер запущен: `docker-compose -f docker-compose.production.yml ps`
2. Порт 443 открыт: `netstat -tlnp | grep :443`
3. Логи nginx: `docker-compose -f docker-compose.production.yml logs web`
4. Конфигурация nginx: `docker-compose -f docker-compose.production.yml exec web nginx -t`

---

## Обновление после изменений

Если вы изменили `nginx.conf` или `docker-compose.production.yml`:

```bash
cd /opt/ritual-app

# Пересоберите web контейнер
docker-compose -f docker-compose.production.yml build web

# Перезапустите
docker-compose -f docker-compose.production.yml up -d web
```

---

## Важные замечания

1. **Let's Encrypt сертификаты действительны 90 дней** - автоматическое обновление настроено
2. **Порт 80 должен быть открыт** для проверки домена и обновления сертификатов
3. **После получения сертификатов** web контейнер должен быть запущен для обслуживания HTTPS
4. **DNS должен быть настроен** до получения сертификата

---

## Альтернатива: Cloudflare SSL

Если используете Cloudflare, можно использовать их SSL:
- Включите "Full" или "Full (strict)" SSL в настройках Cloudflare
- Cloudflare будет обрабатывать SSL между клиентом и Cloudflare
- Между Cloudflare и сервером можно использовать HTTP или Cloudflare Origin Certificate

Но для прямого доступа к серверу (без Cloudflare) нужен Let's Encrypt.

