# Исправление ошибок TypeScript

## Проблема

Ошибки TypeScript возникают потому, что:
1. **Отсутствует DATABASE_URL** - Prisma не может подключиться к БД
2. **Prisma Client не перегенерирован** - TypeScript не знает о новых моделях (Banner, Newsletter, AbandonedCart)

## Решение

### Шаг 1: Создайте файл `.env` в `apps/api/`

```bash
cd apps/api
cp .env.example .env
```

### Шаг 2: Настройте DATABASE_URL

Откройте `apps/api/.env` и укажите правильный URL базы данных:

**Для локальной PostgreSQL:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ritual_shop?schema=public"
```

**Для Docker:**
```bash
docker run --name postgres-ritual -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ritual_shop -p 5432:5432 -d postgres
```

Затем в `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ritual_shop?schema=public"
```

**Для облачных сервисов (Supabase, Railway, Render):**
Скопируйте DATABASE_URL из настроек вашего проекта.

### Шаг 3: Создайте базу данных (если еще не создана)

```bash
# Через psql
psql -U postgres
CREATE DATABASE ritual_shop;
\q

# Или через createdb
createdb ritual_shop
```

### Шаг 4: Выполните миграции и перегенерируйте Prisma Client

```bash
cd apps/api
npx prisma migrate dev --name add_admin_features
npx prisma generate
```

После этого все ошибки TypeScript должны исчезнуть!

### Шаг 5: Проверьте работу

```bash
# Откройте Prisma Studio для просмотра данных
npx prisma studio

# Или запустите API
pnpm dev:api
```

## Быстрая проверка

Если все настроено правильно, выполните:

```bash
cd apps/api
npx prisma db pull  # Проверка подключения к БД
npx prisma generate # Генерация клиента
```

Если команды выполняются без ошибок - все готово!

