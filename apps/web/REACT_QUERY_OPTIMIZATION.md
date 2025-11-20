# ⚡ React Query Optimization Guide

Документация по оптимизации работы с данными через React Query.

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Конфигурация QueryClient](#конфигурация-queryclient)
3. [Prefetching](#prefetching)
4. [Optimistic Updates](#optimistic-updates)
5. [Background Refetch](#background-refetch)
6. [Query Invalidation](#query-invalidation)
7. [Best Practices](#best-practices)
8. [Devtools](#devtools)

---

## 🎯 Обзор

Приложение использует **React Query (TanStack Query)** для управления состоянием сервера:

- ✅ Оптимизированная конфигурация QueryClient
- ✅ Prefetching для лучшего UX
- ✅ Optimistic Updates для мгновенной обратной связи
- ✅ Background refetch для актуальных данных
- ✅ Query invalidation после мутаций
- ✅ React Query Devtools для разработки

**Цели:**
- Минимизация запросов к серверу
- Быстрая обратная связь для пользователя
- Актуальные данные в фоне
- Оптимальный UX

---

## ⚙️ Конфигурация QueryClient

### Базовая конфигурация

```typescript
// apps/web/src/config/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут для каталога
      gcTime: 10 * 60 * 1000, // 10 минут в памяти
      refetchOnWindowFocus: false, // Не обновлять при фокусе для статичных данных
      retry: 1, // Быстрый fallback
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})
```

### Настройки по типам данных

| Тип данных | staleTime | gcTime | refetchOnWindowFocus |
|------------|-----------|--------|---------------------|
| Каталог товаров | 5 минут | 10 минут | false |
| Детали товара | 5 минут | 10 минут | false |
| Корзина | 30 секунд | 5 минут | true |
| Заказы | 1 минута | 5 минут | true |
| Баннеры | 1 минута | 5 минут | false |

---

## 🚀 Prefetching

### Хук usePrefetch

```typescript
// apps/web/src/hooks/usePrefetch.ts
export function usePrefetch() {
  const queryClient = useQueryClient()

  const prefetchProduct = async (slug: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.products.detail(slug),
      queryFn: async () => {
        const response = await axios.get(`${API_URL}/products/${slug}`)
        return response.data
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  const prefetchCategory = async (slug: string) => {
    // Prefetch категории и товаров
  }

  const prefetchPage = async (categorySlug: string, page: number) => {
    // Prefetch следующей страницы пагинации
  }

  return { prefetchProduct, prefetchCategory, prefetchPage }
}
```

### Использование

#### Prefetch товара при наведении

```tsx
// ProductCard.tsx
const { prefetchProduct } = usePrefetch()

<div
  onMouseEnter={() => prefetchProduct(product.slug)}
  onTouchStart={() => prefetchProduct(product.slug)}
>
  <Link to={`/p/${product.slug}`}>...</Link>
</div>
```

#### Prefetch категории

```tsx
// Home.tsx
const { prefetchCategory } = usePrefetch()

<Link
  to="/materials/marble"
  onMouseEnter={() => prefetchCategory('marble')}
>
  Мраморные изделия
</Link>
```

#### Prefetch следующей страницы

```tsx
// Category.tsx
useEffect(() => {
  if (hasNextPage && !isFetchingNextPage && slug) {
    const currentPage = data?.pages.length || 1
    const nextPage = currentPage + 1
    prefetchPage(slug, nextPage, {})
  }
}, [hasNextPage, isFetchingNextPage, data?.pages.length, slug, prefetchPage])
```

---

## ⚡ Optimistic Updates

### Принцип работы

1. **onMutate** - Оптимистично обновляем UI
2. **mutationFn** - Выполняем запрос
3. **onSuccess/onError** - Обновляем или откатываем

### Пример: Добавление в корзину

```typescript
const addToCartMutation = useMutation({
  mutationFn: async (variables) => {
    // Запрос к серверу
  },
  onMutate: async (variables) => {
    // Отменяем текущие запросы
    await queryClient.cancelQueries({ queryKey: ['cart'] })
    
    // Сохраняем предыдущее состояние
    const previousCart = queryClient.getQueryData<Cart>(['cart'])
    
    // Оптимистично обновляем
    queryClient.setQueryData<Cart>(['cart'], (old) => {
      // Добавляем товар в корзину
      return { ...old, items: [...old.items, newItem] }
    })
    
    return { previousCart }
  },
  onError: (err, variables, context) => {
    // Откат при ошибке
    if (context?.previousCart) {
      queryClient.setQueryData(['cart'], context.previousCart)
    }
  },
  onSettled: () => {
    // Инвалидируем для получения актуальных данных
    queryClient.invalidateQueries({ queryKey: ['cart'] })
  },
})
```

### Пример: Обновление количества

```typescript
const updateQuantityMutation = useMutation({
  mutationFn: async ({ itemId, quantity }) => {
    await cartAxios.patch(`/cart/items/${itemId}`, { quantity })
  },
  onMutate: async ({ itemId, quantity }) => {
    await queryClient.cancelQueries({ queryKey: ['cart'] })
    const previousCart = queryClient.getQueryData<Cart>(['cart'])

    queryClient.setQueryData<Cart>(['cart'], (old) => {
      return {
        ...old,
        items: old.items
          .map((item) => item.id === itemId ? { ...item, quantity } : item)
          .filter((item) => item.quantity > 0),
      }
    })

    return { previousCart }
  },
  onError: (err, variables, context) => {
    if (context?.previousCart) {
      queryClient.setQueryData(['cart'], context.previousCart)
    }
  },
})
```

---

## 🔄 Background Refetch

### Для корзины

```typescript
const { data: serverCart } = useQuery<Cart>({
  queryKey: ['cart'],
  queryFn: async () => {
    // Загрузка корзины
  },
  staleTime: 30 * 1000, // 30 секунд
  // Background refetch каждые 30 секунд
  refetchInterval: (query) => {
    const token = localStorage.getItem('token')
    if (token && !isOffline) {
      return 30 * 1000 // 30 секунд
    }
    return false
  },
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
})
```

### Когда использовать

- **Корзина** - часто меняется, нужна актуальность
- **Заказы** - статусы могут меняться
- **Уведомления** - новые сообщения

---

## 🔁 Query Invalidation

### После мутаций

```typescript
onSettled: () => {
  // Инвалидируем корзину после мутации
  queryClient.invalidateQueries({ queryKey: ['cart'] })
}
```

### Селективная инвалидация

```typescript
// Инвалидировать все товары
queryClient.invalidateQueries({ queryKey: ['products'] })

// Инвалидировать конкретный товар
queryClient.invalidateQueries({ queryKey: ['products', 'detail', slug] })

// Инвалидировать товары категории
queryClient.invalidateQueries({ queryKey: ['products', 'category', categorySlug] })
```

---

## 📚 Best Practices

### 1. Используйте queryKeys factory

```typescript
export const queryKeys = {
  products: {
    all: ['products'] as const,
    detail: (slug: string) => [...queryKeys.products.all, 'detail', slug] as const,
    byCategory: (categorySlug: string) => 
      [...queryKeys.products.all, 'category', categorySlug] as const,
  },
}
```

### 2. Правильный staleTime

```typescript
// Статичные данные (каталог)
staleTime: 5 * 60 * 1000 // 5 минут

// Динамичные данные (корзина)
staleTime: 30 * 1000 // 30 секунд
```

### 3. Optimistic Updates для UX

```typescript
// Всегда используйте onMutate для мгновенной обратной связи
onMutate: async (variables) => {
  // Обновляем UI сразу
}
```

### 4. Prefetch для навигации

```typescript
// Prefetch при наведении на ссылку
<Link
  onMouseEnter={() => prefetchProduct(slug)}
  onTouchStart={() => prefetchProduct(slug)}
>
```

### 5. Error Handling

```typescript
onError: (err, variables, context) => {
  // Откатываем optimistic update
  if (context?.previousCart) {
    queryClient.setQueryData(['cart'], context.previousCart)
  }
  // Показываем уведомление
  toast.error('Ошибка при добавлении в корзину')
}
```

---

## 🛠️ Devtools

### Настройка

```tsx
// App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      {/* Только в development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
```

### Использование

1. Откройте Devtools (F12 или кнопка внизу экрана)
2. Просматривайте активные queries
3. Инвалидируйте queries вручную
4. Отслеживайте состояние кэша

---

## 📊 Performance Metrics

### Целевые показатели

- **Time to Interactive** < 2s
- **First Contentful Paint** < 1.5s
- **Cache Hit Rate** > 80%

### Мониторинг

Используйте React Query Devtools для отслеживания:
- Количество запросов
- Cache hit rate
- Stale queries
- Background refetches

---

## 🔗 Дополнительные ресурсы

- [React Query Documentation](https://tanstack.com/query/latest)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [Prefetching Guide](https://tanstack.com/query/latest/docs/react/guides/prefetching)
- [Query Invalidation](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)

---

**Оптимизация React Query - ключ к быстрому и отзывчивому приложению! 🚀**







