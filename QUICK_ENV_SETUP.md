# ⚡ Быстрая настройка .env.production

## Минимальный набор для запуска

Скопируйте и заполните только эти поля:

```env
# 1. БАЗА ДАННЫХ - сгенерируйте пароль: openssl rand -base64 24
POSTGRES_PASSWORD=ВАШ_ПАРОЛЬ_ЗДЕСЬ

# 2. REDIS - сгенерируйте пароль: openssl rand -base64 24
REDIS_PASSWORD=ВАШ_ПАРОЛЬ_ЗДЕСЬ

# 3. JWT - сгенерируйте: openssl rand -base64 32
JWT_SECRET=ВАШ_СЕКРЕТ_МИНИМУМ_32_СИМВОЛА

# 4. TELEGRAM - получите от @BotFather
BOT_TOKEN=ВАШ_ТОКЕН_ОТ_BOTFATHER

# 5. ДОМЕН
FRONTEND_URL=https://optmramor.ru
PUBLIC_URL=https://optmramor.ru
```

## Генерация паролей

Выполните в терминале:

```bash
# Пароль для PostgreSQL
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"

# Пароль для Redis
echo "REDIS_PASSWORD=$(openssl rand -base64 24)"

# JWT Secret (минимум 32 символа!)
echo "JWT_SECRET=$(openssl rand -base64 32)"
```

## Получение Telegram токена

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен

## Опционально (можно добавить позже)

```env
# Токен бота для клиентов (если нужен отдельный)
CUSTOMER_BOT_TOKEN=

# Токен бота для админа (если нужен отдельный)
ADMIN_BOT_TOKEN=

# Ваш Telegram ID (узнайте через @userinfobot)
TELEGRAM_MANAGER_CHAT_ID=

# Список ID администраторов через запятую
ADMIN_WHITELIST=
```

## Готово!

После заполнения этих полей можно деплоить:
```bash
./deploy.sh production
```

Подробная инструкция: [ENV_PRODUCTION_GUIDE.md](./ENV_PRODUCTION_GUIDE.md)

