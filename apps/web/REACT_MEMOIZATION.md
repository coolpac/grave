# React Мемоизация и Оптимизация Ре-рендеров

Этот документ описывает стратегии оптимизации React компонентов для минимизации лишних ре-рендеров и улучшения производительности приложения.

## Содержание

1. [React.memo и кастомные compare функции](#reactmemo-и-кастомные-compare-функции)
2. [useMemo и useCallback](#usememo-и-usecallback)
3. [useStableCallback Hook](#usestablecallback-hook)
4. [Context Selectors](#context-selectors)
5. [Why Did You Render](#why-did-you-render)
6. [Измерение рендеров](#измерение-рендеров)
7. [Лучшие практики](#лучшие-практики)

## React.memo и кастомные compare функции

### Базовое использование

`React.memo` предотвращает ре-рендер компонента, если его props не изменились:

```tsx
import { memo } from 'react'

const ProductCard = memo(({ product, onAddToCart }) => {
  // ...
})
```

### Кастомная compare функция

Для более точного контроля используйте кастомную функцию сравнения:

```tsx
const areEqual = (prevProps, nextProps) => {
  // Возвращает true если props равны (не нужно ре-рендерить)
  // Возвращает false если props изменились (нужно ре-рендерить)
  
  if (prevProps.product.id !== nextProps.product.id) return false
  if (prevProps.product.price !== nextProps.product.price) return false
  // ... другие проверки
  
  return true // Props не изменились
}

export default memo(ProductCard, areEqual)
```

**Пример из проекта:**

```tsx
// apps/web/src/components/ProductCard.tsx
const areEqual = (prevProps: ProductCardProps, nextProps: ProductCardProps): boolean => {
  // Быстрая проверка ссылок
  if (prevProps === nextProps) return true

  // Сравнение примитивов (быстро)
  if (
    prevProps.product.id !== nextProps.product.id ||
    prevProps.product.price !== nextProps.product.price
  ) {
    return false
  }

  // Shallow comparison массивов
  const prevImages = prevProps.product.images || []
  const nextImages = nextProps.product.images || []
  if (prevImages.length !== nextImages.length) return false
  if (prevImages.some((img, i) => img !== nextImages[i])) return false

  return true
}

export default memo(ProductCard, areEqual)
```

## useMemo и useCallback

### useMemo для вычислений

Мемоизируйте дорогие вычисления:

```tsx
const formattedPrice = useMemo(() => {
  return product.price > 0
    ? `${product.price.toLocaleString('ru-RU')} ₽`
    : 'По запросу'
}, [product.price])
```

### useCallback для функций

Мемоизируйте функции, передаваемые как props:

```tsx
const handleAddToCart = useCallback(
  (e: React.MouseEvent) => {
    e.preventDefault()
    if (onAddToCart) {
      onAddToCart(product, position)
    }
  },
  [product, onAddToCart]
)
```

## useStableCallback Hook

`useStableCallback` создает стабильную ссылку на callback, которая не меняется между рендерами, даже если зависимости изменились. Это предотвращает лишние ре-рендеры дочерних компонентов.

### Использование

```tsx
import { useStableCallback } from '../hooks/useStableCallback'

function MyComponent({ onAction }) {
  // Стабильная функция - ссылка не меняется между рендерами
  const handleClick = useStableCallback(() => {
    onAction()
  }, [onAction])

  return <Button onClick={handleClick} />
}
```

### Когда использовать

- ✅ Event handlers, передаваемые в мемоизированные компоненты
- ✅ Callbacks в списках (map)
- ✅ Props для оптимизированных дочерних компонентов

### Когда НЕ использовать

- ❌ Если callback должен обновляться при каждом изменении зависимостей
- ❌ Для функций, которые используются только внутри компонента

## Context Selectors

Для больших контекстов используйте селекторы, чтобы подписаться только на нужную часть:

```tsx
import { useContextSelector } from '../utils/context-selector'

const UserContext = createContext({ user: null, theme: 'light' })

function MyComponent() {
  // Подписываемся только на user, игнорируя изменения theme
  const user = useContextSelector(UserContext, state => state.user)
  
  return <div>{user?.name}</div>
}
```

### Мемоизация Context Values

```tsx
function MyProvider({ children, value }) {
  const memoizedValue = useMemoizedContextValue(value, [value.id, value.name])
  
  return <MyContext.Provider value={memoizedValue}>{children}</MyContext.Provider>
}
```

## Why Did You Render

Инструмент для отладки лишних ре-рендеров в development режиме.

### Настройка

Уже настроен в `apps/web/src/utils/wdyr.ts` и импортируется в `main.tsx`.

### Использование

Добавьте `whyDidYouRender: true` к компонентам, которые нужно отслеживать:

```tsx
function MyComponent() {
  // ...
}

MyComponent.whyDidYouRender = true
```

### Что показывает

- Когда компонент ре-рендерится
- Какие props изменились
- Почему произошел ре-рендер
- Изменения в хуках

## Измерение рендеров

### useRenderCount Hook

Отслеживает количество рендеров компонента:

```tsx
import { useRenderCount } from '../hooks/useRenderCount'

function MyComponent() {
  const renderCount = useRenderCount('MyComponent', true) // true = логировать в консоль
  
  return <div>Rendered {renderCount} times</div>
}
```

### useRenderTracker Hook

Более продвинутый трекер с детальной информацией:

```tsx
import { useRenderTracker } from '../hooks/useRenderCount'

function MyComponent(props) {
  const { renderCount, trackPropsChange } = useRenderTracker('MyComponent', true)
  
  trackPropsChange(props)
  
  return <div>Rendered {renderCount} times</div>
}
```

## Лучшие практики

### 1. Мемоизируйте компоненты списков

```tsx
// ✅ Хорошо
const ProductCard = memo(({ product }) => { ... })

{products.map(product => (
  <ProductCard key={product.id} product={product} />
))}

// ❌ Плохо
{products.map(product => (
  <div>{product.name}</div> // Ре-рендерится при каждом изменении списка
))}
```

### 2. Используйте стабильные ключи

```tsx
// ✅ Хорошо
{items.map(item => (
  <Item key={item.id} item={item} />
))}

// ❌ Плохо
{items.map((item, index) => (
  <Item key={index} item={item} /> // index меняется при изменении порядка
))}
```

### 3. Мемоизируйте объекты и массивы в props

```tsx
// ✅ Хорошо
const style = useMemo(() => ({ color: 'red' }), [])
const items = useMemo(() => [1, 2, 3], [])

<Component style={style} items={items} />

// ❌ Плохо
<Component style={{ color: 'red' }} items={[1, 2, 3]} /> // Новый объект/массив при каждом рендере
```

### 4. Разделяйте большие контексты

```tsx
// ✅ Хорошо - разделенные контексты
<UserContext.Provider value={user}>
  <ThemeContext.Provider value={theme}>
    {children}
  </ThemeContext.Provider>
</UserContext.Provider>

// ❌ Плохо - один большой контекст
<AppContext.Provider value={{ user, theme, cart, ... }}>
  {children}
</AppContext.Provider>
```

### 5. Избегайте создания функций в render

```tsx
// ✅ Хорошо
const handleClick = useCallback(() => {
  doSomething()
}, [])

<Button onClick={handleClick} />

// ❌ Плохо
<Button onClick={() => doSomething()} /> // Новая функция при каждом рендере
```

### 6. Используйте React DevTools Profiler

1. Откройте React DevTools
2. Перейдите на вкладку "Profiler"
3. Нажмите "Record"
4. Взаимодействуйте с приложением
5. Остановите запись
6. Анализируйте компоненты с частыми рендерами

## Оптимизированные компоненты в проекте

### ProductCard
- ✅ React.memo с кастомной compare функцией
- ✅ useMemo для вычислений (цена, материал, варианты)
- ✅ useStableCallback для event handlers
- ✅ useRenderCount для отладки

### SimpleProductCard
- ✅ React.memo с кастомной compare функцией
- ✅ useMemo для форматирования цены и единиц
- ✅ useStableCallback для обработчиков

### Layout
- ✅ React.memo для предотвращения ре-рендеров
- ✅ useMemo для стилей контейнера

### BannerCarousel
- ✅ React.memo с кастомной compare функцией
- ✅ useStableCallback для обработчиков навигации
- ✅ useMemo для текущего слайда

## Измерение производительности

### До оптимизации

Используйте React DevTools Profiler для измерения:

1. Количество рендеров компонентов
2. Время рендеринга
3. Коммиты (обновления DOM)

### После оптимизации

Сравните метрики:

- Количество рендеров должно уменьшиться
- Время рендеринга должно сократиться
- FPS должен быть стабильным (60 FPS)

## Дополнительные ресурсы

- [React.memo документация](https://react.dev/reference/react/memo)
- [useMemo документация](https://react.dev/reference/react/useMemo)
- [useCallback документация](https://react.dev/reference/react/useCallback)
- [Why Did You Render](https://github.com/welldone-software/why-did-you-render)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools#profiler)

## Заключение

Оптимизация ре-рендеров - это итеративный процесс:

1. Измерьте текущую производительность
2. Найдите компоненты с частыми рендерами
3. Примените оптимизации (memo, useMemo, useCallback)
4. Измерьте результат
5. Повторяйте до достижения целевых метрик

Помните: преждевременная оптимизация - корень всех зол. Оптимизируйте только те компоненты, которые действительно вызывают проблемы с производительностью.




