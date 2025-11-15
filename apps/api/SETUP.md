# Настройка проекта

## 1. Настройка базы данных

### Создайте файл `.env` в `apps/api/`:

```bash
cd apps/api
cp .env.example .env
```

### Отредактируйте `.env` и укажите правильный DATABASE_URL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ritual_shop?schema=public"
```

**Примеры для разных случаев:**

#### Локальная PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ritual_shop?schema=public"
```

#### Docker PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ritual_shop?schema=public"
```

#### Supabase (облачная БД):
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
```

#### Railway, Render или другие платформы:
Скопируйте DATABASE_URL из настроек вашего проекта.

## 2. Создание базы данных

Если база данных еще не создана:

```bash
# Для локальной PostgreSQL
createdb ritual_shop

# Или через psql
psql -U postgres
CREATE DATABASE ritual_shop;
\q
```

## 3. Выполнение миграций

После настройки DATABASE_URL:

```bash
cd apps/api
npx prisma migrate dev --name add_admin_features
npx prisma generate
```

Это создаст все таблицы и перегенерирует Prisma Client, что исправит все ошибки TypeScript.

## 4. Заполнение тестовыми данными (опционально)

```bash
npx prisma db seed
```

## 5. Запуск проекта

```bash
# Из корня проекта
pnpm dev:api    # API сервер
pnpm dev:web    # Web приложение
```

## Проверка подключения к БД

```bash
cd apps/api
npx prisma studio
```

Откроется веб-интерфейс для просмотра данных в базе.

