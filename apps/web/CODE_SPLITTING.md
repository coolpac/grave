# 🚀 Code Splitting и Lazy Loading

Документация по оптимизации загрузки приложения с помощью code splitting.

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Lazy Loading страниц](#lazy-loading-страниц)
3. [Code Splitting конфигурация](#code-splitting-конфигурация)
4. [Prefetch стратегия](#prefetch-стратегия)
5. [Динамические импорты](#динамические-импорты)
6. [Анализ bundle size](#анализ-bundle-size)
7. [Best Practices](#best-practices)

---

## 🎯 Обзор

Приложение использует **code splitting** и **lazy loading** для оптимизации производительности:

- ✅ Все страницы загружаются лениво через `React.lazy()`
- ✅ Bundle разбит на оптимизированные chunks
- ✅ Prefetch для предзагрузки следующих страниц
- ✅ Динамические импорты для тяжелых компонентов

**Цели:**
- First Load JS < 200KB
- Total Bundle < 500KB
- Оптимальное кэширование через разделение chunks

---

## 📄 Lazy Loading страниц

### Реализация

Все страницы загружаются лениво в `App.tsx`:

```typescript
// Lazy load all pages
const Home = lazy(() => import('./pages/Home'))
const Category = lazy(() => import('./pages/Category'))
const Product = lazy(() => import('./pages/Product'))
// ... и т.д.
```

### Suspense Fallback

Красивый fallback компонент для загрузки:

```typescript
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      <p className="text-sm text-white/60">Загрузка...</p>
    </div>
  </div>
)
```

### Использование

```typescript
<Suspense fallback={<PageLoadingFallback />}>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/p/:slug" element={<Product />} />
    {/* ... */}
  </Routes>
</Suspense>
```

---

## 📦 Code Splitting конфигурация

### Vite manualChunks

Настроено в `vite.config.ts` для оптимального разделения:

#### Vendor Chunks

- **vendor-react** - React, React DOM, React Router
- **vendor-ui** - @monorepo/ui компоненты
- **vendor-animations** - framer-motion, react-zoom-pan-pinch
- **vendor-state** - @tanstack/react-query, zustand
- **vendor-forms** - react-hook-form, zod
- **vendor-markdown** - react-markdown, remark-gfm
- **vendor-telegram** - @twa-dev/sdk
- **vendor-utils** - axios, clsx, lucide-react, react-hot-toast
- **vendor-other** - остальные node_modules

#### Page Chunks

- **page-home** - Главная страница
- **page-product** - Страница товара
- **page-category** - Категории
- **page-cart** - Корзина
- **page-checkout** - Оформление заказа
- **page-orders** - Заказы

### Конфигурация

```typescript
build: {
  chunkSizeWarningLimit: 500,
  rollupOptions: {
    output: {
      manualChunks: (id) => {
        // Логика разделения chunks
      },
      chunkFileNames: 'js/[name]-[hash].js',
      entryFileNames: 'js/[name]-[hash].js',
    },
  },
}
```

---

## ⚡ Prefetch стратегия

### Утилита prefetch

```typescript
// utils/prefetch.ts
export const prefetchPage = (importFn: () => Promise<any>) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => importFn(), { timeout: 2000 })
  } else {
    setTimeout(() => importFn(), 100)
  }
}
```

### Использование в компонентах

```typescript
import { usePrefetch } from '../utils/prefetch'

function MyComponent() {
  const prefetchProps = usePrefetch(() => import('../pages/Product'))
  
  return (
    <Link to="/p/slug" {...prefetchProps}>
      Product
    </Link>
  )
}
```

### Автоматический prefetch

Можно добавить автоматический prefetch для всех ссылок через Layout или Router.

---

## 🔄 Динамические импорты

### Тяжелые компоненты

Компоненты с большими зависимостями загружаются динамически:

```typescript
// Product.tsx
import { lazy, Suspense } from 'react'

// Lazy load ProductImageGallery (содержит react-zoom-pan-pinch)
const ProductImageGallery = lazy(() => import('../components/ProductImageGallery'))

// Использование
<Suspense fallback={<LoadingSpinner />}>
  <ProductImageGallery images={images} onClose={handleClose} />
</Suspense>
```

### Когда использовать

- ✅ Модальные окна
- ✅ Тяжелые библиотеки (zoom, charts, editors)
- ✅ Не критичные компоненты
- ✅ Компоненты, используемые редко

---

## 📊 Анализ bundle size

### Скрипт анализа

```bash
# После сборки
pnpm build

# Анализ bundle
node scripts/analyze-bundle.js
```

### Что анализирует

- Размер каждого chunk
- First Load JS размер
- Total bundle size
- Рекомендации по оптимизации

### Пример вывода

```
📦 Bundle Size Analysis
================================================================================

📊 JavaScript Chunks:

✅ 1. vendor-react-[hash].js: 145.2 KB (32.1%)
✅ 2. page-product-[hash].js: 89.5 KB (19.8%)
✅ 3. vendor-animations-[hash].js: 67.3 KB (14.9%)
...

📈 Summary:

Total JavaScript: 452.1 KB
First Load JS: 178.3 KB
Total CSS: 12.4 KB
Total Bundle: 464.5 KB

💡 Recommendations:

✅ First Load JS (178.3 KB) is under 200KB
✅ Total JS (452.1 KB) is under 500KB
✅ Good code splitting - 12 chunks for optimal caching
```

---

## 🎯 Best Practices

### 1. Lazy Loading

- ✅ Все страницы через `React.lazy()`
- ✅ Тяжелые компоненты динамически
- ✅ Используйте Suspense с красивым fallback

### 2. Code Splitting

- ✅ Разделяйте vendor и page chunks
- ✅ Группируйте связанные библиотеки
- ✅ Изолируйте тяжелые библиотеки

### 3. Prefetch

- ✅ Prefetch на hover/touch
- ✅ Используйте requestIdleCallback
- ✅ Не prefetch все сразу

### 4. Оптимизация

- ✅ Минимизируйте First Load JS
- ✅ Используйте tree-shaking
- ✅ Удаляйте неиспользуемый код

### 5. Мониторинг

- ✅ Регулярно анализируйте bundle size
- ✅ Отслеживайте размер chunks
- ✅ Проверяйте First Load JS

---

## 🔧 Настройка

### Изменение chunkSizeWarningLimit

```typescript
// vite.config.ts
build: {
  chunkSizeWarningLimit: 500, // KB
}
```

### Добавление нового chunk

```typescript
manualChunks: (id) => {
  if (id.includes('new-heavy-library')) {
    return 'vendor-new-library'
  }
  // ...
}
```

### Изменение prefetch стратегии

```typescript
// utils/prefetch.ts
export const prefetchPage = (importFn: () => Promise<any>) => {
  // Настройте таймаут и приоритет
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => importFn(), { timeout: 3000 })
  }
}
```

---

## 📚 Дополнительные ресурсы

- [React Code Splitting](https://react.dev/reference/react/lazy)
- [Vite Build Options](https://vitejs.dev/config/build-options.html)
- [Web Vitals](https://web.dev/vitals/)

---

**Code splitting - ключ к быстрой загрузке приложения! 🚀**

