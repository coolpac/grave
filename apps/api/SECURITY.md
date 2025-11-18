# 🔒 Security Configuration

Документация по настройке безопасности приложения.

---

## 📋 Содержание

1. [Security Headers (Helmet)](#security-headers-helmet)
2. [Rate Limiting](#rate-limiting)
3. [CORS Configuration](#cors-configuration)
4. [Best Practices](#best-practices)
5. [Testing Security](#testing-security)

---

## 🛡️ Security Headers (Helmet)

Приложение использует [Helmet](https://helmetjs.github.io/) для установки различных HTTP заголовков безопасности.

### Настроенные заголовки

#### Content Security Policy (CSP)

Оптимизирован для работы Telegram Mini App в iframe:

```typescript
// Разрешенные источники для Telegram WebApp
- 'self'
- https://telegram.org
- https://*.telegram.org
- https://*.telegramcdn.net
- https://*.tcdn.me
```

**Особенности:**
- `'unsafe-inline'` для scripts и styles (требуется для Telegram WebApp SDK)
- `'unsafe-eval'` для scripts (требуется для некоторых функций Telegram)
- Разрешен `blob:` и `data:` для изображений
- Разрешен WebSocket для Telegram (`wss://*.telegram.org`)

#### HTTP Strict Transport Security (HSTS)

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- **max-age:** 1 год (31536000 секунд)
- **includeSubDomains:** Применяется ко всем поддоменам
- **preload:** Включен в HSTS preload list

#### X-Frame-Options

```http
X-Frame-Options: SAMEORIGIN
```

Разрешает встраивание в iframe для Telegram WebApp.

#### X-Content-Type-Options

```http
X-Content-Type-Options: nosniff
```

Предотвращает MIME type sniffing.

#### Referrer Policy

```http
Referrer-Policy: strict-origin-when-cross-origin
```

Контролирует, какая информация отправляется в заголовке Referer.

#### Другие заголовки

- **X-DNS-Prefetch-Control:** Разрешен для производительности
- **X-Download-Options:** Запрещено открытие в IE8+
- **X-Permitted-Cross-Domain-Policies:** None
- **X-XSS-Protection:** Включен (legacy, но полезен)
- **Cross-Origin-Resource-Policy:** cross-origin (для Telegram)
- **Origin-Agent-Cluster:** Включен

---

## 🚦 Rate Limiting

Приложение использует дифференцированный rate limiting для защиты от DDoS и брутфорса.

### Конфигурация по типам эндпоинтов

| Тип эндпоинта | Лимит | TTL | Описание |
|---------------|-------|-----|----------|
| **Auth** | 5 req/min | 60s | Защита от брутфорса |
| **Orders** | 10 req/min | 60s | Защита от спама заказов |
| **Public** | 100 req/min | 60s | Обычные публичные эндпоинты |
| **Strict** | 3 req/min | 60s | Очень строгий лимит (для будущего использования) |

### Применение rate limiting

#### На уровне контроллера

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min
export class AuthController {
  // ...
}
```

#### На уровне метода (опционально)

```typescript
@Post('sensitive-operation')
@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 req/min для конкретного метода
async sensitiveOperation() {
  // ...
}
```

### Текущие настройки

**Auth Controller:**
- Все эндпоинты: **5 запросов в минуту**

**Orders Controller:**
- Все эндпоинты: **10 запросов в минуту**

**Остальные контроллеры:**
- Дефолтный лимит: **100 запросов в минуту**

### Настройка через переменные окружения

```env
# Throttler configuration
THROTTLE_TTL=60000      # Time window in milliseconds (default: 60000 = 1 minute)
THROTTLE_LIMIT=100      # Default limit per time window (default: 100)
```

---

## 🌐 CORS Configuration

CORS настроен для работы с Telegram WebApp и Cloudflare Tunnel.

### Разрешенные источники

**Production:**
- `https://telegram.org`
- `https://web.telegram.org`
- `https://*.telegram.org`
- `https://*.telegramcdn.net`
- `https://*.tcdn.me`
- Домены из `FRONTEND_URL`
- Домены из `CLOUDFLARE_TUNNEL_URL`
- Cloudflare Tunnel домены (`*.trycloudflare.com`)

**Development:**
- Все источники разрешены (для удобства разработки)

### Настройки CORS

```typescript
{
  origin: 'function', // Динамическая проверка
  credentials: true,  // Разрешить cookies и авторизацию
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 hours для preflight cache
}
```

### Переменные окружения

```env
# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.com
CLOUDFLARE_TUNNEL_URL=https://your-tunnel.trycloudflare.com
```

---

## ✅ Best Practices

### 1. Production Checklist

- [x] Helmet настроен и активен
- [x] HSTS включен (для HTTPS)
- [x] CSP настроен для Telegram WebApp
- [x] Rate limiting настроен дифференцированно
- [x] CORS ограничен проверенными доменами
- [x] Все security headers установлены

### 2. Рекомендации

**Для Production:**
1. Используйте HTTPS (обязательно для HSTS)
2. Регулярно обновляйте зависимости (особенно Helmet)
3. Мониторьте rate limit violations
4. Настройте алерты на подозрительную активность
5. Регулярно проверяйте security headers через [SecurityHeaders.com](https://securityheaders.com/)

**Для Development:**
- CORS разрешает все источники (для удобства)
- CSP менее строгий
- Rate limiting может быть отключен для тестирования

### 3. Мониторинг

**Проверка security headers:**
```bash
curl -I https://your-api-domain.com/api/health
```

**Проверка rate limiting:**
```bash
# Должен вернуть 429 Too Many Requests после превышения лимита
for i in {1..6}; do curl -X POST https://your-api.com/api/auth/validate; done
```

**Проверка CORS:**
```bash
curl -H "Origin: https://telegram.org" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-api.com/api/auth/validate
```

---

## 🧪 Testing Security

### Тестирование Security Headers

```bash
# Проверка всех security headers
curl -I https://your-api.com/api/health | grep -i "x-\|strict-\|content-security"

# Ожидаемые заголовки:
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# Content-Security-Policy: ...
# Referrer-Policy: strict-origin-when-cross-origin
```

### Тестирование Rate Limiting

```bash
# Тест auth rate limit (должен вернуть 429 после 5 запросов)
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST https://your-api.com/api/auth/validate \
    -H "Content-Type: application/json" \
    -d '{"initData": "test"}'
  echo ""
done
```

### Тестирование CORS

```javascript
// В браузерной консоли
fetch('https://your-api.com/api/catalog/categories', {
  method: 'GET',
  headers: {
    'Origin': 'https://telegram.org'
  }
})
.then(r => console.log('CORS:', r.headers.get('Access-Control-Allow-Origin')))
.catch(e => console.error('CORS Error:', e));
```

### Онлайн инструменты

- [SecurityHeaders.com](https://securityheaders.com/) - Проверка security headers
- [Mozilla Observatory](https://observatory.mozilla.org/) - Полный security audit
- [SSL Labs](https://www.ssllabs.com/ssltest/) - Проверка SSL/TLS

---

## 🔧 Troubleshooting

### Проблема: Telegram WebApp не работает

**Причина:** Слишком строгий CSP

**Решение:**
1. Проверьте, что `'unsafe-inline'` и `'unsafe-eval'` разрешены для scripts
2. Убедитесь, что Telegram домены в whitelist
3. Проверьте консоль браузера на ошибки CSP

### Проблема: CORS блокирует запросы

**Причина:** Origin не в whitelist

**Решение:**
1. Добавьте домен в `FRONTEND_URL` или `CLOUDFLARE_TUNNEL_URL`
2. Проверьте, что домен правильно указан в `.env`
3. В development режиме все origins разрешены

### Проблема: Rate limit срабатывает слишком часто

**Причина:** Лимит слишком строгий

**Решение:**
1. Увеличьте лимит в `throttle.config.ts`
2. Или используйте переменную окружения `THROTTLE_LIMIT`
3. Проверьте, что IP адрес определяется правильно (может быть проблема с proxy)

### Проблема: Security headers не устанавливаются

**Причина:** Helmet не подключен или подключен после других middleware

**Решение:**
1. Убедитесь, что `app.use(helmet(...))` вызывается **первым** в `main.ts`
2. Проверьте, что Helmet установлен: `pnpm list helmet`
3. Проверьте логи на ошибки

---

## 📚 Дополнительные ресурсы

- [Helmet Documentation](https://helmetjs.github.io/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [Telegram WebApp Security](https://core.telegram.org/bots/webapps#security)

---

## 🔄 Обновление конфигурации

### Изменение CSP

Отредактируйте `src/config/security.config.ts`:

```typescript
const cspDirectives = {
  // Добавьте или измените директивы
  scriptSrc: [
    "'self'",
    'https://your-cdn.com', // Добавить новый источник
  ],
};
```

### Изменение Rate Limits

Отредактируйте `src/config/throttle.config.ts` или используйте декоратор `@Throttle`:

```typescript
@Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 req/min
```

### Изменение CORS

Отредактируйте `src/main.ts` или добавьте домен в `.env`:

```env
FRONTEND_URL=https://new-domain.com
```

---

**Безопасность - это процесс, а не состояние. Регулярно обновляйте зависимости и проверяйте конфигурацию! 🔒**

