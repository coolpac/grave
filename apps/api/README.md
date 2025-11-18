# API Service

NestJS API сервис для Telegram Mini App.

## Модули

- **auth** - Валидация Telegram initData, JWT аутентификация
- **catalog** - CRUD для категорий, товаров, вариантов, медиа
- **cart** - Управление корзиной в БД
- **orders** - Создание заказов, статусы, вебхуки платежей
- **admin** - Метрики и отчёты

## Установка

```bash
pnpm install
```

## Настройка

### 1. Переменные окружения

Скопируйте `.env.example` в `.env` и заполните переменные:

```bash
cp .env.example .env
```

**Обязательные переменные:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT secret key (минимум 32 символа)
- `BOT_TOKEN` - Telegram bot token

**Валидация:**
Все переменные окружения валидируются при старте приложения. Приложение не запустится, если:
- Отсутствуют обязательные переменные
- Переменные имеют неверный формат
- Обнаружены неизвестные переменные

Подробнее см. [ENV_VARIABLES.md](./ENV_VARIABLES.md)

### 2. База данных

#### Разработка (SQLite)

Для разработки можно использовать SQLite:

```env
DATABASE_URL=file:./prisma/dev.db
```

#### Продакшен (PostgreSQL)

**Вариант A: Docker Compose (рекомендуется)**

```bash
# Запустите PostgreSQL и Redis
docker-compose -f ../../docker-compose.production.yml up -d postgres redis

# Установите DATABASE_URL в .env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ritual_db?schema=public
```

**Вариант B: Локальный PostgreSQL**

1. Установите PostgreSQL 15
2. Создайте базу данных:
   ```sql
   CREATE DATABASE ritual_db;
   CREATE USER postgres WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE ritual_db TO postgres;
   ```
3. Обновите `DATABASE_URL` в `.env`

**Миграция с SQLite на PostgreSQL:**

```bash
# Используйте скрипт миграции
./scripts/migrate-to-postgresql.sh
```

Подробнее см. [POSTGRESQL_MIGRATION.md](./POSTGRESQL_MIGRATION.md)

### 3. Redis (для кэша и rate limiting)

**Docker Compose:**
```bash
docker-compose -f ../../docker-compose.production.yml up -d redis
```

**Локально:**
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis-server
```

Обновите `REDIS_URL` в `.env`:
```env
REDIS_URL=redis://:your_password@localhost:6379
```

### 4. Telegram Bot

1. Получите токен бота от [@BotFather](https://t.me/BotFather)
2. Установите в `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

### 5. Администраторы

Добавьте Telegram ID админов в `ADMIN_WHITELIST` (через запятую):
```env
ADMIN_WHITELIST=123456789,987654321
```

Получить свой Telegram ID можно через [@userinfobot](https://t.me/userinfobot)

## Миграции

### SQLite (Разработка)

```bash
# Генерация Prisma Client
pnpm prisma:generate

# Создание миграции
pnpm prisma:migrate

# Запуск сида данных
pnpm prisma:seed
```

### PostgreSQL (Продакшен)

**Важно:** Для продакшена используйте `schema.postgresql.prisma`

```bash
# 1. Переключитесь на PostgreSQL схему
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# 2. Обновите DATABASE_URL в .env на PostgreSQL

# 3. Создайте миграцию
pnpm prisma migrate dev --name init_postgresql

# Или примените существующие миграции
pnpm prisma migrate deploy

# 4. Сгенерируйте Prisma Client
pnpm prisma:generate

# 5. Запустите seed (опционально)
pnpm prisma:seed
```

**Автоматическая миграция с SQLite:**
```bash
./scripts/migrate-to-postgresql.sh
```

## Запуск

```bash
# Разработка
pnpm start:dev

# Продакшен
pnpm build
pnpm start:prod
```

## API Endpoints

### Auth
- `POST /api/auth/validate` - Валидация initData и получение JWT

### Catalog
- `GET /api/catalog/categories` - Список категорий
- `GET /api/catalog/categories/:slug` - Категория по slug
- `GET /api/catalog/products` - Список товаров
- `GET /api/catalog/products/:slug` - Товар по slug
- `POST /api/catalog/categories` - Создание категории (Admin)
- `POST /api/catalog/products` - Создание товара (Admin)

### Cart
- `GET /api/cart` - Получить корзину
- `POST /api/cart/add` - Добавить в корзину
- `PATCH /api/cart/items/:id` - Обновить элемент корзины
- `DELETE /api/cart/items/:id` - Удалить из корзины
- `DELETE /api/cart/clear` - Очистить корзину

### Orders
- `POST /api/orders` - Создать заказ
- `GET /api/orders` - Список заказов
- `GET /api/orders/:id` - Заказ по ID
- `PATCH /api/orders/:id/status` - Обновить статус (Admin)
- `POST /api/orders/webhook/payment` - Вебхук платежа

### Admin
- `GET /api/admin/metrics` - Метрики (Admin)
- `GET /api/admin/reports/orders` - Отчёт по заказам (Admin)
- `GET /api/admin/reports/sales` - Отчёт по продажам (Admin)

## Валидация Telegram initData

Сервис валидирует `initData` от Telegram WebApp по алгоритму:
1. Проверка HMAC подписи
2. Проверка TTL (максимум 24 часа)
3. Извлечение данных пользователя
4. Создание/обновление пользователя в БД
5. Выдача JWT токена

## Guards

- `JwtAuthGuard` - Проверка JWT токена
- `AdminGuard` - Проверка прав администратора (по роли или whitelist)

## Безопасность

Приложение использует комплексную защиту:

- **Helmet** - Security headers (CSP, HSTS, X-Frame-Options и др.)
- **Rate Limiting** - Дифференцированные лимиты:
  - Auth endpoints: 5 запросов/минуту
  - Orders endpoints: 10 запросов/минуту
  - Public endpoints: 100 запросов/минуту
- **CORS** - Ограничен проверенными доменами
- **JWT Authentication** - Безопасная аутентификация

Подробнее см. [SECURITY.md](./SECURITY.md)

## Кэширование

Используется Redis для кэширования:
- Списки категорий и товаров (TTL: 5 минут)
- Rate limiting (хранится в Redis в production)

## Мониторинг и метрики

Приложение экспортирует метрики в формате Prometheus:

- **HTTP метрики** - Request rate, duration, status codes
- **Database метрики** - Query duration, error rate
- **Cache метрики** - Hit/miss ratio
- **Бизнес-метрики** - Orders, cart abandonments, product views
- **Системные метрики** - Memory, CPU, event loop lag

**Эндпоинты:**
- `GET /api/metrics` - Prometheus metrics (текстовый формат)

**Интеграция:**
- Prometheus для сбора метрик
- Grafana для визуализации
- Автоматические алерты

Подробнее см. [PROMETHEUS_METRICS.md](./PROMETHEUS_METRICS.md)

## Фоновые задачи (Bull Queue)

Приложение использует Bull Queue для обработки тяжелых операций в фоновом режиме:

- **Telegram Notification Queue** - Отправка Telegram уведомлений через Python боты
- **Image Queue** - Обработка изображений (превью, оптимизация)
- **Reports Queue** - Генерация аналитических отчетов

**Требования:**
- Redis (обязателен для Bull Queue)
- Python боты (Customer Bot и Admin Bot) для отправки Telegram уведомлений

**Мониторинг:**
- Bull Board UI: http://localhost:3000/admin/queues (требуется авторизация admin)

**Преимущества:**
- Не блокирует HTTP запросы
- Автоматические retry при ошибках
- Масштабируемость
- Интеграция с Telegram ботами

**Архитектура уведомлений:**
```
NestJS API → Bull Queue → TelegramNotificationProcessor → Python Bots → Telegram
```

Подробнее см. [BULL_QUEUE.md](./BULL_QUEUE.md)

## Оптимизация базы данных

Приложение использует оптимизированную конфигурацию PostgreSQL:

- **Индексы** - Composite и partial indexes для частых запросов
- **Connection Pooling** - Настроено через DATABASE_URL параметры
- **Query Optimization** - Select только нужных полей, пагинация везде
- **Query Logging** - Автоматическое логирование медленных запросов (>100ms)
- **Performance Analysis** - Скрипт для анализа производительности

**Требования:**
- PostgreSQL 12+ (рекомендуется 14+)
- Настроенный connection pool (connection_limit, pool_timeout)

**Мониторинг:**
- DatabaseService для логирования и анализа
- Скрипт: `ts-node scripts/analyze-db-performance.ts`

**Рекомендации:**
- Используйте PgBouncer для production
- Регулярно запускайте VACUUM и ANALYZE
- Мониторьте использование индексов

Подробнее см. [DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md)

## Структура БД

См. `prisma/schema.prisma` для полной схемы базы данных.

### Схемы базы данных

- **`schema.prisma`** - Текущая активная схема (SQLite для dev, PostgreSQL для prod)
- **`schema.postgresql.prisma`** - PostgreSQL схема для продакшена
- **`schema.sqlite.prisma`** - SQLite схема для разработки

### Резервное копирование

**Создание backup:**
```bash
./scripts/backup-db.sh [backup_name]
```

**Восстановление из backup:**
```bash
./scripts/restore-db.sh backups/backup_20241120_120000.sql.gz
```

Backups хранятся в `./backups/` и автоматически очищаются через 30 дней.

## Production Deployment

### Docker Compose

```bash
# Запуск всех сервисов
docker-compose -f ../../docker-compose.production.yml up -d

# Проверка статуса
docker-compose -f ../../docker-compose.production.yml ps

# Логи
docker-compose -f ../../docker-compose.production.yml logs -f api

# Остановка
docker-compose -f ../../docker-compose.production.yml down
```

### Best Practices

1. **Connection Pooling:** Prisma автоматически использует connection pooling
2. **SSL:** Включите SSL для PostgreSQL в production (`sslmode=require`)
3. **Backups:** Настройте автоматические backups через cron:
   ```bash
   # Добавьте в crontab
   0 2 * * * cd /path/to/app && ./scripts/backup-db.sh
   ```
4. **Monitoring:** Используйте health checks (`/api/health`)
5. **Logging:** Настройте структурированное логирование (Winston + Sentry)

## Troubleshooting

### Проблемы с подключением к PostgreSQL

```bash
# Проверьте подключение
psql $DATABASE_URL

# Проверьте логи PostgreSQL
docker-compose -f ../../docker-compose.production.yml logs postgres
```

### Проблемы с миграциями

```bash
# Сброс базы данных (ОСТОРОЖНО: удалит все данные!)
pnpm prisma migrate reset

# Применение миграций без создания новых
pnpm prisma migrate deploy
```

### Проблемы с Redis

```bash
# Проверьте подключение
redis-cli -h localhost -p 6379 -a your_password ping

# Проверьте логи Redis
docker-compose -f ../../docker-compose.production.yml logs redis
```






