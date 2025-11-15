# Web App - Telegram Mini App

Веб-приложение для Telegram Mini App с интеграцией Telegram WebApp SDK.

## Функциональность

- ✅ Интеграция Telegram WebApp SDK (`@twa-dev/sdk`)
- ✅ Хук `useTelegram()` для работы с SDK
- ✅ Экран загрузки с логотипом и fade-in анимацией
- ✅ Валидация initData на сервере
- ✅ Поддержка тем Telegram (цвета)
- ✅ Управление MainButton и BackButton
- ✅ Страницы:
  - `/` - Главная (категории)
  - `/c/:slug` - Категория (товары)
  - `/p/:slug` - Карточка товара
  - `/cart` - Корзина
  - `/checkout` - Оформление заказа

## Использование хука useTelegram()

```tsx
import { useTelegram } from './hooks/useTelegram'

function MyComponent() {
  const {
    webApp,
    initDataUnsafe,
    themeParams,
    user,
    isReady,
    MainButton,
    BackButton,
    sendDataToServer,
    expand,
    close,
  } = useTelegram()

  // Использование MainButton
  useEffect(() => {
    MainButton.setText('Нажми меня')
    MainButton.show()
    MainButton.onClick(() => {
      console.log('Clicked!')
    })

    return () => {
      MainButton.hide()
      MainButton.offClick(() => {})
    }
  }, [MainButton])

  // Использование BackButton
  useEffect(() => {
    BackButton.show()
    BackButton.onClick(() => {
      window.history.back()
    })

    return () => {
      BackButton.hide()
      BackButton.offClick(() => {})
    }
  }, [BackButton])

  return <div>Hello, {user?.first_name}!</div>
}
```

## Валидация initData

При старте приложения автоматически отправляется `initData` на сервер для валидации.

### Серверный эндпоинт

Создайте эндпоинт `/api/validate-init-data` на вашем бэкенде. Пример реализации в `public/api/validate-init-data.example.js`.

**Важно:** В продакшене обязательно валидируйте initData на сервере для безопасности!

### Режим разработки

В режиме разработки (когда сервер недоступен или нет initData) приложение продолжит работу с предупреждениями в консоли.

## Установка зависимостей

```bash
pnpm install
```

## Запуск

```bash
pnpm dev
```

## Сборка

```bash
pnpm build
```

## Структура

```
src/
├── hooks/
│   └── useTelegram.ts      # Хук для работы с Telegram SDK
├── components/
│   ├── Layout.tsx          # Основной layout
│   └── LoadingScreen.tsx   # Экран загрузки
├── pages/
│   ├── Home.tsx           # Главная (категории)
│   ├── Category.tsx       # Категория товаров
│   ├── Product.tsx          # Карточка товара
│   ├── Cart.tsx           # Корзина
│   └── Checkout.tsx       # Оформление заказа
└── App.tsx                # Главный компонент
```

## Telegram WebApp SDK

Документация: https://core.telegram.org/bots/webapps

### Основные возможности:

- `WebApp.ready()` - инициализация SDK
- `WebApp.initDataUnsafe` - данные пользователя (небезопасные, для UI)
- `WebApp.initData` - данные для валидации на сервере
- `WebApp.themeParams` - параметры темы Telegram
- `WebApp.MainButton` - главная кнопка
- `WebApp.BackButton` - кнопка назад
- `WebApp.expand()` - расширить приложение на весь экран

## Переменные окружения

Для работы валидации initData на сервере установите:

```env
BOT_TOKEN=your_bot_token_here
```

## Безопасность

⚠️ **Важно:** Всегда валидируйте `initData` на сервере перед обработкой данных пользователя!

Валидация происходит по алгоритму:
1. Извлечь `hash` из initData
2. Создать секретный ключ: `HMAC-SHA256("WebAppData", BOT_TOKEN)`
3. Вычислить хеш: `HMAC-SHA256(secretKey, dataCheckString)`
4. Сравнить с полученным `hash`





