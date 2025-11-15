# 🚀 Быстрый старт с Cloudflare Tunnel

## Установка cloudflared

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Или скачайте с https://github.com/cloudflare/cloudflared/releases
```

## Запуск (самый простой способ)

### 1. Запустите API сервер
```bash
cd apps/api
pnpm start:dev
```

### 2. В другом терминале запустите туннель
```bash
cloudflared tunnel --url http://localhost:3000
```

Вы получите URL вида: `https://random-subdomain.trycloudflare.com`

### 3. Используйте URL в Telegram Bot
- Скопируйте полученный URL
- Добавьте `/api` в конце для API эндпоинтов
- Пример: `https://random-subdomain.trycloudflare.com/api`

## Или используйте готовый скрипт

```bash
./start-tunnel.sh
```

## CORS уже настроен! ✅

API автоматически разрешает запросы с доменов:
- `*.trycloudflare.com` (все Cloudflare Tunnel домены)
- `*.cloudflare.com`
- Telegram домены
- Все домены в режиме разработки

## Дополнительная информация

См. подробную инструкцию в `cloudflare-tunnel.md`



