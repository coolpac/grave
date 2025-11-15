import { useParams, Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Skeleton } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
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

// Моковая функция для получения товаров
const fetchProducts = async ({ pageParam = 1, categorySlug, filters, sort }: any) => {
  // В реальном приложении здесь будет запрос к API
  await new Promise((resolve) => setTimeout(resolve, 500)) // Имитация задержки

  // Моковые данные для ритуальных товаров
  const productNames = [
    'Памятник из гранита',
    'Резной памятник с орнаментом',
    'Плита мраморная',
    'Ваза гранитная',
    'Мраморная крошка',
    'Гранитная плита',
    'Памятник классический',
    'Резной памятник элит',
    'Плита с гравировкой',
    'Ваза мраморная',
    'Крошка мраморная цветная',
    'Гранит полированный',
    'Памятник двойной',
    'Резной памятник премиум',
    'Плита гранитная',
    'Ваза с орнаментом',
    'Крошка декоративная',
    'Гранит габбро',
    'Памятник семейный',
    'Резной памятник эксклюзив',
    'Плита мемориальная',
    'Ваза классическая',
    'Крошка мраморная белая',
    'Гранит красный',
    'Памятник одиночный',
    'Резной памятник стандарт',
    'Плита с фото',
    'Ваза современная',
    'Крошка разноцветная',
    'Гранит черный',
  ]

  // Функция для получения изображений по типу товара
  const getProductImage = (productName: string, index: number) => {
    // Красивые изображения для разных категорий товаров
    const imageUrls: Record<string, string[]> = {
      'Памятник': [
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80', // Камень/гранит
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80', // Мрамор
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80', // Каменная текстура
        'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&h=800&fit=crop&q=80', // Камень
        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=800&fit=crop&q=80', // Мраморная текстура
      ],
      'Резной': [
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=800&fit=crop&q=80',
      ],
      'Плита': [
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=800&fit=crop&q=80',
      ],
      'Ваза': [
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=800&fit=crop&q=80',
      ],
      'Крошка': [
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=800&fit=crop&q=80',
      ],
      'Гранит': [
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=800&fit=crop&q=80',
      ],
    }

    // Определяем категорию по названию
    let category = 'Памятник'
    if (productName.includes('Резной')) category = 'Резной'
    else if (productName.includes('Плита')) category = 'Плита'
    else if (productName.includes('Ваза')) category = 'Ваза'
    else if (productName.includes('Крошка')) category = 'Крошка'
    else if (productName.includes('Гранит')) category = 'Гранит'

    const urls = imageUrls[category] || imageUrls['Памятник']
    return urls[index % urls.length]
  }

  const allProducts = Array.from({ length: 30 }, (_, i) => {
    const productName = productNames[i] || `Товар ${i + 1}`
    const mainImage = getProductImage(productName, i)
    return {
      id: i + 1,
      slug: `product-${i + 1}`,
      name: productName,
      price: Math.floor(Math.random() * 40000) + 15000, // Цены от 15000 до 55000
      image: mainImage,
      images: [
        mainImage,
        getProductImage(productName, i + 1),
        getProductImage(productName, i + 2),
      ],
    }
  })

  const pageSize = 12
  const start = (pageParam - 1) * pageSize
  const end = start + pageSize

  return {
    products: allProducts.slice(start, end),
    nextPage: end < allProducts.length ? pageParam + 1 : undefined,
    hasMore: end < allProducts.length,
  }
}

export default function Category() {
  const { slug } = useParams<{ slug: string }>()
  const { BackButton } = useTelegram()
  const [searchQuery, setSearchQuery] = useState('')
  const [flyingTrigger, setFlyingTrigger] = useState(false)
  const [flyingPosition, setFlyingPosition] = useState({ from: { x: 0, y: 0 }, to: { x: 0, y: 0 } })
  const [cartCount, setCartCount] = useState(0)

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

  // Загрузка количества товаров в корзине
  useEffect(() => {
    const loadCartCount = async () => {
      try {
        const response = await axios.get(`${API_URL}/cart`)
        const items = response.data?.items || []
        const count = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
        setCartCount(count)
      } catch (error) {
        // Игнорируем ошибки, используем 0
        setCartCount(0)
      }
    }
    loadCartCount()
  }, [])

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
    BackButton.show()
    BackButton.onClick(() => {
      window.history.back()
    })

    return () => {
      BackButton.hide()
      BackButton.offClick(() => {})
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
      // Обновляем счетчик корзины
      setCartCount((prev) => prev + 1)
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
