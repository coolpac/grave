# Telegram WebApp SDK Optimization

Полная оптимизация интеграции с Telegram Mini App с использованием всех возможностей Telegram WebApp API 6.9+.

## 🚀 Реализованные улучшения

### 1. Оптимизированный `useTelegram` Hook

**Файл:** `src/hooks/useTelegram.ts`

#### Особенности:
- ✅ **Мемоизация всех методов** - предотвращает лишние ре-рендеры
- ✅ **Throttle для частых вызовов** - оптимизирует производительность
- ✅ **Ленивая инициализация** - инициализация только при необходимости
- ✅ **Интеграция CloudStorage** - для хранения данных пользователя
- ✅ **Интеграция HapticFeedback** - тактильная обратная связь
- ✅ **enableClosingConfirmation** - подтверждение выхода из приложения
- ✅ **Автоматический expand** - разворачивание на весь экран
- ✅ **Адаптация темы** - автоматическое определение dark/light mode

#### Использование:

```tsx
import { useTelegram } from './hooks/useTelegram'

function MyComponent() {
  const {
    webApp,
    user,
    themeParams,
    colorScheme, // 'light' | 'dark' | 'auto'
    isReady,
    isExpanded,
    version,
    MainButton,
    BackButton,
    CloudStorage,
    HapticFeedback,
    expand,
    close,
    enableClosingConfirmation,
    disableClosingConfirmation,
  } = useTelegram()

  // Использование CloudStorage
  useEffect(() => {
    CloudStorage.setItem('user_preference', 'value')
    CloudStorage.getItem('user_preference').then(value => {
      console.log(value)
    })
  }, [CloudStorage])

  // Использование HapticFeedback
  const handleClick = () => {
    HapticFeedback.impactOccurred('medium')
    // или
    HapticFeedback.notificationOccurred('success')
    HapticFeedback.selectionChanged()
  }

  return <div>Hello, {user?.first_name}!</div>
}
```

### 2. Оптимизированные кнопки (MainButton и BackButton)

**Файл:** `src/utils/telegram-buttons.ts`

#### Особенности:
- ✅ **Управление lifecycle** - правильное показ/скрытие
- ✅ **Предотвращение дубликатов** - один handler на кнопку
- ✅ **ID-based handlers** - управление обработчиками по ID
- ✅ **Мемоизация параметров** - обновление только при изменении

#### Использование:

```tsx
import { useTelegram } from './hooks/useTelegram'

function MyComponent() {
  const { MainButton, BackButton } = useTelegram()

  useEffect(() => {
    // Настройка MainButton
    MainButton.setText('Добавить в корзину')
    MainButton.setParams({
      color: '#8B6B3F',
      textColor: '#FFFFFF',
    })
    MainButton.show()

    // Добавление handler с ID (предотвращает дубликаты)
    const handlerId = MainButton.onClick(() => {
      console.log('Clicked!')
    }, 'add-to-cart')

    // Настройка BackButton
    BackButton.show()
    const backHandlerId = BackButton.onClick(() => {
      navigate(-1)
    }, 'back-navigation')

    return () => {
      // Очистка handlers
      MainButton.offClick(handlerId)
      MainButton.hide()
      BackButton.offClick(backHandlerId)
      BackButton.hide()
    }
  }, [MainButton, BackButton])
}
```

### 3. CloudStorage API

**Файл:** `src/utils/telegram-storage.ts`

#### Особенности:
- ✅ **Fallback на localStorage** - работает даже без Telegram
- ✅ **Type-safe API** - полная типизация
- ✅ **Обработка ошибок** - graceful degradation

#### Использование:

```tsx
import { useTelegram } from './hooks/useTelegram'

function MyComponent() {
  const { CloudStorage } = useTelegram()

  // Сохранение данных
  const savePreference = async () => {
    await CloudStorage.setItem('theme', 'dark')
  }

  // Получение данных
  const loadPreference = async () => {
    const theme = await CloudStorage.getItem('theme')
    console.log(theme) // 'dark'
  }

  // Получение всех ключей
  const getAllKeys = async () => {
    const keys = await CloudStorage.getKeys()
    console.log(keys) // ['theme', 'language', ...]
  }

  // Удаление данных
  const removePreference = async () => {
    await CloudStorage.removeItem('theme')
  }
}
```

### 4. HapticFeedback API

**Файл:** `src/utils/telegram-haptic.ts`

#### Особенности:
- ✅ **Типы вибраций:**
  - `impactOccurred` - тактильная обратная связь (light, medium, heavy, rigid, soft)
  - `notificationOccurred` - уведомления (error, success, warning)
  - `selectionChanged` - изменение выбора
- ✅ **No-op fallback** - работает без Telegram

#### Использование:

```tsx
import { useTelegram } from './hooks/useTelegram'

function MyComponent() {
  const { HapticFeedback } = useTelegram()

  const handleButtonClick = () => {
    HapticFeedback.impactOccurred('medium')
  }

  const handleSuccess = () => {
    HapticFeedback.notificationOccurred('success')
  }

  const handleError = () => {
    HapticFeedback.notificationOccurred('error')
  }

  const handleSelection = () => {
    HapticFeedback.selectionChanged()
  }

  return (
    <button onClick={handleButtonClick}>
      Click me (with haptic feedback)
    </button>
  )
}
```

### 5. Адаптация темы Telegram

**Файл:** `src/utils/telegram-theme.ts`

#### Особенности:
- ✅ **Автоматическое определение dark/light mode**
- ✅ **Применение всех цветов темы** - полная поддержка theme_params
- ✅ **Подписка на изменения темы** - реакция на смену темы
- ✅ **CSS переменные** - все цвета доступны через CSS

#### Использование:

```tsx
import { useTelegram } from './hooks/useTelegram'

function MyComponent() {
  const { themeParams, colorScheme } = useTelegram()

  // colorScheme: 'light' | 'dark' | 'auto'
  const isDark = colorScheme === 'dark'

  return (
    <div
      style={{
        backgroundColor: 'var(--tg-theme-bg-color)',
        color: 'var(--tg-theme-text-color)',
      }}
    >
      <p>Current theme: {colorScheme}</p>
      <p>Background: {themeParams?.bg_color}</p>
      <p>Text: {themeParams?.text_color}</p>
    </div>
  )
}
```

#### CSS переменные:

```css
/* Все доступные CSS переменные */
--tg-theme-bg-color
--tg-theme-text-color
--tg-theme-hint-color
--tg-theme-link-color
--tg-theme-button-color
--tg-theme-button-text-color
--tg-theme-secondary-bg-color
--tg-theme-header-bg-color
--tg-theme-accent-text-color
--tg-theme-section-bg-color
--tg-theme-section-header-text-color
--tg-theme-subtitle-text-color
--tg-theme-destructive-text-color
--tg-color-scheme

/* Классы для тем */
.tg-dark
.tg-light
```

### 6. Analytics Events

**Файл:** `src/hooks/useTelegramAnalytics.ts`

#### Особенности:
- ✅ **Throttling** - максимум 10 событий в секунду
- ✅ **Очередь событий** - события сохраняются до инициализации
- ✅ **Типы событий:**
  - `page_view` - просмотр страницы
  - `product_view` - просмотр товара
  - `add_to_cart` - добавление в корзину
  - `remove_from_cart` - удаление из корзины
  - `checkout_started` - начало оформления
  - `checkout_completed` - завершение оформления
  - `order_placed` - размещение заказа
  - `button_click` - клик по кнопке
  - `search` - поиск
  - `filter_applied` - применение фильтра

#### Использование:

```tsx
import { useTelegramAnalytics } from './hooks/useTelegramAnalytics'

function MyComponent() {
  const analytics = useTelegramAnalytics()

  // Инициализация (обычно в Layout)
  useEffect(() => {
    analytics.initialize()
  }, [analytics])

  // Отслеживание просмотра страницы
  useEffect(() => {
    analytics.trackPageView('/products', {
      category: 'monuments',
    })
  }, [analytics])

  // Отслеживание просмотра товара
  const handleProductView = (productId: string, slug: string) => {
    analytics.trackProductView(productId, slug, {
      price: 25000,
      material: 'granite',
    })
  }

  // Отслеживание добавления в корзину
  const handleAddToCart = (productId: string, quantity: number) => {
    analytics.trackAddToCart(productId, quantity, {
      variantId: 123,
      price: 25000,
    })
  }

  // Отслеживание начала оформления
  const handleCheckoutStart = () => {
    analytics.trackCheckoutStarted({
      cartValue: 50000,
      itemsCount: 2,
    })
  }

  // Отслеживание завершения оформления
  const handleCheckoutComplete = (orderId: string, total: number) => {
    analytics.trackCheckoutCompleted(orderId, total, {
      paymentMethod: 'card',
    })
  }

  // Кастомное событие
  const handleCustomEvent = () => {
    analytics.trackEvent('button_click', {
      buttonName: 'subscribe',
      location: 'header',
    })
  }
}
```

### 7. Layout с автоматической интеграцией

**Файл:** `src/components/Layout.tsx`

#### Особенности:
- ✅ **Автоматический expand** - разворачивание на весь экран
- ✅ **Автоматическое включение closing confirmation**
- ✅ **Отслеживание page views** - автоматически для всех страниц
- ✅ **Инициализация Analytics** - автоматически при готовности

Layout автоматически:
- Разворачивает приложение на весь экран
- Включает подтверждение выхода
- Отслеживает просмотры страниц
- Применяет тему Telegram

## 📋 Примеры использования

### Полный пример компонента

```tsx
import { useEffect } from 'react'
import { useTelegram } from './hooks/useTelegram'
import { useTelegramAnalytics } from './hooks/useTelegramAnalytics'

function ProductPage({ productId, productSlug }) {
  const {
    MainButton,
    BackButton,
    HapticFeedback,
    CloudStorage,
    colorScheme,
  } = useTelegram()
  const analytics = useTelegramAnalytics()

  useEffect(() => {
    // Отслеживание просмотра товара
    analytics.trackProductView(productId, productSlug)

    // Настройка MainButton
    MainButton.setText('Добавить в корзину')
    MainButton.show()
    const handlerId = MainButton.onClick(() => {
      HapticFeedback.impactOccurred('medium')
      analytics.trackAddToCart(productId, 1)
      // ... логика добавления
    }, 'add-to-cart')

    // Настройка BackButton
    BackButton.show()
    const backHandlerId = BackButton.onClick(() => {
      navigate(-1)
    }, 'back')

    return () => {
      MainButton.offClick(handlerId)
      MainButton.hide()
      BackButton.offClick(backHandlerId)
      BackButton.hide()
    }
  }, [MainButton, BackButton, HapticFeedback, analytics, productId, productSlug])

  // Сохранение предпочтений
  const savePreference = async () => {
    await CloudStorage.setItem('last_viewed_product', productId)
  }

  return (
    <div className={colorScheme === 'dark' ? 'dark' : ''}>
      {/* Контент */}
    </div>
  )
}
```

## 🔧 Конфигурация

### Environment Variables

```env
# Включить отправку аналитики на backend
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_ENDPOINT=/api/analytics
```

## 🧪 Тестирование

### В Telegram Web

1. **Откройте приложение в Telegram Desktop или Mobile**
   - Проверьте автоматическое разворачивание на весь экран
   - Проверьте, что приложение занимает весь экран

2. **Проверьте работу кнопок**
   - MainButton должен показываться/скрываться правильно
   - BackButton должна работать для навигации
   - Проверьте, что handlers не дублируются

3. **Проверьте тактильную обратную связь**
   - Нажмите на кнопки - должна быть вибрация
   - Проверьте разные типы: impactOccurred, notificationOccurred, selectionChanged

4. **Проверьте адаптацию темы**
   - Смените тему в Telegram (Settings → Appearance)
   - Приложение должно автоматически адаптироваться
   - Проверьте dark/light mode

5. **Проверьте CloudStorage**
   - Сохраните данные через CloudStorage.setItem()
   - Перезагрузите приложение - данные должны сохраниться
   - Проверьте, что данные синхронизируются между устройствами

6. **Проверьте Analytics**
   - Откройте DevTools → Network
   - Перейдите по страницам, добавьте товары в корзину
   - Проверьте, что события отправляются (если VITE_ANALYTICS_ENABLED=true)

7. **Проверьте enableClosingConfirmation**
   - Попробуйте закрыть приложение
   - Должно появиться подтверждение выхода

### В браузере (без Telegram)

Все функции имеют fallback и работают в браузере:
- CloudStorage → localStorage (с префиксом `tg_`)
- HapticFeedback → no-op (без ошибок)
- Кнопки → безопасные обертки (без ошибок)
- Analytics → работает, но без отправки в Telegram

### Чек-лист тестирования

- [ ] Автоматическое разворачивание на весь экран
- [ ] MainButton показывается/скрывается правильно
- [ ] BackButton работает для навигации
- [ ] Тактильная обратная связь при кликах
- [ ] Адаптация темы (dark/light mode)
- [ ] CloudStorage сохраняет данные
- [ ] Analytics отслеживает события
- [ ] enableClosingConfirmation работает
- [ ] Все функции работают в браузере (fallback)

## 📚 Дополнительные ресурсы

- [Telegram WebApp API Documentation](https://core.telegram.org/bots/webapps)
- [@twa-dev/sdk Documentation](https://github.com/twa-dev/sdk)

## ✅ Чек-лист реализации

- [x] Оптимизированный useTelegram hook
- [x] Мемоизация всех методов
- [x] Throttle для частых вызовов
- [x] Ленивая инициализация
- [x] CloudStorage API
- [x] HapticFeedback API
- [x] enableClosingConfirmation
- [x] Адаптация темы (dark/light mode)
- [x] Оптимизированные кнопки (lifecycle, предотвращение дубликатов)
- [x] Analytics events
- [x] Автоматический expand в Layout
- [x] Документация

## 🎯 Результаты оптимизации

- ✅ **Производительность**: Мемоизация и throttle снижают количество ре-рендеров
- ✅ **UX**: Тактильная обратная связь улучшает пользовательский опыт
- ✅ **Надежность**: Fallback на localStorage и no-op функции
- ✅ **Аналитика**: Полное отслеживание пользовательских действий
- ✅ **Тема**: Автоматическая адаптация под тему Telegram
- ✅ **Lifecycle**: Правильное управление кнопками без утечек памяти

