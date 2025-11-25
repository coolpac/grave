# 🔗 Ссылки для пользователей и администраторов

## 👥 Для пользователей

### 🌐 Основное приложение

**Главная страница:**
```
https://optmramor.ru
```

**Категории материалов:**
```
https://optmramor.ru/materials/marble    # Мрамор
https://optmramor.ru/materials/granite   # Гранит
```

**Категории товаров:**
```
https://optmramor.ru/c/marble-slabs           # Плиты мраморные
https://optmramor.ru/c/marble-chips           # Мраморная крошка
https://optmramor.ru/c/marble-vases            # Вазы мраморные
https://optmramor.ru/c/ritual-steles           # Стелы ритуальные
https://optmramor.ru/c/ritual-pedestals        # Тумбы ритуальные
https://optmramor.ru/c/ritual-flowerbeds       # Цветники ритуальные
https://optmramor.ru/c/ritual-sets             # Комплекты ритуальные
```

**Корзина и заказы:**
```
https://optmramor.ru/cart                      # Корзина
https://optmramor.ru/checkout                  # Оформление заказа
https://optmramor.ru/orders                     # История заказов
```

**Товар (пример):**
```
https://optmramor.ru/p/plita-mramornaya-polirovannaya
```

---

## 👨‍💼 Для администраторов

### 🎛️ Админ-панель

**Вход в админ-панель:**
```
https://optmramor.ru/admin
```

**Разделы админ-панели:**
```
https://optmramor.ru/admin/                    # Дашборд
https://optmramor.ru/admin/products            # Товары
https://optmramor.ru/admin/products/new        # Создать товар
https://optmramor.ru/admin/banners             # Баннеры
https://optmramor.ru/admin/newsletters          # Рассылки
https://optmramor.ru/admin/abandoned-carts      # Брошенные корзины
```

**Локальная разработка:**
```
http://localhost:5174                          # Админ-панель (dev)
http://localhost:5173                          # Магазин (dev)
```

---

### 🔑 Получение токена администратора

#### Способ 1: С телефона (самый простой)

**Узнайте свой Telegram ID:**
```
https://t.me/userinfobot
```
Отправьте `/start` боту, чтобы узнать ваш ID.

**Получите токен:**
```
https://optmramor.ru/api/auth/admin-token?telegramId=ВАШ_TELEGRAM_ID
```

**Пример:**
```
https://optmramor.ru/api/auth/admin-token?telegramId=83146995
```

#### Способ 2: Через админ-панель

1. Откройте приложение в Telegram WebApp
2. Войдите через Telegram
3. Откройте консоль браузера (F12 → Console)
4. Выполните: `localStorage.getItem('authToken')`
5. Скопируйте токен

#### Способ 3: Через API с initData

```bash
curl -X POST https://optmramor.ru/api/auth/admin-token \
  -H "Content-Type: application/json" \
  -d '{"initData": "ВАШ_TELEGRAM_INIT_DATA"}'
```

---

### 🔧 API Endpoints для администраторов

**База URL:** `https://optmramor.ru/api`

#### Товары

```bash
# Получить все товары
GET /api/products
Authorization: Bearer ВАШ_ТОКЕН

# Создать товар
POST /api/products
Authorization: Bearer ВАШ_ТОКЕН
Content-Type: application/json

# Обновить товар
PUT /api/products/:id
Authorization: Bearer ВАШ_ТОКЕН

# Удалить товар
DELETE /api/products/:id
Authorization: Bearer ВАШ_ТОКЕН
```

#### Категории

```bash
# Получить все категории
GET /api/catalog/categories
Authorization: Bearer ВАШ_ТОКЕН

# Создать категорию
POST /api/catalog/categories
Authorization: Bearer ВАШ_ТОКЕН
```

#### Заказы

```bash
# Получить все заказы
GET /api/admin/orders
Authorization: Bearer ВАШ_ТОКЕН

# Получить заказ по ID
GET /api/admin/orders/:id
Authorization: Bearer ВАШ_ТОКЕН

# Обновить статус заказа
PATCH /api/admin/orders/:id/status
Authorization: Bearer ВАШ_ТОКЕН
```

#### Пользователи

```bash
# Получить всех пользователей
GET /api/admin/users
Authorization: Bearer ВАШ_ТОКЕН
```

---

### 📊 Полезные ссылки для админов

**Health Check:**
```
https://optmramor.ru/api/health/live
https://optmramor.ru/api/health/ready
```

**Метрики (если включены):**
```
https://optmramor.ru/api/metrics
```

**API документация (Swagger, если настроен):**
```
https://optmramor.ru/api/docs
```

---

## 🛠️ Для разработчиков

### Локальная разработка

**Frontend:**
```
http://localhost:5173
```

**API:**
```
http://localhost:3000/api
```

**Health Check:**
```
http://localhost:3000/api/health/live
```

**Dev Token (только в development):**
```
http://localhost:3000/api/auth/dev-token?telegramId=ВАШ_ID
```

---

## 📱 Telegram боты

**Полезные боты:**
```
@BotFather          # Создание и управление ботами
@userinfobot         # Узнать свой Telegram ID
```

---

## 🔐 Безопасность

**Важно:**
- ✅ Не делитесь токенами администратора
- ✅ Токены действительны 7 дней (настраивается в `JWT_EXPIRES_IN`)
- ✅ Используйте HTTPS для всех запросов
- ✅ Храните токены в безопасном месте

---

## 📝 Быстрые команды

### Получить токен администратора

```bash
# Замените 83146995 на ваш Telegram ID
curl "https://optmramor.ru/api/auth/admin-token?telegramId=83146995"
```

### Проверить токен

```bash
# Замените ВАШ_ТОКЕН на полученный токен
curl -H "Authorization: Bearer ВАШ_ТОКЕН" \
  https://optmramor.ru/api/admin/products
```

### Создать товары

```bash
./create-products-on-server.sh
# Введите токен, когда скрипт попросит
```

---

## 🌍 Домены и окружения

**Production:**
- Frontend: `https://optmramor.ru`
- API: `https://optmramor.ru/api`
- IP: `94.241.141.194`

**Development (локально):**
- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`

---

## 📚 Документация

- `HOW_TO_GET_ADMIN_TOKEN_UPDATED.md` - Как получить токен администратора
- `CHANGES_SUMMARY.md` - Сводка изменений
- `FIX_ENV_AND_PRODUCTS.md` - Исправление .env и создание товаров
- `DEPLOYMENT_QUICK_START.md` - Быстрый старт деплоя

---

## 💡 Полезные советы

1. **Закладки:** Сохраните ссылку получения токена в закладки браузера
2. **Скрипты:** Используйте скрипты из корня проекта для автоматизации
3. **Логи:** Проверяйте логи API при проблемах:
   ```bash
   ssh root@94.241.141.194 "cd /opt/ritual-app && docker-compose -f docker-compose.production.yml logs api"
   ```

---

**Последнее обновление:** 2025-01-21

