# 📊 Prometheus Metrics & APM

Документация по системе мониторинга с Prometheus и Grafana.

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Установка и запуск](#установка-и-запуск)
3. [Доступные метрики](#доступные-метрики)
4. [Использование в коде](#использование-в-коде)
5. [Grafana Dashboard](#grafana-dashboard)
6. [Конфигурация Prometheus](#конфигурация-prometheus)
7. [Алерты](#алерты)

---

## 🎯 Обзор

Приложение экспортирует метрики в формате Prometheus для мониторинга производительности и бизнес-показателей.

**Компоненты:**
- **Prometheus** - Сбор и хранение метрик
- **Grafana** - Визуализация метрик
- **Prometheus Client** - Экспорт метрик из приложения

---

## 🚀 Установка и запуск

### Docker Compose

```bash
# Запустить все сервисы включая Prometheus и Grafana
docker-compose -f docker-compose.production.yml up -d

# Проверить статус
docker-compose -f docker-compose.production.yml ps
```

**Сервисы:**
- **API**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### Включение метрик

Установите переменную окружения:

```env
ENABLE_METRICS=true
```

---

## 📈 Доступные метрики

### HTTP Metrics

#### http_request_duration_seconds

Гистограмма длительности HTTP запросов.

**Labels:**
- `method` - HTTP метод (GET, POST, etc.)
- `route` - Нормализованный путь (например, `/api/products/:id`)
- `status_code` - HTTP статус код

**Пример запроса:**
```promql
# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Средняя длительность
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

#### http_requests_total

Счетчик общего количества HTTP запросов.

**Labels:**
- `method` - HTTP метод
- `route` - Нормализованный путь
- `status_code` - HTTP статус код

**Пример запроса:**
```promql
# Requests per second
rate(http_requests_total[5m])

# Requests by status code
sum by (status_code) (rate(http_requests_total[5m]))
```

#### http_active_requests

Gauge активных HTTP запросов.

**Labels:**
- `method` - HTTP метод
- `route` - Нормализованный путь

**Пример запроса:**
```promql
# Total active requests
sum(http_active_requests)
```

---

### Database Metrics

#### db_query_duration_seconds

Гистограмма длительности запросов к БД.

**Labels:**
- `operation` - Тип операции (create, read, update, delete)
- `table` - Имя таблицы

**Пример запроса:**
```promql
# P95 database query duration
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))
```

#### db_queries_total

Счетчик запросов к БД.

**Labels:**
- `operation` - Тип операции
- `table` - Имя таблицы
- `status` - Статус (success, error)

**Пример запроса:**
```promql
# Database queries per second
rate(db_queries_total[5m])

# Error rate
rate(db_queries_total{status="error"}[5m])
```

---

### Cache Metrics

#### cache_hits_total

Счетчик попаданий в кэш.

**Labels:**
- `key` - Ключ кэша

#### cache_misses_total

Счетчик промахов кэша.

**Labels:**
- `key` - Ключ кэша

#### cache_operations_total

Счетчик операций с кэшем.

**Labels:**
- `operation` - Тип операции (get, set, delete)
- `status` - Статус (success, error)

**Пример запроса:**
```promql
# Cache hit ratio
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

---

### Business Metrics

#### orders_created_total

Счетчик созданных заказов.

**Labels:**
- `status` - Статус заказа
- `payment_method` - Способ оплаты

**Пример запроса:**
```promql
# Orders per hour
increase(orders_created_total[1h])
```

#### cart_abandonments_total

Счетчик брошенных корзин.

**Labels:**
- `reason` - Причина брошенной корзины

**Пример запроса:**
```promql
# Abandonment rate
rate(cart_abandonments_total[5m])
```

#### product_views_total

Счетчик просмотров товаров.

**Labels:**
- `product_id` - ID товара
- `category_id` - ID категории

**Пример запроса:**
```promql
# Product views per hour
increase(product_views_total[1h])
```

---

### Node.js Metrics

Автоматически собираются метрики Node.js:

- `nodejs_heap_size_used_bytes` - Использованная память heap
- `nodejs_heap_size_total_bytes` - Общая память heap
- `nodejs_eventloop_lag_seconds` - Задержка event loop
- `nodejs_active_handles` - Активные handles
- `nodejs_active_requests` - Активные запросы

---

## 💻 Использование в коде

### Запись бизнес-метрик

```typescript
import { BusinessMetricsService } from '../common/metrics/business-metrics.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  async createOrder(orderData: any) {
    const order = await this.prisma.order.create({...});
    
    // Record order creation metric
    this.businessMetrics.recordOrderCreated(
      order.status,
      order.paymentMethod,
    );
    
    return order;
  }
}
```

### Запись метрик кэша

```typescript
import { CacheMetricsHelper } from '../common/metrics/cache-metrics.interceptor';

@Injectable()
export class MyService {
  constructor(
    private readonly cacheMetrics: CacheMetricsHelper,
  ) {}

  async getCachedData(key: string) {
    const cached = await this.cache.get(key);
    
    if (cached) {
      this.cacheMetrics.recordCacheHit(key);
      return cached;
    }
    
    this.cacheMetrics.recordCacheMiss(key);
    const data = await this.fetchData();
    await this.cache.set(key, data);
    return data;
  }
}
```

### Прямой доступ к Prometheus

```typescript
import { PrometheusService } from '../common/metrics/prometheus.service';

@Injectable()
export class MyService {
  constructor(
    private readonly prometheus: PrometheusService,
  ) {}

  recordCustomMetric(value: number) {
    // Create custom counter
    const customCounter = new promClient.Counter({
      name: 'my_custom_metric_total',
      help: 'My custom metric',
      registers: [this.prometheus.getRegistry()],
    });
    
    customCounter.inc(value);
  }
}
```

---

## 📊 Grafana Dashboard

### Импорт дашборда

1. Откройте Grafana: http://localhost:3001
2. Войдите (admin/admin)
3. Дашборд автоматически загрузится из `grafana/dashboards/`

### Панели дашборда

**HTTP Metrics:**
- Request Rate - Количество запросов в секунду
- Request Duration (p95) - 95-й перцентиль длительности
- Active Requests - Активные запросы
- Status Code Distribution - Распределение по статус кодам

**Database Metrics:**
- Query Duration (p95) - Длительность запросов
- Query Rate - Количество запросов в секунду

**Cache Metrics:**
- Hit/Miss Ratio - Соотношение попаданий/промахов

**Business Metrics:**
- Orders Created (per hour) - Заказы в час
- Cart Abandonment Rate - Процент брошенных корзин
- Product Views - Просмотры товаров

**System Metrics:**
- Node.js Memory Usage - Использование памяти
- Node.js CPU Usage - Использование CPU

---

## ⚙️ Конфигурация Prometheus

Файл конфигурации: `prometheus/prometheus.yml`

### Основные настройки

```yaml
global:
  scrape_interval: 15s      # Интервал сбора метрик
  evaluation_interval: 15s  # Интервал оценки правил
  external_labels:
    cluster: 'ritual-shop'
    environment: 'production'
```

### Scrape конфигурация

```yaml
scrape_configs:
  - job_name: 'ritual-api'
    scrape_interval: 15s
    metrics_path: '/api/metrics'
    static_configs:
      - targets: ['api:3000']
```

### Перезагрузка конфигурации

```bash
# После изменения prometheus.yml
curl -X POST http://localhost:9090/-/reload
```

---

## 🚨 Алерты

### Создание правил алертов

Создайте файл `prometheus/alerts.yml`:

```yaml
groups:
  - name: ritual_api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} req/s"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s"

      - alert: DatabaseSlowQueries
        expr: histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries"
          description: "P95 query duration is {{ $value }}s"
```

### Настройка Alertmanager

Добавьте в `prometheus.yml`:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

---

## 📚 Дополнительные ресурсы

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Client for Node.js](https://github.com/siimon/prom-client)
- [PromQL Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)

---

**Мониторинг - ключ к пониманию работы приложения в production! 📊**

