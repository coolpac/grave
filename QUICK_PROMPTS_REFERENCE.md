# ⚡ Быстрая справка - Промпты для Cursor

> Используйте эти промпты последовательно для подготовки проекта к продакшену

---

## 🔥 КРИТИЧНЫЕ ПРОМПТЫ (Делать в первую очередь)

### 1️⃣ PostgreSQL Migration (Блокирует продакшен)

```
Мне нужно мигрировать проект с SQLite на PostgreSQL для продакшена:

1. Создай docker-compose.production.yml с PostgreSQL 15 и Redis
2. Обнови prisma/schema.prisma:
   - Замени provider на "postgresql"
   - Измени String на BigInt для telegramId
   - Замени Float на Decimal для цен
   - Добавь composite indexes для частых запросов
3. Создай production миграцию
4. Добавь скрипт для backup базы данных
5. Обнови .env.example с переменными для PostgreSQL
6. Документируй процесс миграции в README

Используй connection pooling и SSL для production.
```

### 2️⃣ Security Headers (Критично для безопасности)

```
Добавь защиту приложения с Helmet и Rate Limiting:

1. Установи @nestjs/helmet, @nestjs/throttler
2. В apps/api/src/main.ts добавь helmet с конфигурацией для Telegram WebApp
3. Настрой дифференцированный rate limiting:
   - /auth/*: 5 запросов в минуту
   - /orders: 10 запросов в минуту
   - Публичные endpoints: 100 запросов в минуту
4. Добавь CORS только для проверенных доменов
5. Включи HSTS, CSP, X-Frame-Options
6. Документируй security настройки

Учти, что приложение работает внутри Telegram iframe.
```

### 3️⃣ Environment Validation (Предотвращает ошибки)

```
Добавь валидацию переменных окружения при старте приложения:

1. Установи @hapi/joi и @nestjs/config
2. Создай apps/api/src/config/env.validation.ts с Joi схемой для:
   - DATABASE_URL (обязательно)
   - JWT_SECRET (обязательно, минимум 32 символа)
   - TELEGRAM_BOT_TOKEN (обязательно)
   - NODE_ENV (enum: development, production, test)
   - Все остальные env переменные
3. Обнови app.module.ts с validationSchema
4. Создай типизированный interface для ConfigService
5. Обнови .env.example со всеми переменными и описаниями

Приложение должно падать с понятной ошибкой при отсутствии обязательных переменных.
```

### 4️⃣ Logging & Monitoring (Нужно для отладки)

```
Реализуй профессиональное логирование с Winston и Sentry:

1. Установи winston, nest-winston, @sentry/node
2. Создай apps/api/src/common/logger/winston.config.ts:
   - JSON формат для production
   - Pretty для development
   - Ротация логов (daily, 14 дней хранения)
3. Интегрируй Sentry:
   - Автоматическая отправка exceptions
   - User context (Telegram ID)
   - Request breadcrumbs
4. Замени все console.log на logger
5. Добавь HTTP request logging middleware
6. Настрой алерты для критичных ошибок

Добавь примеры SENTRY_DSN в .env.example.
```

### 5️⃣ Health Checks (Для мониторинга)

```
Добавь health check endpoints с @nestjs/terminus:

1. Создай apps/api/src/health/health.controller.ts
2. Реализуй endpoints:
   - GET /health - простая проверка
   - GET /health/ready - проверка готовности (DB, Redis)
   - GET /health/live - проверка работоспособности
3. Проверяй состояние:
   - Prisma database connection
   - Redis connection (если используется)
   - Disk space > 10% свободно
   - Memory < 90% использования
4. Добавь graceful shutdown:
   - Завершение активных запросов
   - Закрытие DB connections
   - Timeout 10 секунд
5. Обнови docker-compose с healthcheck директивами

Используй для Kubernetes readiness/liveness probes.
```

---

## ⚡ ВЫСОКИЙ ПРИОРИТЕТ (Улучшает UX)

### 6️⃣ Code Splitting Frontend

```
Оптимизируй загрузку фронтенда с code splitting:

1. В apps/web/src/App.tsx замени все импорты страниц на React.lazy():
   ```tsx
   const Home = lazy(() => import('./pages/Home'))
   const Product = lazy(() => import('./pages/Product'))
   // и т.д.
   ```
2. Оберни <Routes> в <Suspense> с красивым fallback
3. Настрой vite.config.ts для оптимального chunk splitting:
   - Vendor chunk (react, react-dom)
   - UI chunk (@monorepo/ui)
   - Page chunks
4. Добавь preload для критичных ресурсов
5. Измерь bundle size до и после

Цель: First Load JS < 200KB.
```

### 7️⃣ Image Optimization

```
Создай систему оптимизации изображений:

1. Создай компонент apps/web/src/components/OptimizedImage.tsx:
   - Автоопределение WebP support
   - Responsive images с srcset
   - Lazy loading с Intersection Observer
   - Blur placeholder при загрузке
   - Error fallback
2. Добавь поддержку multiple размеров (thumbnail, medium, large)
3. Используй aspect-ratio CSS для предотвращения layout shift
4. Замени все <img> на <OptimizedImage>
5. Настрой vite-plugin-image для оптимизации статики

Используй WebP с JPEG fallback.
```

### 8️⃣ React Query Optimization

```
Оптимизируй работу с данными через React Query:

1. В apps/web/src/App.tsx настрой QueryClient:
   - staleTime: 5 минут для каталога
   - cacheTime: 10 минут
   - retry: 1
2. Добавь prefetching:
   - Товары категории при hover
   - Детали товара из списка
   - Следующая страница пагинации
3. Реализуй Optimistic Updates для корзины
4. Добавь query invalidation после мутаций
5. Настрой devtools для development

Используй onSuccess/onError для toast notifications.
```

### 9️⃣ Cloud Storage (S3/R2)

```
Замени локальное хранилище файлов на CloudFlare R2:

1. Установи @aws-sdk/client-s3
2. Создай apps/api/src/storage/r2.service.ts для работы с R2
3. Обнови UploadService:
   - Загрузка в R2 вместо локальной папки
   - Генерация WebP превью
   - Multiple sizes (thumbnail, medium, large)
4. Добавь signed URLs для безопасности
5. Создай cron job для очистки неиспользуемых файлов
6. Напиши скрипт миграции существующих файлов

Конфигурация через .env: R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY.
Fallback на локальное хранилище для development.
```

### 🔟 Virtual Lists

```
Добавь виртуализацию для списков товаров:

1. Установи @tanstack/react-virtual
2. Создай apps/web/src/components/VirtualizedProductGrid.tsx:
   - Виртуализация grid layout (2 колонки)
   - Dynamic height
   - Smooth scrolling
3. Обнови Category.tsx и MaterialCategories.tsx
4. Добавь infinite scroll с Intersection Observer
5. Оптимизируй ProductCard с React.memo
6. Измерь FPS до и после

Цель: 60 FPS даже с 100+ товарами.
```

---

## 📊 СРЕДНИЙ ПРИОРИТЕТ (Мониторинг и оптимизация)

### Background Jobs

```
Настрой Bull Queue для фоновых задач:
- Email уведомления
- Обработка изображений
- Очистка брошенных корзин

Требует Redis.
```

### Prometheus Metrics

```
Добавь сбор метрик с prom-client:
- HTTP request duration
- DB query time
- Cache hit/miss ratio
- Custom business metrics

Эндпоинт GET /metrics для Prometheus.
```

### Service Worker & Offline

```
Улучши PWA с vite-plugin-pwa:
- Offline fallback page
- API caching strategies
- Background sync для корзины
- Update notifications
```

### Web Vitals Monitoring

```
Добавь мониторинг производительности:
- LCP, FID, CLS, FCP, TTFB
- Отправка в Google Analytics
- Performance budget warnings

Цель: Lighthouse Score 90+.
```

### Bundle Size Optimization

```
Уменьши JavaScript bundle:
- Tree-shaking для lucide-react
- Dynamic imports для тяжелых компонентов
- Terser minification
- Brotli compression

Цель: < 400KB total, < 150KB gzipped.
```

---

## 📋 Низкий приоритет (Nice to have)

- Swagger API Documentation
- Framer Motion оптимизация для слабых устройств
- Database query optimization
- React components memoization
- CI/CD pipeline improvements

---

## 🎯 Рекомендуемый порядок внедрения

### День 1-2: Критичное
1. PostgreSQL Migration
2. Security Headers
3. Environment Validation

### День 3-4: Логирование и мониторинг
4. Logging & Monitoring
5. Health Checks

### День 5-7: Frontend оптимизация
6. Code Splitting
7. Image Optimization
8. React Query Optimization

### День 8-10: Infrastructure
9. Cloud Storage
10. Virtual Lists

### День 11-14: Дополнительная оптимизация
- Background Jobs
- Prometheus Metrics
- Service Worker
- Web Vitals

---

## 💡 Советы по использованию

1. **Копируйте промпт полностью** - включая все пункты
2. **Тестируйте после каждого промпта** - убедитесь что всё работает
3. **Коммитьте после каждого изменения** - для отката если что-то сломается
4. **Измеряйте метрики** - до и после оптимизации
5. **Документируйте изменения** - обновляйте README

---

## 📊 Ожидаемые результаты

### После критичных промптов (1-5)
- ✅ Готовность к продакшену
- ✅ Безопасность на уровне
- ✅ Мониторинг настроен

### После высокого приоритета (6-10)
- ⚡ Загрузка ускорена в 2-3 раза
- ⚡ Bundle size уменьшен на 40-50%
- ⚡ Лаги на мобильных устранены

### После всех оптимизаций
- 🚀 Lighthouse Score 90+
- 🚀 Response time < 100ms
- 🚀 First Load < 2 секунды
- 🚀 Готово к масштабированию

---

**Успехов с оптимизацией! 🎉**

