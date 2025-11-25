import { QueryClient } from '@tanstack/react-query'

/**
 * Оптимизированная конфигурация QueryClient для production
 * 
 * Настройки:
 * - staleTime: 5 минут для каталога (статические данные)
 * - cacheTime: 10 минут в памяти
 * - refetchOnWindowFocus: false для статичных данных
 * - retry: 1 для быстрого fallback
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Время, в течение которого данные считаются свежими
      staleTime: 5 * 60 * 1000, // 5 минут для каталога
      
      // Время хранения неактивных данных в кэше
      gcTime: 10 * 60 * 1000, // 10 минут (в React Query v5 cacheTime переименован в gcTime)
      
      // Не обновлять при фокусе окна для статичных данных
      refetchOnWindowFocus: false,
      
      // Не обновлять при переподключении
      refetchOnReconnect: false,
      
      // Количество повторных попыток при ошибке
      retry: 1,
      
      // Задержка между повторными попытами
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Структурированная обработка ошибок
      throwOnError: false,
    },
    mutations: {
      // Количество повторных попыток для мутаций
      retry: 1,
      
      // Задержка между повторными попытками
      retryDelay: 1000,
    },
  },
})

/**
 * Query keys factory для type-safe query keys
 */
export const queryKeys = {
  // Каталог и категории
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
    detail: (slug: string) => [...queryKeys.categories.all, 'detail', slug] as const,
    materials: () => [...queryKeys.categories.all, 'materials'] as const,
  },
  
  // Товары
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.products.all, 'list', filters] as const,
    detail: (slug: string) => [...queryKeys.products.all, 'detail', slug] as const,
    byId: (id: number) => [...queryKeys.products.all, 'id', id] as const,
    byCategory: (categorySlug: string, filters?: Record<string, any>) =>
      [...queryKeys.products.all, 'category', categorySlug, filters] as const,
  },
  
  // Корзина
  cart: {
    all: ['cart'] as const,
    items: () => [...queryKeys.cart.all, 'items'] as const,
  },
  
  // Заказы
  orders: {
    all: ['orders'] as const,
    list: () => [...queryKeys.orders.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.orders.all, 'detail', id] as const,
  },
  
  // Баннеры
  banners: {
    all: ['banners'] as const,
    list: () => [...queryKeys.banners.all, 'list'] as const,
  },
} as const









