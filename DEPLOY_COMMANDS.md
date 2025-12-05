# Команды для деплоя

## Правильная команда для пересборки сервисов

**НЕ используйте `admin` в списке сервисов** - админка собирается внутри `web`:

```bash
cd /opt/ritual-app
docker-compose -f docker-compose.production.yml up -d --build api web customer-bot admin-bot
```

Или для пересборки всех сервисов:

```bash
docker-compose -f docker-compose.production.yml up -d --build
```

## Проверка логов

```bash
# API логи (заказы, авторизация)
docker-compose -f docker-compose.production.yml logs -f api | grep -E 'order_created|initData|cart'

# Логи ботов
docker-compose -f docker-compose.production.yml logs -f customer-bot admin-bot

# Все логи
docker-compose -f docker-compose.production.yml logs -f
```

## Проверка статуса сервисов

```bash
docker-compose -f docker-compose.production.yml ps
```

## Проверка корзины после заказа

После создания заказа корзина должна быть пустой:
- На сервере: очищается в транзакции создания заказа
- На клиенте: очищается через `clearCart()` после успешного ответа

Если корзина не очищается:
1. Проверьте логи API: `docker-compose -f docker-compose.production.yml logs api | grep -i cart`
2. Проверьте консоль браузера на ошибки
3. Убедитесь, что `clearCart()` вызывается в `Checkout.tsx` после успешного создания заказа







