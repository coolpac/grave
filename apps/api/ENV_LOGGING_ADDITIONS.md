# Дополнения к .env.example для логирования

Добавьте следующие переменные в ваш `.env.example` и `.env`:

```env
# ============================================
# Logging Configuration
# ============================================
# Log Level: error, warn, info, debug
LOG_LEVEL=info

# Log Directory (relative to app root)
LOG_DIR=./logs

# Maximum files to keep (e.g., "14d" = 14 days, "30" = 30 files)
LOG_MAX_FILES=14d

# Enable file logging in development (default: false)
LOG_TO_FILE=false

# ============================================
# Sentry Error Tracking
# ============================================
# Sentry DSN (get from https://sentry.io)
# Format: https://<key>@<org>.ingest.sentry.io/<project>
SENTRY_DSN=

# Sentry Traces Sample Rate (0.0 to 1.0)
# 1.0 = 100% of transactions, 0.1 = 10%
SENTRY_TRACES_SAMPLE_RATE=1.0

# Sentry Profiles Sample Rate (0.0 to 1.0)
# 1.0 = 100% of profiles, 0.1 = 10%
SENTRY_PROFILES_SAMPLE_RATE=1.0

# Application Version (for release tracking)
APP_VERSION=1.0.0

# ============================================
# HTTP Logging
# ============================================
# Slow Request Threshold (milliseconds)
# Requests slower than this will be logged as warnings
SLOW_REQUEST_THRESHOLD=1000
```

## Пример полного .env.example

Скопируйте эти переменные в ваш `.env.example`:

```env
# ... existing variables ...

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
LOG_MAX_FILES=14d
LOG_TO_FILE=false

# Sentry
SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILES_SAMPLE_RATE=1.0
APP_VERSION=1.0.0

# HTTP Logging
SLOW_REQUEST_THRESHOLD=1000
```

