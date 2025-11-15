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

1. Скопируйте `.env.example` в `.env` и заполните переменные:

```bash
cp .env.example .env
```

2. Настройте базу данных PostgreSQL и обновите `DATABASE_URL`

3. Настройте Redis (для кэша и rate limiting)

4. Установите токен бота в `BOT_TOKEN`

5. Добавьте Telegram ID админов в `ADMIN_WHITELIST` (через запятую)

## Миграции

```bash
# Генерация Prisma Client
pnpm prisma:generate

# Создание миграции
pnpm prisma:migrate

# Запуск сида данных
pnpm prisma:seed
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

## Кэширование

Используется Redis для кэширования:
- Списки категорий и товаров (TTL: 5 минут)
- Rate limiting (100 запросов в минуту)

## Структура БД

См. `prisma/schema.prisma` для полной схемы базы данных.





