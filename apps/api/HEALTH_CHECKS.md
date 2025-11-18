# 🏥 Health Checks & Readiness Probes

Документация по системе health checks и graceful shutdown.

---

## 📋 Содержание

1. [Endpoints](#endpoints)
2. [Health Indicators](#health-indicators)
3. [Kubernetes Integration](#kubernetes-integration)
4. [Prometheus Metrics](#prometheus-metrics)
5. [Graceful Shutdown](#graceful-shutdown)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)

---

## 🔗 Endpoints

### GET /api/health

**Простая проверка доступности**

Возвращает 200 если приложение запущено.

**Response:**
```json
{
  "status": "ok",
  "info": {
    "app": {
      "status": "up",
      "uptime": "3600s",
      "timestamp": "2024-11-20T12:00:00.000Z",
      "environment": "production"
    }
  },
  "error": {},
  "details": {
    "app": {
      "status": "up",
      "uptime": "3600s",
      "timestamp": "2024-11-20T12:00:00.000Z",
      "environment": "production"
    }
  }
}
```

**Использование:**
- Простая проверка доступности
- Load balancer health checks
- Мониторинг uptime

---

### GET /api/health/ready

**Readiness Probe**

Проверяет готовность приложения обслуживать трафик.

**Проверяет:**
- ✅ Database connection (PostgreSQL)
- ✅ Redis connection

**Response (Success):**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "message": "Database connection is healthy",
      "timestamp": "2024-11-20T12:00:00.000Z"
    },
    "redis": {
      "status": "up",
      "message": "Redis connection is healthy",
      "timestamp": "2024-11-20T12:00:00.000Z"
    }
  }
}
```

**Response (Failure):**
```json
{
  "status": "error",
  "info": {},
  "error": {
    "database": {
      "status": "down",
      "message": "Database connection failed",
      "error": "Connection timeout"
    }
  }
}
```

**Использование:**
- Kubernetes readiness probe
- Проверка перед маршрутизацией трафика
- Rolling deployments

---

### GET /api/health/live

**Liveness Probe**

Проверяет, что приложение живо (не зависло).

**Проверяет:**
- ✅ Базовую доступность приложения
- ✅ Uptime

**Response:**
```json
{
  "status": "ok",
  "info": {
    "app": {
      "status": "up",
      "uptime": "3600s",
      "timestamp": "2024-11-20T12:00:00.000Z"
    }
  }
}
```

**Использование:**
- Kubernetes liveness probe
- Автоматический перезапуск при зависании
- Мониторинг состояния процесса

---

### GET /api/health/detailed

**Подробная проверка здоровья**

Полная проверка всех компонентов системы.

**Проверяет:**
- ✅ Database connection
- ✅ Redis connection
- ✅ Memory usage (<90%)
- ✅ Disk space (>10% free)

**Response:**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up", ... },
    "redis": { "status": "up", ... },
    "memory": {
      "status": "up",
      "message": "Memory usage is healthy",
      "memoryUsagePercent": "45.23",
      "usedMemoryMB": "1024.50",
      "freeMemoryMB": "2048.00",
      "totalMemoryMB": "4096.00",
      "threshold": 90
    },
    "disk": {
      "status": "up",
      "message": "Disk space is healthy",
      "freeSpacePercent": "75.50",
      "threshold": 10
    }
  }
}
```

**Использование:**
- Детальный мониторинг
- Алерты и уведомления
- Диагностика проблем

---

## 🔍 Health Indicators

### Database Health Indicator

Проверяет подключение к PostgreSQL через Prisma.

**Проверка:**
```sql
SELECT 1
```

**Критерии:**
- ✅ Успешное выполнение запроса
- ✅ Время ответа < 5 секунд

---

### Redis Health Indicator

Проверяет подключение к Redis через Cache Manager.

**Проверка:**
1. Запись тестового значения
2. Чтение тестового значения
3. Сравнение значений
4. Удаление тестового значения

**Критерии:**
- ✅ Успешная запись/чтение
- ✅ Время ответа < 3 секунд

---

### Memory Health Indicator

Проверяет использование памяти.

**Критерии:**
- ✅ Использование < 90% (настраивается)
- ✅ Доступная память > 10%

**Метрики:**
- `memoryUsagePercent` - Процент использования
- `usedMemoryMB` - Использованная память (MB)
- `freeMemoryMB` - Свободная память (MB)
- `totalMemoryMB` - Общая память (MB)

---

### Disk Health Indicator

Проверяет доступное место на диске.

**Критерии:**
- ✅ Свободное место > 10% (настраивается)
- ✅ Возможность записи в рабочую директорию

**Метрики:**
- `freeSpacePercent` - Процент свободного места

---

## ☸️ Kubernetes Integration

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1
```

**Поведение:**
- Проверка каждые 10 секунд
- После 3 неудач - перезапуск контейнера
- Не блокирует старт приложения

---

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
  successThreshold: 1
```

**Поведение:**
- Проверка каждые 5 секунд
- После 3 неудач - удаление из Service endpoints
- Трафик не маршрутизируется до успешной проверки

---

### Startup Probe (опционально)

```yaml
startupProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 20  # 100 seconds total
  successThreshold: 1
```

**Поведение:**
- Дает приложению время на запуск
- Отключает liveness/readiness до успешного старта
- Полезно для медленно стартующих приложений

---

## 📊 Prometheus Metrics

Health checks экспортируют метрики в формате Prometheus:

### health_check_duration_seconds

Гистограмма длительности health checks.

```
health_check_duration_seconds{check_type="readiness",status="success"} 0.045
health_check_duration_seconds{check_type="readiness",status="failure"} 2.500
```

**Labels:**
- `check_type` - Тип проверки (readiness, liveness, detailed)
- `status` - Результат (success, failure)

---

### health_check_failures_total

Счетчик неудачных health checks.

```
health_check_failures_total{check_type="readiness",component="database"} 5
health_check_failures_total{check_type="readiness",component="redis"} 2
```

**Labels:**
- `check_type` - Тип проверки
- `component` - Компонент (database, redis, memory, disk)

---

### health_check_status

Текущий статус компонентов (1 = healthy, 0 = unhealthy).

```
health_check_status{component="database"} 1
health_check_status{component="redis"} 1
health_check_status{component="memory"} 1
health_check_status{component="disk"} 0
```

**Labels:**
- `component` - Компонент

---

## 🛑 Graceful Shutdown

Приложение поддерживает graceful shutdown для корректного завершения работы.

### Процесс shutdown

1. **Получение сигнала** (SIGTERM, SIGINT)
2. **Остановка приема новых соединений**
3. **Ожидание завершения активных запросов** (до 10 секунд)
4. **Закрытие соединений с БД**
5. **Завершение процесса**

### Таймауты

- **SHUTDOWN_TIMEOUT** - Максимальное время на shutdown (по умолчанию: 10 секунд)
- После таймаута - принудительное завершение

### Обработка сигналов

- **SIGTERM** - Стандартный сигнал завершения (Kubernetes)
- **SIGINT** - Прерывание (Ctrl+C)
- **uncaughtException** - Необработанные исключения
- **unhandledRejection** - Необработанные промисы

### Пример логов

```
[INFO] Received SIGTERM, starting graceful shutdown
[INFO] Waiting for 5 active connections to close
[INFO] HTTP server closed
[INFO] Database connections closed
[INFO] Graceful shutdown completed
```

---

## ⚙️ Configuration

### Переменные окружения

```env
# Health Check Thresholds
MEMORY_HEALTH_THRESHOLD=90        # Maximum memory usage % (default: 90)
DISK_HEALTH_THRESHOLD=10          # Minimum free disk space % (default: 10)

# Graceful Shutdown
SHUTDOWN_TIMEOUT=10000            # Shutdown timeout in ms (default: 10000)
```

### Docker Compose

```yaml
api:
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health/live"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  stop_grace_period: 10s
```

---

## 🔧 Troubleshooting

### Проблема: Readiness probe fails

**Причина:** База данных или Redis недоступны

**Решение:**
1. Проверьте подключение к БД: `psql -h localhost -U postgres -d ritual_db`
2. Проверьте подключение к Redis: `redis-cli ping`
3. Проверьте логи: `docker logs ritual_api`
4. Проверьте переменные окружения: `DATABASE_URL`, `REDIS_URL`

---

### Проблема: Liveness probe fails

**Причина:** Приложение зависло или не отвечает

**Решение:**
1. Проверьте логи на ошибки
2. Проверьте использование памяти: `docker stats ritual_api`
3. Проверьте, что порт 3000 доступен
4. Перезапустите контейнер: `docker restart ritual_api`

---

### Проблема: Memory health check fails

**Причина:** Использование памяти > 90%

**Решение:**
1. Увеличьте лимит памяти в Docker/Kubernetes
2. Оптимизируйте использование памяти в приложении
3. Увеличьте `MEMORY_HEALTH_THRESHOLD` (не рекомендуется)

---

### Проблема: Disk health check fails

**Причина:** Недостаточно места на диске

**Решение:**
1. Освободите место на диске
2. Очистите старые логи: `rm -rf logs/*.log`
3. Очистите старые Docker образы: `docker system prune`

---

### Проблема: Graceful shutdown не работает

**Причина:** Неправильная обработка сигналов

**Решение:**
1. Убедитесь, что `app.enableShutdownHooks()` вызван
2. Проверьте, что приложение получает SIGTERM
3. Увеличьте `SHUTDOWN_TIMEOUT` если нужно
4. Проверьте логи на ошибки во время shutdown

---

## 📚 Best Practices

### 1. Используйте правильные endpoints

- **Liveness** - для проверки, что приложение не зависло
- **Readiness** - для проверки готовности обслуживать трафик
- **Health** - для простой проверки доступности

### 2. Настройте таймауты

- **Liveness timeout** - 5-10 секунд
- **Readiness timeout** - 3-5 секунд
- **Shutdown timeout** - 10-30 секунд

### 3. Мониторьте метрики

- Настройте алерты на `health_check_failures_total`
- Отслеживайте `health_check_duration_seconds`
- Мониторьте `health_check_status`

### 4. Тестируйте graceful shutdown

```bash
# Отправка SIGTERM
docker kill --signal=SIGTERM ritual_api

# Проверка логов
docker logs -f ritual_api
```

---

## 🔗 Дополнительные ресурсы

- [NestJS Terminus Documentation](https://docs.nestjs.com/recipes/terminus)
- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)

---

**Правильные health checks - залог стабильной работы в production! 🏥**

