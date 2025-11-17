# Telegram Боты для уведомлений

Три Python бота для отправки уведомлений:
- **customer_bot.py** - отправляет уведомления клиентам (заказы, статусы, брошенные корзины)
- **admin_bot.py** - отправляет уведомления администраторам (новые заказы, статусы)
- **abandoned_cart_bot.py** - автоматически отправляет напоминания о брошенных корзинах

## Установка

```bash
cd bots
pip install -r requirements.txt
```

## Настройка

### Customer Bot (Бот для клиентов)

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Установите переменные окружения:

```bash
export CUSTOMER_BOT_TOKEN="your_customer_bot_token"
export PORT=8001
```

### Admin Bot (Бот для админа)

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Узнайте ваш Telegram Chat ID (можно через [@userinfobot](https://t.me/userinfobot))
4. Установите переменные окружения:

```bash
export ADMIN_BOT_TOKEN="your_admin_bot_token"
export ADMIN_CHAT_ID="your_telegram_chat_id"
export PORT=8002
```

## Запуск

### Customer Bot
```bash
python customer_bot.py
```

### Admin Bot
```bash
python admin_bot.py
```

### Abandoned Cart Bot (автоматические напоминания)
```bash
python abandoned_cart_bot.py
```

**Или запустить все боты одновременно:**
```bash
./start_bots.sh
```

## API Endpoints

### Customer Bot (порт 8001)

- `GET /health` - проверка здоровья сервиса
- `POST /notify/customer` - отправка уведомления клиенту
  ```json
  {
    "telegramId": "123456789",
    "orderNumber": "ORD-1234567890-ABC",
    "orderId": 1,
    "customerName": "Иван Иванов",
    "total": 25000
  }
  ```
- `POST /notify/status` - уведомление об изменении статуса
  ```json
  {
    "telegramId": "123456789",
    "orderNumber": "ORD-1234567890-ABC",
    "status": "CONFIRMED"
  }
  ```

### Admin Bot (порт 8002)

- `GET /health` - проверка здоровья сервиса
- `POST /notify/admin` - отправка уведомления админу
  ```json
  {
    "orderNumber": "ORD-1234567890-ABC",
    "orderId": 1,
    "customerName": "Иван Иванов",
    "customerPhone": "+79991234567",
    "customerEmail": "ivan@example.com",
    "customerAddress": "Москва, ул. Примерная, д. 1",
    "comment": "Комментарий",
    "items": "Товар 1 - 2 шт. × 12 500 ₽",
    "total": 25000,
    "createdAt": "2024-01-01T12:00:00Z"
  }
  ```

## Настройка в API

В `.env` файле API добавьте:

```env
CUSTOMER_BOT_API_URL=http://localhost:8001
ADMIN_BOT_API_URL=http://localhost:8002
```

## Docker (опционально)

Можно запустить через Docker:

```bash
docker build -t customer-bot -f Dockerfile.customer .
docker build -t admin-bot -f Dockerfile.admin .

docker run -d \
  -e CUSTOMER_BOT_TOKEN=your_token \
  -p 8001:8001 \
  customer-bot

docker run -d \
  -e ADMIN_BOT_TOKEN=your_token \
  -e ADMIN_CHAT_ID=your_chat_id \
  -p 8002:8002 \
  admin-bot
```

