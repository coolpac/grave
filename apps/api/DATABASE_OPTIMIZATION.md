# 🗄️ Database Optimization Guide

Документация по оптимизации базы данных для production.

---

## 📋 Содержание

1. [Индексы](#индексы)
2. [Connection Pooling](#connection-pooling)
3. [Query Optimization](#query-optimization)
4. [Мониторинг и анализ](#мониторинг-и-анализ)
5. [Миграции](#миграции)
6. [Best Practices](#best-practices)

---

## 🔍 Индексы

### Добавленные индексы

#### AbandonedCart
- `@@index([recovered, createdAt])` - Для cron job запросов
- `@@index([userId, recovered, createdAt])` - Композитный для пользовательских запросов

#### Order
- `@@index([status, paymentStatus])` - Для фильтрации по обоим статусам
- `@@index([paymentStatus, createdAt])` - Для запросов по статусу оплаты с диапазоном дат
- `@@index([userId, createdAt])` - Для заказов пользователя, отсортированных по дате

#### Cart
- `@@index([updatedAt])` - Для определения брошенных корзин

#### ProductVariant
- `@@index([productId, isActive, price])` - Для запросов вариантов с фильтрацией по цене
- `@@index([stock])` - Для алертов о низком остатке

### Рекомендации по индексам

1. **Composite Indexes** - Используйте для частых комбинаций фильтров
2. **Partial Indexes** - Для условий WHERE (например, `WHERE isActive = true`)
3. **Covering Indexes** - Включайте часто запрашиваемые поля в индекс

---

## 🔌 Connection Pooling

### Настройка через DATABASE_URL

```env
# Production example
DATABASE_URL=postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=20&statement_cache_size=100
```

### Параметры

- **connection_limit** (рекомендуется: 10) - Максимальное количество соединений
- **pool_timeout** (рекомендуется: 20) - Таймаут ожидания соединения (секунды)
- **statement_cache_size** (рекомендуется: 100) - Размер кэша подготовленных запросов

### Проверка настроек

При запуске в development режиме, приложение предупредит, если pool settings отсутствуют:

```
⚠️  DATABASE_URL does not include connection pool settings.
   Recommended for production: ?connection_limit=10&pool_timeout=20&statement_cache_size=100
```

### Production рекомендации

Для production используйте **PgBouncer** или **Pgpool-II**:

```yaml
# docker-compose.yml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_USER: user
      DATABASES_PASSWORD: password
      DATABASES_DBNAME: database
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 25
```

---

## ⚡ Query Optimization

### Использование QueryOptimizerService

```typescript
import { QueryOptimizerService } from '../database/query-optimizer.service';

constructor(private readonly queryOptimizer: QueryOptimizerService) {}

// Select only needed fields
const products = await this.prisma.product.findMany({
  select: this.queryOptimizer.createSelect<Product>([
    'id',
    'name',
    'slug',
    'basePrice',
    'isActive',
  ]),
  where: { isActive: true },
});

// Pagination
const { skip, take, page, limit } = this.queryOptimizer.createPagination(1, 20);
const [data, total] = await Promise.all([
  this.prisma.product.findMany({ skip, take }),
  this.prisma.product.count(),
]);

// Cursor-based pagination (better for large datasets)
const { take, cursor } = this.queryOptimizer.createCursorPagination(
  lastCursor,
  20,
);
const items = await this.prisma.product.findMany({
  take,
  cursor,
  orderBy: { id: 'asc' },
});
const { data, nextCursor, hasMore } = this.queryOptimizer.processCursorResult(
  items,
  20,
);
```

### Best Practices

1. **Select только нужные поля**
   ```typescript
   // ❌ Плохо
   const user = await prisma.user.findUnique({ where: { id } });
   
   // ✅ Хорошо
   const user = await prisma.user.findUnique({
     where: { id },
     select: { id: true, firstName: true, lastName: true },
   });
   ```

2. **Используйте пагинацию везде**
   ```typescript
   // ❌ Плохо
   const allProducts = await prisma.product.findMany();
   
   // ✅ Хорошо
   const products = await prisma.product.findMany({
     skip: (page - 1) * limit,
     take: limit,
   });
   ```

3. **Ограничивайте вложенные данные**
   ```typescript
   // ✅ Хорошо
   const products = await prisma.product.findMany({
     include: {
       media: { take: 1 }, // Только первое изображение
       variants: { where: { isActive: true }, take: 5 },
     },
   });
   ```

4. **Используйте индексы в WHERE**
   ```typescript
   // ✅ Использует индекс [categoryId, isActive]
   const products = await prisma.product.findMany({
     where: {
       categoryId: 1,
       isActive: true,
     },
   });
   ```

---

## 📊 Мониторинг и анализ

### DatabaseService

`DatabaseService` предоставляет:

- **Query logging** - Логирование медленных запросов (>100ms по умолчанию)
- **EXPLAIN ANALYZE** - Анализ плана выполнения
- **Pool statistics** - Статистика соединений
- **Slow queries** - Список медленных запросов (требует pg_stat_statements)

### Настройка

```env
# Включить логирование запросов
DB_ENABLE_QUERY_LOGGING=true

# Порог для медленных запросов (мс)
DB_SLOW_QUERY_THRESHOLD_MS=100

# Включить EXPLAIN ANALYZE для медленных запросов
DB_ENABLE_EXPLAIN_ANALYZE=true
```

### Скрипт анализа производительности

```bash
# Запустить анализ
ts-node apps/api/scripts/analyze-db-performance.ts
```

**Что анализирует:**
- Использование индексов
- Статистика таблиц
- Медленные запросы
- Статус connection pool
- Рекомендации по оптимизации

**Пример вывода:**
```
📊 Index Usage Analysis
Total indexes: 45
Unused indexes (0 scans): 3
Low usage indexes (<10 scans): 5

⚠️  Unused Indexes (consider removing):
  - products.products_material_idx
  - orders.orders_paymentStatus_idx

✅ Most Used Indexes:
  - products.products_categoryId_isActive_idx: 1250 scans
  - orders.orders_userId_status_idx: 890 scans
```

---

## 🔄 Миграции

### Применение миграции с индексами

```bash
# Создать миграцию
npx prisma migrate dev --name add_performance_indexes

# Или применить готовую миграцию
psql $DATABASE_URL -f prisma/migrations/add_performance_indexes/migration.sql
```

### Проверка индексов

```sql
-- Список всех индексов
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Использование индексов
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

---

## 🛠️ Maintenance

### VACUUM

```typescript
// Через DatabaseService
await databaseService.vacuumTable('orders');
await databaseService.vacuumTable('products', true); // FULL VACUUM
```

### ANALYZE

```typescript
// Обновить статистику таблицы
await databaseService.analyzeTable('orders');
```

### Автоматическое обслуживание

PostgreSQL автоматически выполняет VACUUM и ANALYZE через autovacuum. Для production рекомендуется настроить:

```sql
-- Настройки autovacuum для активных таблиц
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
```

---

## 📚 Best Practices

### 1. Индексы

- ✅ Добавляйте индексы для часто используемых фильтров
- ✅ Используйте composite indexes для комбинаций полей
- ✅ Удаляйте неиспользуемые индексы
- ❌ Не создавайте слишком много индексов (замедляют INSERT/UPDATE)

### 2. Запросы

- ✅ Используйте `select` вместо `include` когда возможно
- ✅ Всегда используйте пагинацию для списков
- ✅ Ограничивайте вложенные данные (`take`, `where`)
- ✅ Используйте `findFirst` вместо `findMany` для одного результата

### 3. Connection Pooling

- ✅ Настройте connection_limit в production
- ✅ Используйте PgBouncer для высоких нагрузок
- ✅ Мониторьте количество активных соединений

### 4. Мониторинг

- ✅ Включите pg_stat_statements
- ✅ Регулярно анализируйте медленные запросы
- ✅ Мониторьте использование индексов
- ✅ Следите за dead tuple ratio

---

## 🔗 Дополнительные ресурсы

- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Indexing](https://www.postgresql.org/docs/current/indexes.html)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)

---

**Оптимизация БД - ключ к производительности приложения! 🚀**

