# Быстрая настройка базы данных

## Вариант 1: Docker PostgreSQL (Рекомендуется для разработки)

### Шаг 1: Запустите PostgreSQL в Docker

```bash
docker run --name postgres-ritual \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ritual_shop \
  -p 5432:5432 \
  -d postgres:15
```

### Шаг 2: Обновите `.env` файл

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ritual_shop?schema=public"
```

### Шаг 3: Выполните миграции

```bash
cd apps/api
npx prisma migrate dev --name add_admin_features
npx prisma generate
```

---

## Вариант 2: Локальная PostgreSQL

### Шаг 1: Установите PostgreSQL (если еще не установлен)

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Шаг 2: Создайте базу данных

```bash
createdb ritual_shop
# или
psql -U postgres -c "CREATE DATABASE ritual_shop;"
```

### Шаг 3: Обновите `.env` файл

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ritual_shop?schema=public"
```

---

## Вариант 3: Облачная БД (Supabase - бесплатно)

### Шаг 1: Создайте проект на [supabase.com](https://supabase.com)

1. Зарегистрируйтесь/войдите
2. Создайте новый проект
3. Дождитесь завершения создания (2-3 минуты)

### Шаг 2: Получите DATABASE_URL

1. Перейдите в Settings → Database
2. Скопируйте Connection String (URI)
3. Замените `[YOUR-PASSWORD]` на пароль из проекта

### Шаг 3: Обновите `.env` файл

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
```

---

## Вариант 4: Neon (бесплатный PostgreSQL)

### Шаг 1: Создайте проект на [neon.tech](https://neon.tech)

1. Зарегистрируйтесь
2. Создайте новый проект
3. Скопируйте Connection String

### Шаг 2: Обновите `.env` файл

Вставьте скопированный Connection String в DATABASE_URL

---

## Проверка подключения

После настройки DATABASE_URL проверьте подключение:

```bash
cd apps/api
npx prisma db pull
```

Если команда выполнилась без ошибок - подключение работает!

## Выполнение миграций

```bash
cd apps/api
npx prisma migrate dev --name add_admin_features
npx prisma generate
```

После этого все ошибки TypeScript должны исчезнуть!

