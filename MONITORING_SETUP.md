# 📊 Monitoring Setup Guide

Руководство по настройке системы мониторинга с Prometheus и Grafana.

---

## 🚀 Быстрый старт

### 1. Запуск всех сервисов

```bash
# Запустить все сервисы (API, PostgreSQL, Redis, Prometheus, Grafana)
docker-compose -f docker-compose.production.yml up -d

# Проверить статус
docker-compose -f docker-compose.production.yml ps
```

### 2. Проверка работы

- **API**: http://localhost:3000/api/health
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### 3. Включение метрик

Убедитесь, что в `.env` установлено:

```env
ENABLE_METRICS=true
```

---

## 📈 Доступные метрики

### HTTP Metrics

- `http_request_duration_seconds` - Длительность HTTP запросов
- `http_requests_total` - Общее количество запросов
- `http_active_requests` - Активные запросы

### Database Metrics

- `db_query_duration_seconds` - Длительность запросов к БД
- `db_queries_total` - Количество запросов к БД

### Cache Metrics

- `cache_hits_total` - Попадания в кэш
- `cache_misses_total` - Промахи кэша
- `cache_operations_total` - Операции с кэшем

### Business Metrics

- `orders_created_total` - Созданные заказы
- `cart_abandonments_total` - Брошенные корзины
- `product_views_total` - Просмотры товаров

### System Metrics

- `nodejs_heap_size_used_bytes` - Использованная память
- `nodejs_eventloop_lag_seconds` - Задержка event loop

---

## 🔧 Конфигурация

### Prometheus

Конфигурация: `prometheus/prometheus.yml`

**Основные настройки:**
- `scrape_interval: 15s` - Интервал сбора метрик
- `retention.time: 30d` - Хранение данных 30 дней

**Scrape targets:**
- `ritual-api` - Метрики API (http://api:3000/api/metrics)
- `ritual-api-health` - Health checks (опционально)

### Grafana

**Автоматическая настройка:**
- Datasource: `grafana/datasources/prometheus.yml`
- Dashboards: `grafana/dashboards/`

**Ручная настройка:**

1. Войдите в Grafana (admin/admin)
2. Добавьте Prometheus datasource:
   - URL: `http://prometheus:9090`
   - Access: Server (default)
3. Импортируйте dashboard из `grafana/dashboards/ritual-api-dashboard.json`

---

## 📊 Grafana Dashboard

### Панели

1. **HTTP Request Rate** - Количество запросов в секунду
2. **HTTP Request Duration (p95)** - 95-й перцентиль длительности
3. **Active HTTP Requests** - Текущие активные запросы
4. **HTTP Status Code Distribution** - Распределение по статус кодам
5. **Database Query Duration (p95)** - Длительность запросов к БД
6. **Database Query Rate** - Количество запросов к БД в секунду
7. **Cache Hit/Miss Ratio** - Соотношение попаданий/промахов
8. **Orders Created (per hour)** - Заказы в час
9. **Cart Abandonment Rate** - Процент брошенных корзин
10. **Product Views** - Просмотры товаров
11. **Node.js Memory Usage** - Использование памяти
12. **Node.js CPU Usage** - Использование CPU

---

## 🚨 Алерты

Алерты настроены в `prometheus/alerts.yml`:

- **HighErrorRate** - Высокий процент ошибок (>10%)
- **HighLatency** - Высокая задержка (P95 > 1s)
- **DatabaseSlowQueries** - Медленные запросы к БД (P95 > 0.5s)
- **DatabaseErrorRate** - Высокий процент ошибок БД
- **LowCacheHitRatio** - Низкий процент попаданий в кэш (<50%)
- **HighMemoryUsage** - Высокое использование памяти (>90%)
- **HighEventLoopLag** - Высокая задержка event loop (>0.1s)

### Настройка Alertmanager (опционально)

Добавьте в `prometheus/prometheus.yml`:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

---

## 🔍 Примеры запросов PromQL

### Request Rate

```promql
rate(http_requests_total[5m])
```

### P95 Latency

```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Error Rate

```promql
rate(http_requests_total{status_code=~"5.."}[5m])
```

### Cache Hit Ratio

```promql
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

### Orders per Hour

```promql
increase(orders_created_total[1h])
```

---

## 🛠️ Troubleshooting

### Метрики не собираются

1. Проверьте, что `ENABLE_METRICS=true` в `.env`
2. Проверьте эндпоинт: `curl http://localhost:3000/api/metrics`
3. Проверьте логи API: `docker logs ritual_api`

### Prometheus не может подключиться к API

1. Проверьте, что API запущен: `docker ps | grep api`
2. Проверьте сеть: `docker network inspect ritual_network`
3. Проверьте URL в `prometheus.yml`: должен быть `api:3000` (не `localhost`)

### Grafana не видит данные

1. Проверьте datasource: Settings → Data Sources → Prometheus
2. Проверьте URL: должен быть `http://prometheus:9090` (не `localhost`)
3. Проверьте, что Prometheus собирает метрики: http://localhost:9090/targets

---

## 📚 Дополнительные ресурсы

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

**Мониторинг помогает понять, что происходит в production! 📊**

