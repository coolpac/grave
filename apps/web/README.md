# Web App - Telegram Mini App

Веб-приложение для Telegram Mini App с интеграцией Telegram WebApp SDK.

## Функциональность

- ✅ Интеграция Telegram WebApp SDK (`@twa-dev/sdk`)
- ✅ **Оптимизированный хук `useTelegram()`** с мемоизацией, throttle и ленивой инициализацией
- ✅ **CloudStorage API** для хранения данных пользователя
- ✅ **HapticFeedback API** для тактильной обратной связи
- ✅ **Analytics Events** для отслеживания пользовательских действий
- ✅ **Адаптация темы Telegram** (dark/light mode, все theme_params)
- ✅ **Оптимизированные кнопки** (MainButton и BackButton) с lifecycle management
- ✅ **Автоматический expand** и enableClosingConfirmation
- ✅ Экран загрузки с логотипом и fade-in анимацией
- ✅ Валидация initData на сервере
- ✅ Страницы:
  - `/` - Главная (категории)
  - `/c/:slug` - Категория (товары)
  - `/p/:slug` - Карточка товара
  - `/cart` - Корзина
  - `/checkout` - Оформление заказа

## Использование хука useTelegram()

```tsx
import { useTelegram } from './hooks/useTelegram'
import { useTelegramAnalytics } from './hooks/useTelegramAnalytics'

function MyComponent() {
  const {
    webApp,
    initDataUnsafe,
    themeParams,
    colorScheme, // 'light' | 'dark' | 'auto'
    user,
    isReady,
    MainButton,
    BackButton,
    CloudStorage,
    HapticFeedback,
    sendDataToServer,
    expand,
    close,
    enableClosingConfirmation,
  } = useTelegram()
  const analytics = useTelegramAnalytics()

  // Использование MainButton (оптимизированная версия)
  useEffect(() => {
    MainButton.setText('Нажми меня')
    MainButton.setParams({
      color: '#8B6B3F',
      textColor: '#FFFFFF',
    })
    MainButton.show()
    
    // Handler с ID для предотвращения дубликатов
    const handlerId = MainButton.onClick(() => {
      HapticFeedback.impactOccurred('medium')
      analytics.trackEvent('button_click', { buttonName: 'main' })
      console.log('Clicked!')
    }, 'main-button-click')

    return () => {
      MainButton.offClick(handlerId)
      MainButton.hide()
    }
  }, [MainButton, HapticFeedback, analytics])

  // Использование BackButton (оптимизированная версия)
  useEffect(() => {
    BackButton.show()
    const handlerId = BackButton.onClick(() => {
      window.history.back()
    }, 'back-navigation')

    return () => {
      BackButton.offClick(handlerId)
      BackButton.hide()
    }
  }, [BackButton])

  // Использование CloudStorage
  useEffect(() => {
    CloudStorage.setItem('user_preference', 'value')
    CloudStorage.getItem('user_preference').then(value => {
      console.log('Saved value:', value)
    })
  }, [CloudStorage])

  return (
    <div className={colorScheme === 'dark' ? 'dark' : ''}>
      Hello, {user?.first_name}!
    </div>
  )
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

## Оптимизация

### Code Splitting

Приложение использует lazy loading и code splitting для оптимизации:

- Все страницы загружаются лениво через `React.lazy()`
- Bundle разбит на оптимизированные chunks
- Prefetch для предзагрузки следующих страниц

Подробнее см. [CODE_SPLITTING.md](./CODE_SPLITTING.md)

### Image Optimization

Профессиональная система работы с изображениями:

- Автоматическое определение WebP support
- Responsive images с srcset
- Lazy loading с Intersection Observer
- Blur placeholder при загрузке
- Прогрессивная загрузка

Подробнее см. [IMAGE_OPTIMIZATION.md](./IMAGE_OPTIMIZATION.md)

### React Query Optimization

Оптимизированная работа с данными:

- Prefetching для лучшего UX
- Optimistic Updates для мгновенной обратной связи
- Background refetch для актуальных данных
- Query invalidation после мутаций
- React Query Devtools для разработки

Подробнее см. [REACT_QUERY_OPTIMIZATION.md](./REACT_QUERY_OPTIMIZATION.md)

### List Virtualization

Виртуализация больших списков для производительности:

- Виртуализация grid layout (2 колонки)
- Dynamic height calculation
- Smooth scrolling
- Infinite scroll с Intersection Observer
- Оптимизированный ProductCard с React.memo

Подробнее см. [VIRTUALIZATION.md](./VIRTUALIZATION.md)

### Framer Motion Optimization

Оптимизация анимаций для мобильных устройств:

- Автоматическое определение `prefers-reduced-motion`
- Отключение анимаций на слабых устройствах
- Использование `transform` вместо `width/height`
- Упрощенные transitions на мобильных
- Условный рендеринг анимаций

Подробнее см. [FRAMER_MOTION_OPTIMIZATION.md](./FRAMER_MOTION_OPTIMIZATION.md)

### Telegram WebApp SDK Optimization

Полная оптимизация интеграции с Telegram Mini App:

- Мемоизация всех методов для лучшей производительности
- Throttle для частых вызовов
- Ленивая инициализация
- CloudStorage для хранения данных
- HapticFeedback для тактильной обратной связи
- Analytics events (page views, product views, add to cart, checkout)
- Адаптация под тему Telegram (dark/light mode)
- Оптимизированные кнопки с lifecycle management
- Автоматический expand и enableClosingConfirmation

Подробнее см. [TELEGRAM_WEBAPP_OPTIMIZATION.md](./TELEGRAM_WEBAPP_OPTIMIZATION.md)

## Структура

```
src/
├── hooks/
│   ├── useTelegram.ts           # Оптимизированный хук для работы с Telegram SDK
│   ├── useTelegramAnalytics.ts  # Хук для аналитики событий
│   ├── useReducedMotion.ts      # Хук для определения reduced motion
│   └── ...
├── components/
│   ├── Layout.tsx          # Основной layout
│   ├── LoadingScreen.tsx   # Экран загрузки
│   ├── OptimizedImage.tsx  # Оптимизированный компонент изображений
│   ├── VirtualizedProductGrid.tsx # Виртуализированная сетка товаров
│   └── ...
├── utils/
│   ├── animation-variants.ts    # Переиспользуемые варианты анимаций
│   ├── telegram-buttons.ts      # Оптимизированные обертки для кнопок
│   ├── telegram-storage.ts      # CloudStorage API wrapper
│   ├── telegram-haptic.ts       # HapticFeedback API wrapper
│   ├── telegram-theme.ts        # Утилиты для работы с темой
│   └── telegramSafe.ts          # Безопасные обертки для Telegram API
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
- `WebApp.MainButton` - главная кнопка (оптимизированная обертка)
- `WebApp.BackButton` - кнопка назад (оптимизированная обертка)
- `WebApp.expand()` - расширить приложение на весь экран
- `WebApp.CloudStorage` - хранение данных (API 6.9+)
- `WebApp.HapticFeedback` - тактильная обратная связь (API 6.1+)
- `WebApp.enableClosingConfirmation()` - подтверждение выхода (API 6.2+)

**Все возможности доступны через оптимизированный хук `useTelegram()`**

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






