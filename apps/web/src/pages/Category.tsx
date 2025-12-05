import { useParams, Link } from 'react-router-dom'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { useCart } from '../hooks/useCart'
import { useDebounce } from '../hooks/useDebounce'
import { usePrefetch } from '../hooks/usePrefetch'
import { Search, ShoppingCart, Package } from 'lucide-react'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import ProductCard from '../components/ProductCard'
import VirtualizedProductGrid from '../components/VirtualizedProductGrid'
import FlyingElement from '../components/FlyingElement'
import Header from '../components/Header'
import toast from 'react-hot-toast'
import axios from 'axios'
import { debugLog } from '../components/DebugPanel'

import { API_URL } from '../config/api'

// Моковые данные для фильтров
const mockFilters = {
  material: [
    { id: '1', label: 'Пластик', value: 'plastic' },
    { id: '2', label: 'Металл', value: 'metal' },
    { id: '3', label: 'Дерево', value: 'wood' },
    { id: '4', label: 'Стекло', value: 'glass' },
  ],
  color: [
    { id: '1', label: 'Чёрный', value: 'black' },
    { id: '2', label: 'Белый', value: 'white' },
    { id: '3', label: 'Красный', value: 'red' },
    { id: '4', label: 'Синий', value: 'blue' },
  ],
  shape: [
    { id: '1', label: 'Круглый', value: 'round' },
    { id: '2', label: 'Квадратный', value: 'square' },
    { id: '3', label: 'Прямоугольный', value: 'rectangular' },
  ],
}

// Реальная функция для получения товаров из API с серверной пагинацией
const fetchProducts = async ({ pageParam = 1, categorySlug }: any) => {
  try {
    // Сначала получаем категорию по slug для получения categoryId
    const categoryResponse = await axios.get(`${API_URL}/catalog/categories/${categorySlug}`)
    const category = categoryResponse.data
    
    if (!category) {
      return {
        products: [],
        nextPage: undefined,
        hasMore: false,
      }
    }

    // Используем серверную пагинацию через /catalog/products
    const pageSize = 12
    const productsResponse = await axios.get(`${API_URL}/catalog/products`, {
      params: {
        categoryId: category.id,
        activeOnly: 'true',
        page: pageParam || 1,
        limit: pageSize,
      },
      timeout: 10000, // 10 секунд таймаут
      validateStatus: (status) => status < 500, // Не выбрасывать ошибку для 4xx
    })

    // Проверяем, есть ли пагинация в ответе
    const responseData = productsResponse.data
    let products: any[] = []
    let hasMore = false
    let nextPage: number | undefined = undefined

    if (responseData.data && responseData.meta) {
      // Ответ с пагинацией
      products = responseData.data
      hasMore = responseData.meta.hasNextPage
      nextPage = hasMore ? pageParam + 1 : undefined
    } else if (Array.isArray(responseData)) {
      // Обратная совместимость - массив без пагинации
      products = responseData
      hasMore = products.length === pageSize
      nextPage = hasMore ? pageParam + 1 : undefined
    }

    // Преобразуем товары в нужный формат
    const formattedProducts = products.map((product: any) => {
      // Определяем цену (базовая цена или минимальная цена варианта)
      let price = product.basePrice || 0
      if (product.variants && product.variants.length > 0) {
        const activeVariants = product.variants.filter((v: any) => v.isActive)
        if (activeVariants.length > 0) {
          price = Math.min(...activeVariants.map((v: any) => v.price))
        }
      }

      // Получаем изображение
      const image = product.media && product.media.length > 0 
        ? product.media[0].url 
        : '/placeholder-image.svg'

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: price,
        image: image,
        images: product.media?.map((m: any) => m.url) || [image],
        productType: product.productType,
        variants: product.variants || [],
        attributes: product.attributes || [],
        material: product.material,
      }
    })

    return {
      products: formattedProducts,
      nextPage,
      hasMore,
    }
  } catch (error: any) {
    console.error('Ошибка загрузки товаров:', error)
    // Возвращаем пустой массив при ошибке
    return {
      products: [],
      nextPage: undefined,
      hasMore: false,
    }
  }
}

export default function Category() {
  const { slug } = useParams<{ slug: string }>()
  const { BackButton } = useTelegram()
  const { addToCart, itemsCount } = useCart()
  const { prefetchPage } = usePrefetch()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [flyingTrigger, setFlyingTrigger] = useState(false)
  const [flyingPosition, setFlyingPosition] = useState({ from: { x: 0, y: 0 }, to: { x: 0, y: 0 } })

  // Debounce поискового запроса для оптимизации производительности
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['products', slug, debouncedSearchQuery], // Используем debounced значение
    queryFn: ({ pageParam }) => fetchProducts({ pageParam, categorySlug: slug, filters: {}, sort: 'newest' }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 минут для каталога
    gcTime: 10 * 60 * 1000, // 10 минут в памяти
  })

  // Prefetch следующей страницы при приближении к концу списка
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && slug) {
      const currentPage = data?.pages.length || 1
      const nextPage = currentPage + 1
      // Prefetch следующей страницы заранее
      prefetchPage(slug, nextPage, {})
    }
  }, [hasNextPage, isFetchingNextPage, data?.pages.length, slug, prefetchPage])

  // Используем itemsCount из хука useCart вместо локального состояния

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    if (!BackButton || typeof BackButton.show !== 'function') {
      return
    }

    let handlerId: string | null = null
    try {
      BackButton.show()
      handlerId = BackButton.onClick(() => {
        window.history.back()
      }, 'category-back')
    } catch (error) {
      console.debug('BackButton not supported:', error)
    }

    return () => {
      if (typeof BackButton.hide === 'function') {
        try {
          BackButton.hide()
          if (handlerId) {
            BackButton.offClick(handlerId)
          } else if (typeof BackButton.clearHandlers === 'function') {
            BackButton.clearHandlers()
          }
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      }
    }
  }, [BackButton])

  // Оптимизированный обработчик добавления в корзину с useCallback
  const handleAddToCart = useCallback((product: any, position: { x: number; y: number }) => {
    // Анимация летит к нижней кнопке корзины
    const cartButton = document.querySelector('a[href="/cart"]')
    if (cartButton) {
      const cartRect = cartButton.getBoundingClientRect()
      setFlyingPosition({
        from: position,
        to: {
          x: cartRect.left + cartRect.width / 2,
          y: cartRect.top + cartRect.height / 2,
        },
      })
      setFlyingTrigger(true)
    }
    
    // Добавляем товар в корзину через хук
    if (product.id) {
      // Определяем вариант и цену
      let variantId: number | undefined
      let variantPrice: number | undefined
      let variantName: string | undefined
      let priceToUse = product.price || product.basePrice || 0
      
      debugLog.action('📦 Category handleAddToCart', {
        productId: product.id,
        productName: product.name,
        hasVariants: !!(product.variants && product.variants.length > 0),
        variantsCount: product.variants?.length || 0,
        productPrice: product.price,
        basePrice: product.basePrice
      })
      
      // Если у товара есть варианты, берём первый активный
      if (product.variants && product.variants.length > 0) {
        const firstActiveVariant = product.variants.find((v: any) => v.isActive !== false)
        if (firstActiveVariant) {
          variantId = firstActiveVariant.id
          variantPrice = parseFloat(firstActiveVariant.price) || firstActiveVariant.price
          variantName = firstActiveVariant.name
          priceToUse = variantPrice || priceToUse
          debugLog.info('Selected first variant', { variantId, variantPrice, variantName })
        }
      }
      
      debugLog.info('Calling addToCart from Category', {
        productId: product.id,
        variantId,
        priceToUse,
        quantity: 1
      })
      
      addToCart(product.id, {
        quantity: 1,
        productSlug: product.slug,
        productName: product.name,
        productPrice: priceToUse,
        variantId,
        variantPrice,
        variantName,
        imageUrl: product.image || product.images?.[0] || product.media?.[0]?.url,
      })
      // Уведомление показывается в хуке useCart, не нужно дублировать здесь
    }
  }, [addToCart])

  // Мемоизированное вычисление названия категории
  const categoryName = useMemo(() => {
    return slug
      ? slug.charAt(0).toUpperCase() + slug.slice(1)
      : 'Категория'
  }, [slug])

  // Мемоизированное вычисление списка товаров
  const products = useMemo(() => {
    return data?.pages.flatMap((page) => page.products) || []
  }, [data])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
      <Header />
      {/* Header - простой поиск - фиксирован под GraniteHeader */}
      <div 
        className="fixed left-0 right-0 z-20 bg-gradient-to-b from-gray-100/50 via-gray-50 to-white border-b border-gray-200/50"
        style={{
          top: 'var(--header-search-offset)',
        }}
      >
        <div className="px-4 py-3">
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Введите запрос.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bronze-500/30 focus:border-bronze-500/50 transition-colors shadow-sm"
                style={{
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              />
            </div>
            <button
              type="button"
              className="granite-button p-2.5 rounded-lg"
            >
              <Search className="w-5 h-5 text-gray-200" />
            </button>
            {/* Кнопка истории заказов */}
            <Link
              to="/orders"
              className="granite-button p-2.5 rounded-lg flex items-center justify-center"
              title="Мои заказы"
            >
              <Package className="w-5 h-5 text-gray-200" />
            </Link>
          </div>
        </div>
      </div>

      {/* Spacer: только под поиск (хедер уже даёт свой spacer) */}
      <div style={{ height: 'var(--search-block-height)' }} />

      {/* Category Name */}
      <div className="px-4 py-4">
        <h1 className="text-2xl font-inscription text-gray-900">{categoryName}</h1>
      </div>

      {/* Products Grid - Виртуализированный для производительности */}
      <div className="px-4" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
        {isError ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Ошибка загрузки товаров</p>
          </div>
        ) : (
          <VirtualizedProductGrid
            products={products}
            onAddToCart={handleAddToCart}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            onLoadMore={fetchNextPage}
            columns={2}
            gap={16}
            itemHeight={280}
          />
        )}
      </div>

      {/* Sticky Cart Button - гранитный стиль с мраморной текстурой */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-b from-gray-100/50 via-gray-50 to-white border-t border-gray-200/50 safe-area-bottom">
        <div className="px-4 py-3">
          <Link
            to="/cart"
            className="granite-button w-full block text-center font-medium py-3 px-4 rounded-lg"
          >
            Перейти в корзину
          </Link>
        </div>
      </div>

      {/* Flying Element Animation - гранитный стиль как у основного хедера */}
      <FlyingElement
        trigger={flyingTrigger}
        from={flyingPosition.from}
        to={flyingPosition.to}
        onComplete={() => setFlyingTrigger(false)}
      >
        <div className="granite-button w-12 h-12 rounded-full flex items-center justify-center">
          <ShoppingCart className="w-6 h-6 text-gray-200" />
        </div>
      </FlyingElement>
    </div>
  )
}
