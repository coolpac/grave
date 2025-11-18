# 📝 Logging & Error Tracking

Документация по системе логирования и отслеживания ошибок.

---

## 📋 Содержание

1. [Winston Logger](#winston-logger)
2. [Sentry Integration](#sentry-integration)
3. [HTTP Request Logging](#http-request-logging)
4. [Использование Logger](#использование-logger)
5. [Конфигурация](#конфигурация)
6. [Best Practices](#best-practices)

---

## 🪵 Winston Logger

Приложение использует [Winston](https://github.com/winstonjs/winston) для структурированного логирования.

### Форматы логирования

**Production:**
- JSON формат для легкого парсинга
- Все логи в файлы с ротацией
- Структурированные данные

**Development:**
- Pretty print в консоль
- Цветной вывод
- Удобочитаемый формат

### Уровни логирования

- **error** - Критичные ошибки
- **warn** - Предупреждения
- **info** - Информационные сообщения
- **debug** - Детальная отладочная информация

### Файлы логов

Логи сохраняются в директории `./logs/`:

- `error-YYYY-MM-DD.log` - Только ошибки
- `combined-YYYY-MM-DD.log` - Все логи
- `http-YYYY-MM-DD.log` - HTTP запросы
- `exceptions-YYYY-MM-DD.log` - Uncaught exceptions
- `rejections-YYYY-MM-DD.log` - Unhandled promise rejections

**Ротация:**
- Ежедневная ротация
- Автоматическое сжатие старых файлов
- Хранение 14 дней (настраивается)

---

## 🐛 Sentry Integration

[Sentry](https://sentry.io) используется для отслеживания ошибок в production.

### Возможности

- ✅ Автоматическая отправка uncaught exceptions
- ✅ Breadcrumbs для трассировки
- ✅ User context (Telegram ID)
- ✅ Request context (IP, User-Agent, Headers)
- ✅ Performance monitoring
- ✅ Release tracking

### Настройка

1. Создайте проект на [sentry.io](https://sentry.io)
2. Получите DSN
3. Добавьте в `.env`:
   ```env
   SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project
   ```

### Использование

**Автоматически:**
- Все ошибки >= 500 автоматически отправляются в Sentry
- Auth failures логируются как warnings
- Uncaught exceptions отслеживаются

**Вручную:**
```typescript
import * as Sentry from '@sentry/node';
import { setSentryUser, addSentryBreadcrumb } from './common/logger/sentry.config';

// Установить пользователя
setSentryUser({
  id: user.id,
  telegramId: user.telegramId,
  username: user.username,
});

// Добавить breadcrumb
addSentryBreadcrumb('User action', 'user.action', 'info', { action: 'click' });

// Отправить исключение
Sentry.captureException(error, {
  tags: { module: 'products' },
  extra: { productId: 123 },
});
```

---

## 📡 HTTP Request Logging

Все HTTP запросы логируются автоматически через `HttpLoggingInterceptor`.

### Логируемая информация

- Method, URL, Status Code
- Duration (время выполнения)
- IP адрес
- User-Agent
- User ID (если авторизован)
- Request/Response body (только для ошибок)

### Уровни логирования

- **info** - Успешные запросы
- **warn** - Медленные запросы (>1000ms) или 4xx ошибки
- **error** - 5xx ошибки

### Пример лога

```json
{
  "message": "HTTP Request",
  "method": "POST",
  "url": "/api/products",
  "statusCode": 201,
  "duration": "45ms",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "userId": 123,
  "timestamp": "2024-11-20T12:00:00.000Z"
}
```

---

## 💻 Использование Logger

### В сервисах и контроллерах

```typescript
import { Injectable, LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class MyService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async myMethod() {
    // Info log
    this.logger.log({
      message: 'Processing request',
      userId: 123,
      action: 'create',
    });

    // Warning log
    this.logger.warn({
      message: 'Slow operation detected',
      duration: 2000,
    });

    // Error log
    try {
      // ...
    } catch (error) {
      this.logger.error({
        message: 'Operation failed',
        error: error.message,
        stack: error.stack,
        context: { userId: 123 },
      });
    }
  }
}
```

### Структурированное логирование

Всегда используйте объекты для логирования:

```typescript
// ✅ Правильно
this.logger.log({
  message: 'User created',
  userId: user.id,
  telegramId: user.telegramId,
});

// ❌ Неправильно
this.logger.log(`User created: ${user.id}`);
```

### Контекст в логах

Добавляйте контекст для лучшей трассировки:

```typescript
this.logger.error({
  message: 'Failed to process order',
  orderId: order.id,
  userId: order.userId,
  error: error.message,
  stack: error.stack,
  // Дополнительный контекст
  orderTotal: order.total,
  paymentStatus: order.paymentStatus,
});
```

---

## ⚙️ Конфигурация

### Переменные окружения

```env
# Logging
LOG_LEVEL=info                    # error, warn, info, debug
LOG_DIR=./logs                    # Директория для логов
LOG_MAX_FILES=14d                 # Хранение логов (14 дней)
LOG_TO_FILE=false                 # Записывать в файлы в development

# Sentry
SENTRY_DSN=https://...            # Sentry DSN
SENTRY_TRACES_SAMPLE_RATE=1.0     # 100% transactions
SENTRY_PROFILES_SAMPLE_RATE=1.0   # 100% profiles
APP_VERSION=1.0.0                 # Версия приложения

# HTTP Logging
SLOW_REQUEST_THRESHOLD=1000       # Порог медленных запросов (ms)
```

### Настройка уровней

**Development:**
```env
LOG_LEVEL=debug
LOG_TO_FILE=false
```

**Production:**
```env
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_MAX_FILES=30d
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% для экономии
```

---

## ✅ Best Practices

### 1. Используйте правильные уровни

- **error** - Только для ошибок, требующих внимания
- **warn** - Предупреждения, медленные операции
- **info** - Важные события (создание заказа, авторизация)
- **debug** - Детальная отладочная информация

### 2. Добавляйте контекст

```typescript
// ✅ Хорошо
this.logger.error({
  message: 'Payment failed',
  orderId: order.id,
  userId: order.userId,
  paymentId: payment.id,
  error: error.message,
});

// ❌ Плохо
this.logger.error('Payment failed');
```

### 3. Не логируйте чувствительные данные

```typescript
// ✅ Правильно - данные скрыты
this.logger.log({
  message: 'User authenticated',
  userId: user.id,
  // password не логируется
});

// ❌ Неправильно
this.logger.log({
  password: user.password, // НИКОГДА!
  token: user.token,       // НИКОГДА!
});
```

### 4. Используйте структурированные логи

```typescript
// ✅ JSON объект
this.logger.log({
  message: 'Order created',
  orderId: order.id,
  total: order.total,
});

// ❌ Строка (сложнее парсить)
this.logger.log(`Order ${order.id} created with total ${order.total}`);
```

### 5. Логируйте ошибки с stack trace

```typescript
try {
  // ...
} catch (error) {
  this.logger.error({
    message: 'Operation failed',
    error: error.message,
    stack: error.stack, // Важно для отладки
    context: { /* дополнительный контекст */ },
  });
}
```

---

## 🔍 Мониторинг и алерты

### Sentry Alerts

Настройте алерты в Sentry:

1. **Critical Errors** - Ошибки >= 500
   - Условие: Error rate > 10/min
   - Действие: Email/Slack уведомление

2. **Auth Failures** - Множественные неудачные попытки
   - Условие: Auth errors > 50/min
   - Действие: Security alert

3. **Slow Requests** - Медленные запросы
   - Условие: P95 > 2s
   - Действие: Performance alert

### Логирование в файлы

Проверка логов:

```bash
# Последние ошибки
tail -f logs/error-$(date +%Y-%m-%d).log

# Поиск по логам
grep "Order created" logs/combined-*.log

# Статистика ошибок
grep -c "error" logs/error-*.log
```

---

## 🧪 Тестирование

### Проверка логирования

```typescript
// В тестах можно мокировать logger
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Или использовать реальный logger для интеграционных тестов
```

### Проверка Sentry

```typescript
// В development можно проверить отправку
import * as Sentry from '@sentry/node';

Sentry.captureMessage('Test message', 'info');
```

---

## 📊 Метрики и аналитика

### Логирование метрик

```typescript
this.logger.log({
  message: 'Order created',
  metric: 'order.created',
  value: 1,
  tags: {
    status: 'paid',
    source: 'telegram',
  },
});
```

### Интеграция с аналитикой

Логи можно экспортировать в:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**
- **New Relic**
- **CloudWatch** (AWS)

---

## 🔧 Troubleshooting

### Проблема: Логи не записываются в файлы

**Решение:**
1. Проверьте права на директорию `./logs`
2. Убедитесь, что `LOG_TO_FILE=true` или `NODE_ENV=production`
3. Проверьте доступное место на диске

### Проблема: Sentry не отправляет ошибки

**Решение:**
1. Проверьте `SENTRY_DSN` в `.env`
2. Проверьте интернет соединение
3. Проверьте логи Sentry в консоли (debug mode)

### Проблема: Слишком много логов

**Решение:**
1. Уменьшите `LOG_LEVEL` до `warn` или `error`
2. Уменьшите `SENTRY_TRACES_SAMPLE_RATE`
3. Настройте фильтры в Winston

---

## 📚 Дополнительные ресурсы

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Sentry Node.js Guide](https://docs.sentry.io/platforms/javascript/guides/node/)
- [NestJS Logging](https://docs.nestjs.com/techniques/logger)

---

**Правильное логирование - ключ к быстрой отладке и мониторингу! 📝**

