# Cloudflare Tunnel для тестирования (аналог ngrok)

Cloudflare Tunnel (cloudflared) - бесплатный туннель от Cloudflare для локальной разработки, аналогичный ngrok.

## Быстрая установка

### macOS
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Linux
```bash
# Скачайте бинарник
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

### Windows
Скачайте с https://github.com/cloudflare/cloudflared/releases

## Быстрый старт (без регистрации)

Самый простой способ - использовать quick tunnel без регистрации:

### Для API сервера:
```bash
# Запустите API сервер
cd apps/api
pnpm start:dev

# В другом терминале запустите туннель
cloudflared tunnel --url http://localhost:3000
```

Вы получите URL вида: `https://random-subdomain.trycloudflare.com`

### Для Web фронтенда:
```bash
# Запустите Web сервер
cd apps/web
pnpm dev

# В другом терминале запустите туннель
cloudflared tunnel --url http://localhost:5173
```

## Использование с постоянным туннелем (рекомендуется)

### 1. Авторизация в Cloudflare
```bash
cloudflared tunnel login
```
Откроется браузер для авторизации через Cloudflare аккаунт (можно использовать бесплатный).

### 2. Создание туннеля
```bash
cloudflared tunnel create monorepo-tunnel
```

### 3. Запуск туннеля
```bash
# Для API
cloudflared tunnel --url http://localhost:3000

# Или с конфигурацией
cloudflared tunnel --config cloudflared-config.yml run
```

## Настройка для проекта

### Вариант 1: Простой скрипт

Создайте скрипт `start-tunnel.sh`:
```bash
#!/bin/bash
# Запуск API с туннелем
cd apps/api && pnpm start:dev &
API_PID=$!

# Ждём запуска API
sleep 5

# Запускаем туннель
cloudflared tunnel --url http://localhost:3000

# При завершении убиваем API
trap "kill $API_PID" EXIT
```

### Вариант 2: Через package.json

Добавьте в `apps/api/package.json`:
```json
{
  "scripts": {
    "tunnel": "cloudflared tunnel --url http://localhost:3000"
  }
}
```

## Настройка CORS

CORS уже настроен в `apps/api/src/main.ts` для поддержки доменов Cloudflare Tunnel:
- Автоматически разрешает все домены `*.trycloudflare.com`
- Поддерживает переменные окружения `CLOUDFLARE_TUNNEL_URL` и `FRONTEND_URL`

Если нужно добавить конкретный домен, обновите `main.ts`:
```typescript
const allowedOrigins = [
  'https://telegram.org',
  'https://web.telegram.org',
  'https://your-subdomain.trycloudflare.com', // Ваш туннель
  process.env.CLOUDFLARE_TUNNEL_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);
```

## Использование в Telegram Bot

После запуска туннеля, получите URL и используйте его в настройках Telegram Bot:

1. Скопируйте URL из вывода `cloudflared` (например: `https://random-subdomain.trycloudflare.com`)
2. Используйте этот URL в `setWebhook` или в настройках Mini App
3. Для API: `https://your-tunnel-url.trycloudflare.com/api`

## Полезные команды

```bash
# Просмотр активных туннелей
cloudflared tunnel list

# Удаление туннеля
cloudflared tunnel delete <tunnel-id>

# Просмотр логов
cloudflared tunnel info <tunnel-id>
```

## Ограничения бесплатного плана

- ✅ Неограниченное количество туннелей
- ✅ Неограниченный трафик
- ✅ SSL сертификаты включены
- ⚠️ Quick tunnels (без регистрации) перезапускаются при каждом запуске
- ✅ Named tunnels (с регистрацией) работают постоянно

## Troubleshooting

### Проблема: CORS ошибки
- Убедитесь, что домен `*.trycloudflare.com` разрешён в CORS (уже настроено)
- Проверьте, что API запущен на правильном порту

### Проблема: Туннель не подключается
- Проверьте, что API сервер запущен и доступен на `localhost:3000`
- Убедитесь, что порт не заблокирован файрволом

### Проблема: Нужен постоянный URL
- Используйте named tunnel вместо quick tunnel
- Зарегистрируйтесь в Cloudflare (бесплатно)
- Создайте туннель через `cloudflared tunnel create`



