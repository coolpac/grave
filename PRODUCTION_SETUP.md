# 🚀 Настройка продакшена

## 📋 Содержание

1. [Настройка Redis](#настройка-redis)
2. [Применение индексов БД](#применение-индексов-бд)
3. [Настройка мониторинга](#настройка-мониторинга)
4. [Переменные окружения](#переменные-окружения)
5. [Проверка работоспособности](#проверка-работоспособности)

## 🔴 Настройка Redis

### Установка Redis

#### macOS (Homebrew)
```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Docker
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

#### Облачные решения
- **Redis Cloud**: https://redis.com/try-free/
- **AWS ElastiCache**: https://aws.amazon.com/elasticache/
- **DigitalOcean Managed Redis**: https://www.digitalocean.com/products/managed-databases

### Настройка переменных окружения

Создайте файл `.env` в `apps/api/`:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
# Или отдельно:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=your_password_here

# Cache Configuration
CACHE_TTL=300
CACHE_MAX_ITEMS=1000

# Environment
NODE_ENV=production
```

### Проверка подключения Redis

```bash
# Проверка работы Redis
redis-cli ping
# Должно вернуть: PONG

# Проверка подключения из Node.js
cd apps/api
node -e "const redis = require('redis'); const client = redis.createClient({url: process.env.REDIS_URL || 'redis://localhost:6379'}); client.connect().then(() => console.log('Connected!')).catch(console.error);"
```

### Автоматическое переключение между Redis и in-memory кэшем

Система автоматически использует:
- **Redis** в продакшене (`NODE_ENV=production`) при наличии `REDIS_URL` или `REDIS_HOST`
- **In-memory кэш** в разработке или если Redis недоступен

## 📊 Применение индексов БД

### Применение миграции

```bash
cd apps/api

# Для разработки (SQLite)
npx prisma migrate dev

# Для продакшена (PostgreSQL)
# Убедитесь, что DATABASE_URL указывает на PostgreSQL
npx prisma migrate deploy
```

### Добавленные индексы

#### Products (Товары)
- `@@index([material])` - фильтрация по материалу
- `@@index([categoryId, isActive])` - списки товаров по категории
- `@@index([categoryId, isActive, createdAt])` - сортировка по дате
- `@@index([material, isActive])` - фильтрация по материалу и активности
- `@@index([isActive, createdAt])` - общие списки товаров

#### Categories (Категории)
- `@@index([isActive, order])` - сортировка активных категорий
- `@@index([order])` - сортировка по порядку

#### Cart Items (Элементы корзины)
- `@@index([cartId, productId])` - поиск товара в корзине
- `@@index([cartId, productId, variantId])` - точный поиск варианта

#### Orders (Заказы)
- `@@index([userId, status])` - заказы пользователя по статусу
- `@@index([userId, status, createdAt])` - сортировка заказов
- `@@index([status, createdAt])` - общие списки заказов
- `@@index([createdAt])` - сортировка по дате создания

#### Product Variants (Варианты товаров)
- `@@index([productId, isActive])` - активные варианты товара
- `@@index([isActive])` - фильтрация активных вариантов

### Проверка индексов

```bash
# SQLite
sqlite3 prisma/dev.db ".indices products"

# PostgreSQL
psql $DATABASE_URL -c "\d products"
```

## 📈 Настройка мониторинга

### Встроенный мониторинг

API предоставляет эндпоинт `/api/metrics` для получения метрик:

```bash
curl http://localhost:3000/api/metrics
```

### Включение расширенного мониторинга

Добавьте в `.env`:

```env
ENABLE_METRICS=true
```

### Интеграция с Prometheus

#### 1. Установка prom-client

```bash
cd apps/api
pnpm add prom-client
pnpm add -D @types/prom-client
```

#### 2. Обновление MetricsService

Создайте файл `apps/api/src/common/metrics/prometheus.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly httpRequestDuration: promClient.Histogram<string>;
  private readonly httpRequestTotal: promClient.Counter<string>;
  private readonly httpRequestErrors: promClient.Counter<string>;

  constructor() {
    // Регистрируем метрики
    promClient.collectDefaultMetrics();

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.httpRequestErrors = new promClient.Counter({
      name: 'http_requests_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status'],
    });
  }

  recordRequestDuration(method: string, route: string, status: number, duration: number) {
    this.httpRequestDuration.observe({ method, route, status }, duration / 1000);
  }

  incrementRequestTotal(method: string, route: string, status: number) {
    this.httpRequestTotal.inc({ method, route, status });
    
    if (status >= 400) {
      this.httpRequestErrors.inc({ method, route, status });
    }
  }

  async getMetrics(): Promise<string> {
    return promClient.register.metrics();
  }
}
```

#### 3. Добавление эндпоинта Prometheus

Обновите `apps/api/src/common/metrics/metrics.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { PrometheusService } from './prometheus.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly prometheusService: PrometheusService,
  ) {}

  @Get()
  getMetrics() {
    return {
      metrics: this.metricsService.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('prometheus')
  async getPrometheusMetrics() {
    return this.prometheusService.getMetrics();
  }
}
```

### Интеграция с Grafana

1. Установите Prometheus и Grafana:
```bash
# Docker Compose
docker-compose up -d prometheus grafana
```

2. Настройте Prometheus для сбора метрик:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nestjs-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics/prometheus'
```

3. Импортируйте дашборд Grafana для Node.js/NestJS приложений

### Альтернативные решения мониторинга

#### DataDog
```bash
pnpm add dd-trace
```

#### New Relic
```bash
pnpm add newrelic
```

#### Sentry (для отслеживания ошибок)
```bash
pnpm add @sentry/node @sentry/nestjs
```

## 🔧 Переменные окружения

### Полный список переменных для продакшена

Создайте файл `apps/api/.env.production`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379
# Или:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=your_password

# Cache
CACHE_TTL=300
CACHE_MAX_ITEMS=1000

# Environment
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=30d

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_MANAGER_CHAT_ID=your_chat_id
ADMIN_WHITELIST=123456789,987654321

# Monitoring
ENABLE_METRICS=true

# CORS
FRONTEND_URL=https://your-frontend-domain.com
CLOUDFLARE_TUNNEL_URL=https://your-tunnel.trycloudflare.com
```

## ✅ Проверка работоспособности

### 1. Проверка Redis

```bash
# Проверка подключения
redis-cli ping

# Проверка из приложения
curl http://localhost:3000/api/products
# Первый запрос должен быть медленнее (загрузка из БД)
# Второй запрос должен быть быстрее (из кэша)
```

### 2. Проверка пагинации

```bash
# Запрос с пагинацией
curl "http://localhost:3000/api/products?page=1&limit=20"

# Должен вернуть:
# {
#   "data": [...],
#   "meta": {
#     "page": 1,
#     "limit": 20,
#     "total": 100,
#     "totalPages": 5,
#     "hasNextPage": true,
#     "hasPreviousPage": false
#   }
# }
```

### 3. Проверка индексов

```bash
# SQLite
sqlite3 prisma/dev.db "EXPLAIN QUERY PLAN SELECT * FROM products WHERE categoryId = 1 AND isActive = 1 ORDER BY createdAt DESC;"

# Должен показать использование индекса
```

### 4. Проверка мониторинга

```bash
# Метрики
curl http://localhost:3000/api/metrics

# Prometheus метрики (если настроено)
curl http://localhost:3000/api/metrics/prometheus
```

## 📊 Метрики производительности

### Ожидаемые улучшения

#### До оптимизации:
- Загрузка списка товаров: ~500-1000ms
- Размер ответа: ~500KB-2MB
- Запросы к БД: 1 запрос с множеством JOIN

#### После оптимизации:
- Загрузка страницы товаров (20 шт): ~50-150ms
- Размер ответа: ~50-100KB
- Запросы к БД: 2 параллельных запроса (данные + count)
- Кэширование: ~5-20ms (при попадании в кэш)
- Использование индексов: ускорение запросов в 5-10 раз

## 🔍 Отладка

### Проверка кэша Redis

```bash
# Подключение к Redis CLI
redis-cli

# Просмотр всех ключей
KEYS *

# Просмотр конкретного ключа
GET "categories"

# Очистка кэша
FLUSHALL
```

### Логирование медленных запросов

Медленные запросы (>1000ms) автоматически логируются в консоль.

Для изменения порога добавьте в `.env`:
```env
SLOW_REQUEST_THRESHOLD=500
```

## 🚀 Деплой

### Рекомендации по деплою

1. **База данных**: Используйте PostgreSQL в продакшене
2. **Redis**: Используйте managed Redis (Redis Cloud, AWS ElastiCache)
3. **Мониторинг**: Настройте алерты на медленные запросы и ошибки
4. **Кэширование**: Настройте TTL в зависимости от частоты обновления данных
5. **Индексы**: Регулярно анализируйте медленные запросы и добавляйте индексы

### Docker Compose пример

```yaml
version: '3.8'
services:
  api:
    build: ./apps/api
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=dbname
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 📝 Чеклист перед продакшеном

- [ ] Настроен Redis
- [ ] Применены миграции с индексами
- [ ] Настроены переменные окружения
- [ ] Включен мониторинг
- [ ] Настроены алерты
- [ ] Протестирована пагинация
- [ ] Протестировано кэширование
- [ ] Проверена производительность
- [ ] Настроен бэкап БД
- [ ] Настроен бэкап Redis (если используется)

