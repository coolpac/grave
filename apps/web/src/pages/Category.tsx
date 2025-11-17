import { useParams, Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Skeleton } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { useCart } from '../hooks/useCart'
import { Search, ShoppingCart, Package } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import ProductCard from '../components/ProductCard'
import FlyingElement from '../components/FlyingElement'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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
        : 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [flyingTrigger, setFlyingTrigger] = useState(false)
  const [flyingPosition, setFlyingPosition] = useState({ from: { x: 0, y: 0 }, to: { x: 0, y: 0 } })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['products', slug, searchQuery],
    queryFn: ({ pageParam }) => fetchProducts({ pageParam, categorySlug: slug, filters: {}, sort: 'newest' }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  })

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
    if (BackButton && typeof BackButton.show === 'function') {
      try {
        BackButton.show()
        BackButton.onClick(() => {
          window.history.back()
        })
      } catch (error) {
        console.debug('BackButton not supported:', error)
      }
    }

    return () => {
      if (BackButton && typeof BackButton.hide === 'function') {
        try {
          BackButton.hide()
          BackButton.offClick(() => {})
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      }
    }
  }, [BackButton])

  const handleAddToCart = (product: any, position: { x: number; y: number }) => {
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
      addToCart(product.id, {
        quantity: 1,
        productSlug: product.slug,
        productName: product.name,
        productPrice: product.price,
        imageUrl: product.image || product.images?.[0],
      })
    }
  }

  const categoryName = slug
    ? slug.charAt(0).toUpperCase() + slug.slice(1)
    : 'Категория'

  const products = data?.pages.flatMap((page) => page.products) || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
      {/* Header - простой поиск - фон как у страницы, но чуть темнее для видимости */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-gray-100/50 via-gray-50 to-white border-b border-gray-200/50">
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

      {/* Category Name */}
      <div className="px-4 py-4">
        <h1 className="text-2xl font-inscription text-gray-900">{categoryName}</h1>
      </div>

      {/* Products Grid */}
      <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden">
                <Skeleton variant="rectangular" width="100%" height={200} />
                <div className="p-3 space-y-2">
                  <Skeleton variant="text" width="80%" height={16} />
                  <Skeleton variant="text" width="60%" height={20} />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Ошибка загрузки товаров</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-4" />

            {/* Loading More Skeleton */}
            {isFetchingNextPage && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg overflow-hidden">
                    <Skeleton variant="rectangular" width="100%" height={200} />
                    <div className="p-3 space-y-2">
                      <Skeleton variant="text" width="80%" height={16} />
                      <Skeleton variant="text" width="60%" height={20} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
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
