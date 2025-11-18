# Environment Variables

Полное описание всех переменных окружения приложения.

## Быстрый старт

1. Скопируйте `.env.example` в `.env`:
   ```bash
   cp .env.example .env
   ```

2. Заполните обязательные переменные (см. раздел "Обязательные переменные")

3. Запустите приложение:
   ```bash
   pnpm start:dev
   ```

## Обязательные переменные

Эти переменные **обязательны** для работы приложения:

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | JWT secret (минимум 32 символа) | `your-secret-key-minimum-32-characters` |
| `BOT_TOKEN` | Telegram bot token | `123456:ABC-DEF...` |

## Все переменные окружения

### Application Configuration

| Переменная | Тип | По умолчанию | Описание |
|------------|-----|--------------|----------|
| `NODE_ENV` | `string` | `development` | Окружение: `development`, `production`, `test` |
| `PORT` | `number` | `3000` | Порт приложения (1-65535) |
| `HOST` | `string` | `0.0.0.0` | Хост приложения |

### Database Configuration

| Переменная | Тип | Обязательно | Описание |
|------------|-----|-------------|----------|
| `DATABASE_URL` | `string` | ✅ | PostgreSQL connection string |

**Формат:**
```
postgresql://user:password@host:port/database?schema=public
```

**Примеры:**
- Development: `postgresql://postgres:password@localhost:5432/ritual_db?schema=public`
- Production: `postgresql://user:pass@db.example.com:5432/ritual_db?schema=public&sslmode=require`

### JWT Configuration

| Переменная | Тип | Обязательно | Описание |
|------------|-----|-------------|----------|
| `JWT_SECRET` | `string` | ✅ | Секретный ключ (минимум 32 символа) |
| `JWT_EXPIRES_IN` | `string` | ❌ | Время жизни токена (default: `7d`) |

**Генерация JWT_SECRET:**
```bash
# Linux/macOS
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Формат JWT_EXPIRES_IN:**
- `7d` - 7 дней
- `24h` - 24 часа
- `60m` - 60 минут
- `3600s` - 3600 секунд

### Redis Configuration

| Переменная | Тип | Обязательно | Описание |
|------------|-----|-------------|----------|
| `REDIS_URL` | `string` | ❌ | Redis connection URL |
| `REDIS_HOST` | `string` | ❌ | Redis host (если не указан REDIS_URL) |
| `REDIS_PORT` | `number` | ❌ | Redis port (default: `6379`) |
| `REDIS_PASSWORD` | `string` | ❌ | Redis password |

**Формат REDIS_URL:**
```
redis://:password@host:port
```

**Примеры:**
- Без пароля: `redis://localhost:6379`
- С паролем: `redis://:mypassword@localhost:6379`

**Примечание:** В production рекомендуется использовать Redis для кэширования.

### Telegram Bot Configuration

| Переменная | Тип | Обязательно | Описание |
|------------|-----|-------------|----------|
| `BOT_TOKEN` | `string` | ✅ | Telegram bot token |
| `CUSTOMER_BOT_TOKEN` | `string` | ❌ | Customer bot token (опционально) |
| `ADMIN_BOT_TOKEN` | `string` | ❌ | Admin bot token (опционально) |
| `TELEGRAM_MANAGER_CHAT_ID` | `string` | ❌ | Chat ID для уведомлений |
| `CUSTOMER_BOT_API_URL` | `string` | ❌ | Customer bot API URL (для разработки) |
| `ADMIN_BOT_API_URL` | `string` | ❌ | Admin bot API URL (для разработки) |
| `INIT_DATA_MAX_AGE_SEC` | `number` | ❌ | Максимальный возраст initData в секундах (default: `300`) |

**Получение BOT_TOKEN:**
1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте полученный токен

### Frontend & URLs

| Переменная | Тип | Обязательно | Описание |
|------------|-----|-------------|----------|
| `FRONTEND_URL` | `string` | ❌ | URL фронтенд приложения |
| `CLOUDFLARE_TUNNEL_URL` | `string` | ❌ | Cloudflare Tunnel URL |
| `PUBLIC_URL` | `string` | ❌ | Публичный URL для файлов (default: `http://localhost:3000`) |

### Admin Configuration

| Переменная | Тип | Обязательно | Описание |
|------------|-----|-------------|----------|
| `ADMIN_WHITELIST` | `string` | ❌ | Список Telegram user IDs через запятую |

**Пример:**
```env
ADMIN_WHITELIST=123456789,987654321
```

### Cache Configuration

| Переменная | Тип | По умолчанию | Описание |
|------------|-----|--------------|----------|
| `CACHE_TTL` | `number` | `300` | TTL кэша в секундах (5 минут) |
| `CACHE_MAX_ITEMS` | `number` | `1000` | Максимальное количество элементов в кэше |

### Logging Configuration

| Переменная | Тип | По умолчанию | Описание |
|------------|-----|--------------|----------|
| `LOG_LEVEL` | `string` | `info` | Уровень логирования: `error`, `warn`, `info`, `debug` |
| `LOG_DIR` | `string` | `./logs` | Директория для логов |
| `LOG_MAX_FILES` | `string` | `14d` | Хранение логов (например, `14d`, `30`) |
| `LOG_TO_FILE` | `boolean` | `false` | Записывать логи в файлы в development |

### Sentry Error Tracking

| Переменная | Тип | Обязательно | Описание |
|------------|-----|-------------|----------|
| `SENTRY_DSN` | `string` | ❌ | Sentry DSN для отслеживания ошибок |
| `SENTRY_TRACES_SAMPLE_RATE` | `number` | ❌ | Sample rate для traces (0.0-1.0, default: `1.0`) |
| `SENTRY_PROFILES_SAMPLE_RATE` | `number` | ❌ | Sample rate для profiles (0.0-1.0, default: `1.0`) |
| `APP_VERSION` | `string` | ❌ | Версия приложения (default: `1.0.0`) |

**Получение SENTRY_DSN:**
1. Создайте проект на [sentry.io](https://sentry.io)
2. Скопируйте DSN из настроек проекта
3. Формат: `https://key@org.ingest.sentry.io/project`

**Рекомендации для production:**
- `SENTRY_TRACES_SAMPLE_RATE=0.1` (10% для экономии)
- `SENTRY_PROFILES_SAMPLE_RATE=0.1` (10% для экономии)

### HTTP & Performance

| Переменная | Тип | По умолчанию | Описание |
|------------|-----|--------------|----------|
| `SLOW_REQUEST_THRESHOLD` | `number` | `1000` | Порог медленных запросов в миллисекундах |

### Health Check Configuration

| Переменная | Тип | По умолчанию | Описание |
|------------|-----|--------------|----------|
| `MEMORY_HEALTH_THRESHOLD` | `number` | `90` | Максимальное использование памяти в процентах |
| `DISK_HEALTH_THRESHOLD` | `number` | `10` | Минимальное свободное место на диске в процентах |

### Graceful Shutdown

| Переменная | Тип | По умолчанию | Описание |
|------------|-----|--------------|----------|
| `SHUTDOWN_TIMEOUT` | `number` | `10000` | Таймаут graceful shutdown в миллисекундах |

### Rate Limiting (Throttler)

| Переменная | Тип | По умолчанию | Описание |
|------------|-----|--------------|----------|
| `THROTTLE_TTL` | `number` | `60000` | Временное окно throttler в миллисекундах (1 минута) |
| `THROTTLE_LIMIT` | `number` | `100` | Лимит запросов за временное окно |

### Metrics

| Переменная | Тип | По умолчанию | Описание |
|------------|-----|--------------|----------|
| `ENABLE_METRICS` | `boolean` | `false` | Включить сбор метрик |

## Валидация переменных

При запуске приложения все переменные окружения валидируются с помощью Joi схемы.

**Ошибки валидации:**
- Приложение не запустится, если обязательные переменные отсутствуют
- Приложение не запустится, если переменные имеют неверный формат
- Приложение не запустится, если обнаружены неизвестные переменные

**Пример ошибки:**
```
Error: Config validation error: "JWT_SECRET" length must be at least 32 characters long
```

## Примеры конфигураций

### Development

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/ritual_db
JWT_SECRET=development-secret-key-minimum-32-characters-long
BOT_TOKEN=123456:ABC-DEF...
LOG_LEVEL=debug
LOG_TO_FILE=false
```

### Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db.example.com:5432/ritual_db?sslmode=require
JWT_SECRET=production-strong-random-secret-minimum-32-characters
BOT_TOKEN=123456:ABC-DEF...
REDIS_URL=redis://:password@redis.example.com:6379
SENTRY_DSN=https://key@org.ingest.sentry.io/project
SENTRY_TRACES_SAMPLE_RATE=0.1
LOG_LEVEL=info
LOG_TO_FILE=true
```

## Безопасность

⚠️ **ВАЖНО:**

1. **НИКОГДА** не коммитьте `.env` файл в Git
2. Используйте **сильные секреты** в production
3. Регулярно **ротируйте** JWT_SECRET и пароли
4. Используйте **разные секреты** для разных окружений
5. Храните секреты в **secure vault** (например, AWS Secrets Manager, HashiCorp Vault)

## Troubleshooting

### Ошибка: "DATABASE_URL is required"

**Решение:** Убедитесь, что переменная `DATABASE_URL` установлена в `.env` файле.

### Ошибка: "JWT_SECRET must be at least 32 characters long"

**Решение:** Увеличьте длину `JWT_SECRET` до минимум 32 символов.

### Ошибка: "Unknown environment variable: UNKNOWN_VAR"

**Решение:** Удалите неизвестную переменную из `.env` или добавьте её в схему валидации.

### Переменные не загружаются

**Решение:**
1. Убедитесь, что файл `.env` находится в корне проекта (`apps/api/.env`)
2. Проверьте синтаксис `.env` файла (нет ли ошибок)
3. Перезапустите приложение

## Дополнительные ресурсы

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [Joi Validation](https://joi.dev/api/)
- [12-Factor App: Config](https://12factor.net/config)

