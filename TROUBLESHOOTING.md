# 🔍 Диагностика проблемы с сайтом optmramor.ru

## Проблема
Сайт http://optmramor.ru/ не открывается, хотя деплой прошел успешно.

## Возможные причины

### 1. DNS не настроен
Домен `optmramor.ru` должен указывать на IP `94.241.141.194`.

**Проверка:**
```bash
nslookup optmramor.ru
# или
dig optmramor.ru +short
```

**Решение:** Настройте A-запись в DNS вашего домена:
- Тип: A
- Имя: @ (или optmramor.ru)
- Значение: 94.241.141.194
- TTL: 3600

### 2. Конфликт портов
На сервере может быть установлен Nginx, который уже слушает на портах 80/443.

**Проверка на сервере:**
```bash
ssh root@94.241.141.194
netstat -tlnp | grep -E ':(80|443)'
# или
ss -tlnp | grep -E ':(80|443)'
```

**Решение:** Если Nginx уже установлен, нужно:
1. Остановить системный Nginx: `systemctl stop nginx`
2. Или настроить его для проксирования на Docker контейнеры (см. ниже)

### 3. Firewall блокирует порты
Порты 80 и 443 могут быть закрыты в firewall.

**Проверка:**
```bash
ufw status
# или
iptables -L -n | grep -E '80|443'
```

**Решение:** Откройте порты:
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

### 4. Контейнеры не запущены
Контейнеры могли упасть после запуска.

**Проверка:**
```bash
docker ps -a
docker-compose -f /opt/ritual-app/docker-compose.production.yml ps
```

**Решение:** Перезапустите контейнеры:
```bash
cd /opt/ritual-app
docker-compose -f docker-compose.production.yml restart
```

## Быстрая диагностика

Запустите скрипт диагностики на сервере:

```bash
# С вашего компьютера
cat diagnose.sh | ssh root@94.241.141.194 "bash -s"
```

Или вручную на сервере:
```bash
ssh root@94.241.141.194
cd /opt/ritual-app
docker ps
docker logs ritual_web
docker logs ritual_api
```

## Решение: Настройка системного Nginx (если он установлен)

Если на сервере уже есть Nginx, создайте конфигурацию для проксирования:

```bash
ssh root@94.241.141.194
cat > /etc/nginx/sites-available/optmramor.ru << 'EOF'
server {
    listen 80;
    server_name optmramor.ru www.optmramor.ru;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/optmramor.ru /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Альтернатива: Использовать только Docker

Если системного Nginx нет, убедитесь что порты проброшены правильно в docker-compose.production.yml:

```yaml
web:
  ports:
    - "80:80"      # Должно быть без 127.0.0.1
    - "443:443"
```

Сейчас в конфиге порты проброшены правильно, но если есть системный Nginx, он может конфликтовать.

## Проверка доступности

После исправления проверьте:

```bash
# С вашего компьютера
curl -I http://94.241.141.194
curl -I http://optmramor.ru
```

Оба должны возвращать HTTP 200 или 301/302.

