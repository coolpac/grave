# Отладка уведомлений и корзины

## Проблемы, которые были исправлены:

### 1. 90 штук товара в корзине
**Причина:** При синхронизации локальной корзины товары добавлялись через `addToCart`, что увеличивало количество вместо установки точного значения.

**Исправление:**
- Добавлен debounce (500ms) для кнопки "Добавить в корзину"
- Исправлена логика `syncCart`: теперь использует `PATCH /cart/items/:id` для обновления существующих товаров вместо `POST /cart/add`

### 2. Уведомления не приходят
**Причина:** Недостаточное логирование в процессоре уведомлений.

**Исправление:**
- Добавлено подробное логирование в `TelegramNotificationProcessor`
- Логируются все этапы обработки уведомлений
- Логируются ошибки отправки уведомлений

## Команды для проверки на сервере:

### Проверка логов уведомлений:

```bash
cd /opt/ritual-app

# Логи обработки уведомлений
docker-compose -f docker-compose.production.yml logs -f api | grep -E 'notification|order_created|Telegram notification'

# Логи отправки уведомлений ботов
docker-compose -f docker-compose.production.yml logs -f customer-bot admin-bot | grep -E 'notify|order'

# Все логи API (последние 100 строк)
docker-compose -f docker-compose.production.yml logs --tail=100 api
```

### Проверка очереди уведомлений:

```bash
# Войдите в контейнер API
docker-compose -f docker-compose.production.yml exec api sh

# Внутри контейнера проверьте Redis очередь
redis-cli -h redis -a $REDIS_PASSWORD
> KEYS bull:telegram-notification:*
> LLEN bull:telegram-notification:waiting
> LLEN bull:telegram-notification:active
> LLEN bull:telegram-notification:completed
> LLEN bull:telegram-notification:failed
```

### Проверка работы ботов:

```bash
# Проверка здоровья ботов
curl http://localhost:8001/health  # Customer Bot
curl http://localhost:8002/health  # Admin Bot

# Или через Docker
docker-compose -f docker-compose.production.yml exec customer-bot python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8001/health').read())"
docker-compose -f docker-compose.production.yml exec admin-bot python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8002/health').read())"
```

### Проверка корзины после исправлений:

```bash
# Логи добавления в корзину
docker-compose -f docker-compose.production.yml logs -f api | grep -E 'cart/add|cart/items|syncCart'

# Проверка количества товаров в корзине пользователя (замените USER_ID)
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -d ritual_db -c "SELECT ci.id, ci.quantity, p.name FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = USER_ID);"
```

## Что проверить после деплоя:

1. **Корзина:**
   - Добавьте товар в корзину несколько раз быстро - должно добавляться по 1 штуке
   - Проверьте, что после заказа корзина очищается

2. **Уведомления:**
   - Оформите тестовый заказ
   - Проверьте логи: должны быть записи о добавлении задачи в очередь и обработке уведомления
   - Проверьте, что уведомления приходят в Telegram

3. **Логи:**
   - После оформления заказа проверьте логи API на наличие ошибок
   - Проверьте логи ботов на наличие ошибок отправки

## Если уведомления все еще не приходят:

1. Проверьте, что боты запущены:
   ```bash
   docker-compose -f docker-compose.production.yml ps customer-bot admin-bot
   ```

2. Проверьте, что боты доступны из API:
   ```bash
   docker-compose -f docker-compose.production.yml exec api wget -O- http://customer-bot:8001/health
   docker-compose -f docker-compose.production.yml exec api wget -O- http://admin-bot:8002/health
   ```

3. Проверьте переменные окружения ботов:
   ```bash
   docker-compose -f docker-compose.production.yml exec customer-bot env | grep BOT_TOKEN
   docker-compose -f docker-compose.production.yml exec admin-bot env | grep ADMIN_BOT_TOKEN
   ```

4. Проверьте очередь Redis:
   ```bash
   docker-compose -f docker-compose.production.yml exec redis redis-cli -a $REDIS_PASSWORD KEYS "*notification*"
   ```







