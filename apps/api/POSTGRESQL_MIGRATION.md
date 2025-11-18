# 🗄️ Миграция на PostgreSQL

Полное руководство по миграции с SQLite на PostgreSQL для продакшена.

---

## 📋 Содержание

1. [Подготовка](#подготовка)
2. [Установка PostgreSQL](#установка-postgresql)
3. [Миграция данных](#миграция-данных)
4. [Настройка приложения](#настройка-приложения)
5. [Проверка](#проверка)
6. [Резервное копирование](#резервное-копирование)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Подготовка

### 1. Backup SQLite базы данных

**КРИТИЧНО:** Создайте backup перед миграцией!

```bash
# Создайте backup SQLite базы
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# Или экспортируйте данные
sqlite3 prisma/dev.db .dump > backup.sql
```

### 2. Проверьте текущую схему

```bash
# Просмотрите текущую схему
cat prisma/schema.prisma

# Проверьте данные в SQLite
pnpm prisma studio
```

---

## 📦 Установка PostgreSQL

### Вариант A: Docker Compose (Рекомендуется)

```bash
# Запустите PostgreSQL
docker-compose -f ../../docker-compose.production.yml up -d postgres

# Проверьте статус
docker-compose -f ../../docker-compose.production.yml ps postgres

# Проверьте логи
docker-compose -f ../../docker-compose.production.yml logs postgres
```

### Вариант B: Локальная установка

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Создание базы данных:**
```bash
# Войдите в PostgreSQL
sudo -u postgres psql

# Создайте базу и пользователя
CREATE DATABASE ritual_db;
CREATE USER postgres WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ritual_db TO postgres;
\q
```

---

## 🔄 Миграция данных

### Автоматическая миграция (Рекомендуется)

Используйте готовый скрипт:

```bash
# 1. Установите DATABASE_URL для PostgreSQL
export DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ritual_db?schema=public"

# 2. Запустите скрипт миграции
./scripts/migrate-to-postgresql.sh
```

Скрипт автоматически:
- ✅ Создаст backup SQLite
- ✅ Переключит схему на PostgreSQL
- ✅ Создаст миграцию
- ✅ Применит миграцию
- ✅ Запустит seed (опционально)

### Ручная миграция

Если нужно больше контроля:

```bash
# 1. Backup текущей схемы
cp prisma/schema.prisma prisma/schema.sqlite.backup

# 2. Переключитесь на PostgreSQL схему
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# 3. Обновите DATABASE_URL в .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/ritual_db?schema=public

# 4. Сгенерируйте Prisma Client
pnpm prisma:generate

# 5. Создайте миграцию
pnpm prisma migrate dev --name init_postgresql

# 6. Примените миграцию (если нужно)
pnpm prisma migrate deploy
```

### Миграция данных из SQLite

Если у вас есть данные в SQLite, которые нужно перенести:

```bash
# 1. Экспортируйте данные из SQLite в CSV
sqlite3 prisma/dev.db <<EOF
.headers on
.mode csv
.output users.csv
SELECT * FROM users;
.output products.csv
SELECT * FROM products;
# ... для каждой таблицы
EOF

# 2. Импортируйте в PostgreSQL
psql $DATABASE_URL <<EOF
\copy users FROM 'users.csv' WITH CSV HEADER;
\copy products FROM 'products.csv' WITH CSV HEADER;
# ... для каждой таблицы
EOF
```

**Или используйте специализированные инструменты:**
- [pgloader](https://pgloader.readthedocs.io/) - автоматическая миграция
- [sqlite3-to-postgres](https://github.com/techouse/sqlite3-to-postgres) - простой скрипт

---

## ⚙️ Настройка приложения

### 1. Обновите .env

```env
# PostgreSQL connection
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ritual_db?schema=public

# Для production добавьте SSL
DATABASE_URL=postgresql://postgres:password@host:5432/db?schema=public&sslmode=require

# Connection Pool Settings (опционально)
DATABASE_POOL_SIZE=10
DATABASE_POOL_TIMEOUT=10
```

### 2. Настройте Prisma

Prisma автоматически использует connection pooling. Для оптимизации добавьте в `schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings
  // connection_limit = 10
  // pool_timeout = 10
}
```

### 3. Обновите PrismaService (опционально)

Для лучшего контроля над подключениями:

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    // Логирование медленных запросов
    this.$on('query' as never, (e: any) => {
      if (e.duration > 100) {
        this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL database');
  }
}
```

---

## ✅ Проверка

### 1. Проверьте подключение

```bash
# Через psql
psql $DATABASE_URL

# Через Prisma Studio
pnpm prisma studio
```

### 2. Проверьте данные

```bash
# Запустите приложение
pnpm start:dev

# Проверьте API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/catalog/categories
```

### 3. Проверьте производительность

```bash
# Включите query logging в Prisma
# Смотрите логи приложения для медленных запросов

# Проверьте индексы
psql $DATABASE_URL -c "\d products"
psql $DATABASE_URL -c "\d orders"
```

### 4. Нагрузочное тестирование

```bash
# Используйте Apache Bench или wrk
ab -n 1000 -c 10 http://localhost:3000/api/catalog/categories

# Или используйте k6
k6 run load-test.js
```

---

## 💾 Резервное копирование

### Автоматические backups

```bash
# Создайте backup
./scripts/backup-db.sh

# Восстановите из backup
./scripts/restore-db.sh backups/backup_20241120_120000.sql.gz
```

### Настройка cron для автоматических backups

```bash
# Добавьте в crontab
crontab -e

# Backup каждый день в 2:00 AM
0 2 * * * cd /path/to/apps/api && ./scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

### Ротация backups

Скрипт автоматически удаляет backups старше 30 дней. Измените `RETENTION_DAYS` в скрипте или `.env`:

```env
RETENTION_DAYS=60
```

---

## 🔧 Troubleshooting

### Проблема: Не могу подключиться к PostgreSQL

**Решение:**
```bash
# Проверьте, запущен ли PostgreSQL
docker-compose -f ../../docker-compose.production.yml ps postgres

# Проверьте логи
docker-compose -f ../../docker-compose.production.yml logs postgres

# Проверьте подключение
psql $DATABASE_URL
```

### Проблема: Ошибка "relation does not exist"

**Решение:**
```bash
# Примените миграции
pnpm prisma migrate deploy

# Или создайте новую миграцию
pnpm prisma migrate dev
```

### Проблема: Медленные запросы

**Решение:**
1. Проверьте индексы:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM products WHERE categoryId = 1;
   ```

2. Добавьте недостающие индексы в `schema.prisma`

3. Оптимизируйте запросы в коде (используйте `select` для нужных полей)

### Проблема: Connection pool exhausted

**Решение:**
1. Увеличьте `connection_limit` в Prisma
2. Проверьте, что соединения закрываются после использования
3. Используйте connection pooling на уровне приложения

### Проблема: SSL connection required

**Решение:**
```env
# Для production добавьте SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Для development можно использовать
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=disable
```

---

## 📊 Сравнение SQLite vs PostgreSQL

| Характеристика | SQLite | PostgreSQL |
|----------------|--------|------------|
| **Использование** | Development | Production |
| **Concurrent connections** | 1 writer | Unlimited |
| **Типы данных** | Ограниченные | Полные (Decimal, BigInt, JSON) |
| **Производительность** | Хорошо для малых БД | Отлично для любых размеров |
| **Масштабируемость** | Нет | Да |
| **Транзакции** | Базовые | Полные ACID |
| **Репликация** | Нет | Да |

---

## 🎯 Best Practices

1. **Всегда делайте backup перед миграцией**
2. **Тестируйте миграцию на staging окружении**
3. **Используйте транзакции для критичных операций**
4. **Мониторьте производительность после миграции**
5. **Настройте автоматические backups**
6. **Используйте connection pooling**
7. **Включите SSL для production**
8. **Регулярно обновляйте PostgreSQL**

---

## 📚 Дополнительные ресурсы

- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose PostgreSQL](https://hub.docker.com/_/postgres)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

## ✅ Чеклист миграции

- [ ] Backup SQLite базы данных
- [ ] PostgreSQL установлен и запущен
- [ ] DATABASE_URL обновлен в .env
- [ ] Схема переключена на PostgreSQL
- [ ] Миграция создана и применена
- [ ] Prisma Client сгенерирован
- [ ] Приложение запускается без ошибок
- [ ] API endpoints работают
- [ ] Данные корректны
- [ ] Производительность проверена
- [ ] Backups настроены
- [ ] Документация обновлена

---

**Готово! Ваше приложение теперь использует PostgreSQL для продакшена! 🎉**

