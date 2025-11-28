import { useParams, useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { useCart } from '../hooks/useCart'
import { useTelegramAnalytics } from '../hooks/useTelegramAnalytics'
import { ShoppingCart, Plus, Minus, Check, Calculator, Truck, MapPin, User, Phone, X } from 'lucide-react'
import { useEffect, useState, useRef, useMemo, useCallback, Suspense, lazy } from 'react'
// Lazy load ProductImageGallery (heavy component with react-zoom-pan-pinch)
const ProductImageGallery = lazy(() => import('../components/ProductImageGallery'))
import ProductSpecifications from '../components/ProductSpecifications'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import ProductVariantSelector from '../components/product/ProductVariantSelector'
import OptimizedImage from '../components/OptimizedImage'
import { PLACEHOLDER_IMAGE } from '../utils/constants'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getTransition, getAnimationVariants } from '../utils/animation-variants'
import Header from '../components/Header'
import { debugLog } from '../components/DebugPanel'

import { API_URL } from '../config/api'

// Флаг для отслеживания доступности API (используем sessionStorage для сессии)
const getApiAvailable = (): boolean => {
  if (typeof window === 'undefined') return true
  try {
    const stored = sessionStorage.getItem('api_available')
    // По умолчанию считаем, что API доступен (первый запрос)
    return stored !== 'false'
  } catch {
    return true
  }
}

const setApiAvailable = (available: boolean) => {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem('api_available', String(available))
  } catch {
    // Игнорируем ошибки sessionStorage
  }
}

// Создаем axios instance с умной обработкой ошибок
const silentAxios = axios.create({
  timeout: 1500,
  validateStatus: (status) => status < 500, // Не показываем ошибку для 401/403/404
})

// Перехватываем ошибки и обновляем флаг доступности
silentAxios.interceptors.response.use(
  (response) => {
    setApiAvailable(true)
    return response
  },
  (error) => {
    // Игнорируем ошибки авторизации (401, 403) - это нормально для публичных страниц
    if (error.response?.status === 401 || error.response?.status === 403) {
      setApiAvailable(false)
      return Promise.reject({ ...error, silent: true })
    }
    const isNetworkError = error?.code === 'ERR_NETWORK' || 
                          error?.code === 'ERR_CONNECTION_REFUSED' ||
                          error?.code === 'ECONNABORTED' ||
                          error?.message?.includes('Network Error') ||
                          error?.message?.includes('ERR_CONNECTION_REFUSED')
    
    if (isNetworkError) {
      setApiAvailable(false)
      // Создаем тихую ошибку
      const silentError: any = new Error('Network error')
      silentError.code = error.code
      silentError.isNetworkError = true
      silentError.silent = true
      return Promise.reject(silentError)
    }
    setApiAvailable(true) // Если это не сетевая ошибка, API доступен
    return Promise.reject(error)
  }
)

// Моковые данные товара для ритуальных товаров
const getMockProduct = (slug: string) => {
  const productMap: Record<string, any> = {
    'monument-1': {
      slug: 'monument-1',
      name: 'Памятник из гранита',
      price: 25000,
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
      ],
      description: `# Памятник из гранита

Качественный памятник из натурального гранита с долговечной обработкой.

## Особенности:
- Натуральный гранит высшего качества
- Долговечность более 100 лет
- Классический дизайн
- Устойчивость к погодным условиям

## Характеристики:
| Параметр | Значение |
|----------|----------|
| Материал | Гранит |
| Высота | 120 см |
| Ширина | 60 см |
| Толщина | 8 см |

**Гарантия качества и долговечности!**`,
      inStock: true,
      variants: [
        { id: 1, name: '120x60 см', price: 25000, stock: 10 },
        { id: 2, name: '140x70 см', price: 32000, stock: 5 },
        { id: 3, name: '160x80 см', price: 45000, stock: 3 },
      ],
    },
  }

  // Изображения для разных типов товаров
  const getProductImages = (productName: string) => {
    const imageMap: Record<string, string[]> = {
      'Памятник': [
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
      ],
      'Резной': [
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
      ],
      'Плита': [
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
      ],
      'Ваза': [
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
      ],
      'Крошка': [
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
      ],
      'Гранит': [
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=800&fit=crop&q=80',
      ],
    }

    // Определяем тип товара по названию
    let imageType = 'Памятник'
    if (productName.includes('Резной')) imageType = 'Резной'
    else if (productName.includes('Плита')) imageType = 'Плита'
    else if (productName.includes('Ваза')) imageType = 'Ваза'
    else if (productName.includes('Крошка')) imageType = 'Крошка'
    else if (productName.includes('Гранит')) imageType = 'Гранит'

    return imageMap[imageType] || imageMap['Памятник']
  }

  return productMap[slug] || {
    slug,
    name: `Памятник ${slug}`,
    price: 25000,
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
    images: getProductImages(`Памятник ${slug}`),
    description: `# Описание товара

Качественный ритуальный товар из натуральных материалов.

## Особенности:
- Высокое качество материалов
- Долговечность использования
- Классический дизайн

## Характеристики:
| Параметр | Значение |
|----------|----------|
| Материал | Гранит/Мрамор |
| Размер | Стандартный |

**Гарантия качества!**`,
    inStock: true,
    variants: [
      { id: 1, name: 'Стандарт', price: 25000, stock: 10 },
      { id: 2, name: 'Увеличенный', price: 35000, stock: 5 },
    ],
  }
}

export default function Product() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { BackButton, MainButton } = useTelegram()
  const { addToCart, updateQuantity, items: cartItems, isAddingToCart, isUpdatingQuantity } = useCart()
  const analytics = useTelegramAnalytics()
  const { shouldReduceMotion } = useReducedMotion()
  const [showGallery, setShowGallery] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null) // Цена выбранного варианта
  // isAddingToCart из useCart используется для блокировки кнопки во время мутации
  const [showCalculationForm, setShowCalculationForm] = useState(false)
  const [calculationData, setCalculationData] = useState({
    name: '',
    phone: '',
    city: '',
  })
  const [isSubmittingCalculation, setIsSubmittingCalculation] = useState(false)
  const stickyButtonRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1])
  
  // Загрузка товара из API
  const { data: productData, isLoading: isLoadingProduct, error: productError } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) return null
      const { data } = await axios.get(`${API_URL}/products/slug/${slug}`)
      return data
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // Кэш на 5 минут
  })

  // Используем данные из API или fallback на моковые данные
  const product = productData || (slug ? getMockProduct(slug) : null)

  // Мемоизированное вычисление текущей цены (должно быть определено до использования)
  const currentPrice = useMemo(() => {
    if (!product) return 0
    
    // Если есть выбранная цена из селектора вариантов, используем её
    if (selectedPrice !== null) return selectedPrice
    
    // Если есть выбранный вариант, используем его цену
    if (selectedVariant && product.variants) {
      const variant = product.variants.find((v: any) => v.id === selectedVariant)
      if (variant) return variant.price
    }
    
    // Если есть варианты, берем минимальную цену
    if (product.variants && product.variants.length > 0) {
      const activeVariants = product.variants.filter((v: any) => v.isActive !== false)
      if (activeVariants.length > 0) {
        return Math.min(...activeVariants.map((v: any) => v.price))
      }
    }
    
    // Используем базовую цену или цену из продукта
    return product.basePrice || product.price || 0
  }, [product, selectedPrice, selectedVariant])

  // Вычисляем количество товара в корзине из хука useCart
  const cartQuantity = useMemo(() => {
    if (!product) return 0
    
    const cartItem = cartItems.find((item) => {
      const matchesProduct = item.product.id === product.id || item.product.slug === product.slug
      const matchesVariant = selectedVariant 
        ? item.variantId === selectedVariant 
        : !item.variantId
      return matchesProduct && matchesVariant
    })
    
    return cartItem?.quantity || 0
  }, [cartItems, product, selectedVariant])

  // Track product view
  useEffect(() => {
    if (product && product.id) {
      analytics.trackProductView(product.id, product.slug, {
        name: product.name,
        price: currentPrice,
        material: product.material,
        category: product.category?.name,
      })
    }
  }, [product, analytics, currentPrice])

  useEffect(() => {
    // Проверяем поддержку BackButton перед использованием
    if (BackButton && typeof BackButton.show === 'function') {
      try {
        BackButton.show()
        const handlerId = BackButton.onClick(() => {
          navigate(-1)
        }, 'product-back')

        return () => {
          if (BackButton && typeof BackButton.hide === 'function') {
            try {
              BackButton.hide()
              BackButton.offClick(handlerId)
            } catch (error) {
              // Игнорируем ошибки при очистке
            }
          }
          if (MainButton && typeof MainButton.hide === 'function') {
            MainButton.hide()
            MainButton.clearHandlers()
          }
        }
      } catch (error) {
        // BackButton не поддерживается в этой версии Telegram
        console.debug('BackButton not supported:', error)
      }
    }

    return () => {
      if (BackButton && typeof BackButton.hide === 'function') {
        try {
          BackButton.hide()
          BackButton.clearHandlers()
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      }
      if (MainButton && typeof MainButton.hide === 'function') {
        MainButton.hide()
        MainButton.clearHandlers()
      }
    }
  }, [BackButton, MainButton, navigate])

  // Оптимизированный обработчик добавления в корзину
  // Использует isAddingToCart из useCart для блокировки множественных кликов
  const handleAddToCart = useCallback(() => {
    debugLog.action('👆 handleAddToCart called', { 
      productId: product?.id, 
      productName: product?.name,
      isAddingToCart,
      selectedVariant,
      selectedPrice,
      currentCartQuantity: cartQuantity
    })
    
    // Блокируем если нет товара или идёт добавление
    if (!product || isAddingToCart) {
      debugLog.warn('handleAddToCart blocked', { noProduct: !product, isAddingToCart })
      return
    }
    
    // Определяем вариант для добавления
    // Если вариант не выбран, но товар имеет варианты - берем первый активный
    let variantToUse = selectedVariant
    let priceToUse = selectedPrice
    let variantName: string | undefined
    
    if (!variantToUse && product.variants && product.variants.length > 0) {
      // Берем первый активный вариант
      const firstActiveVariant = product.variants.find((v: any) => v.isActive !== false)
      if (firstActiveVariant) {
        variantToUse = firstActiveVariant.id
        priceToUse = firstActiveVariant.price
        variantName = firstActiveVariant.name
        debugLog.info('Auto-selected first variant', { variantId: variantToUse, price: priceToUse })
        // Обновляем состояние для корректного отображения
        setSelectedVariant(firstActiveVariant.id)
        setSelectedPrice(firstActiveVariant.price)
      }
    } else if (variantToUse) {
      variantName = product.variants?.find((v: any) => v.id === variantToUse)?.name
    }
    
    // Если всё ещё нет цены, используем базовую
    if (!priceToUse) {
      priceToUse = product.basePrice || currentPrice || 0
    }
    
    debugLog.info('Calling addToCart with params', {
      productId: product.id,
      variantId: variantToUse,
      quantity: 1,
      price: priceToUse
    })
    
    // Track add to cart
    analytics.trackAddToCart(product.id, 1, {
      variantId: variantToUse,
      price: priceToUse,
      productSlug: product.slug,
    })
    
    // Используем хук useCart для добавления (quantity всегда 1!)
    addToCart(product.id, {
      variantId: variantToUse || undefined,
      quantity: 1,
      productSlug: product.slug,
      productName: product.name,
      productPrice: product.basePrice || priceToUse || 0,
      variantPrice: variantToUse && priceToUse ? priceToUse : undefined,
      variantName: variantName,
      imageUrl: product.media?.[0]?.url || product.images?.[0],
    })
  }, [product, isAddingToCart, selectedVariant, selectedPrice, currentPrice, addToCart, analytics, cartQuantity])

  // Удаление товара из корзины (уменьшение количества на 1)
  const handleRemoveFromCart = () => {
    if (!product || cartQuantity <= 0 || isUpdatingQuantity) return
    
    // Находим элемент корзины
    const cartItem = cartItems.find((item) => {
      const matchesProduct = item.product.id === product.id || item.product.slug === product.slug
      const matchesVariant = selectedVariant 
        ? item.variantId === selectedVariant 
        : true // Если вариант не выбран, берём первый подходящий
      return matchesProduct && matchesVariant
    })
    
    if (cartItem) {
      // Используем updateQuantity для уменьшения количества на 1
      updateQuantity(cartItem.id, -1)
    }
  }

  // Преобразуем изображения из media
  const productImages = product?.media?.length > 0
    ? product.media.map((m: any) => m.url)
    : product?.images?.length > 0
    ? product.images
    : product?.image
    ? [product.image]
    : [PLACEHOLDER_IMAGE]

  if (isLoadingProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          {/* Premium loading spinner */}
          <div className="relative w-14 h-14">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(139, 107, 63, 0.5) 40%, transparent 80%)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />
            <div 
              className="absolute inset-[3px] rounded-full"
              style={{ background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)' }}
            />
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="w-2 h-2 rounded-full bg-bronze-500/60" />
            </motion.div>
          </div>
          
          <motion.p 
            className="text-sm font-body text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Загрузка товара...
          </motion.p>
        </div>
      </div>
    )
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div 
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 107, 63, 0.1) 0%, rgba(139, 107, 63, 0.05) 100%)',
              border: '1px solid rgba(139, 107, 63, 0.2)',
            }}
          >
            <span className="text-3xl">📦</span>
          </div>
          <p className="text-gray-600 mb-6 font-body">Товар не найден</p>
          <motion.button
            onClick={() => navigate(-1)}
            className="granite-button px-6 py-3 rounded-xl font-body font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Вернуться назад
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      {/* Используем Telegram BackButton вместо кастомной кнопки */}
      <div className="h-2" />

      {/* Product Image - гранитный стиль */}
      <div className="px-4 pb-4">
        <StoneCard padding={false} className="overflow-hidden cursor-pointer" onClick={() => setShowGallery(true)}>
          <div className="aspect-square bg-gray-100 relative">
            {productImages && productImages.length > 0 ? (
              <>
                <OptimizedImage
                  src={productImages[selectedImageIndex]}
                  alt={product.name}
                  aspectRatio={1}
                  size="medium"
                  sizes="100vw"
                  className="w-full h-full"
                  objectFit="cover"
                  placeholder="blur"
                  priority={selectedImageIndex === 0}
                />
                {productImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                    {productImages.map((_: string, index: number) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedImageIndex(index)
                        }}
                        className={`h-2 rounded-full transition-all duration-200 ${
                          index === selectedImageIndex 
                            ? 'bg-bronze-500 w-8 shadow-lg' 
                            : 'bg-white/60 w-2 hover:bg-white/80'
                        }`}
                        style={{
                          boxShadow: index === selectedImageIndex 
                            ? '0 2px 4px rgba(139, 107, 63, 0.4)' 
                            : 'none'
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl bg-gray-100">
                📦
              </div>
            )}
          </div>
        </StoneCard>
      </div>

      {showGallery && productImages && productImages.length > 0 && (
        <ProductImageGallery
          images={productImages}
          onClose={() => setShowGallery(false)}
        />
      )}

      <div className="px-4 space-y-4 pb-32">
        {/* Product Title & Price */}
        <motion.div
          variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          <h1 className="text-3xl font-inscription text-gray-900">
            {product.name}
          </h1>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-inscription text-gray-900">
              {currentPrice.toLocaleString('ru-RU')}
            </p>
            <span className="text-xl font-body text-gray-600">₽</span>
          </div>
        </motion.div>

        {/* Variant Selection - используем ProductVariantSelector для правильного отображения атрибутов */}
        {product.attributes && product.attributes.length > 0 ? (
          <motion.div
            variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
            initial="hidden"
            animate="visible"
          >
            <StoneCard>
              <ProductVariantSelector
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  productType: product.productType,
                  basePrice: product.basePrice,
                  price: currentPrice,
                  attributes: product.attributes?.map((attr: any) => ({
                    id: attr.id,
                    name: attr.name,
                    slug: attr.slug,
                    values: attr.values?.map((val: any) => ({
                      id: val.id,
                      value: val.value,
                      displayName: val.displayName,
                    })) || [],
                  })) || [],
                  variants: product.variants || [],
                }}
                onPriceChange={(price) => {
                  // Обновляем выбранную цену при изменении варианта
                  setSelectedPrice(price)
                }}
                onAddToCart={(variantId, selectedAttrs) => {
                  // Обновляем выбранный вариант (добавление в корзину через sticky footer)
                  setSelectedVariant(variantId)
                  
                  // Находим вариант для получения цены
                  const variant = variantId 
                    ? product.variants?.find((v: any) => v.id === variantId)
                    : null
                  
                  if (variant?.price) {
                    setSelectedPrice(variant.price)
                  }
                }}
              />
            </StoneCard>
          </motion.div>
        ) : product.variants && product.variants.length > 0 ? (
          // Fallback для старых товаров без атрибутов
          <motion.div
            variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
            initial="hidden"
            animate="visible"
          >
            <StoneCard>
              <div className="space-y-4">
                <h3 className="font-inscription text-lg text-gray-900">Вариант</h3>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((variant: any) => {
                    const isSelected = selectedVariant === variant.id
                    return (
                      <motion.button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant.id)}
                        className={`relative px-5 py-3 rounded-lg font-body font-medium transition-all duration-200 ${isSelected ? 'granite-button' : ''}`}
                        whileHover={shouldReduceMotion ? undefined : { scale: 1.05, y: -2 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                        transition={getTransition(shouldReduceMotion, 'fast')}
                        style={{
                          background: isSelected ? undefined : 'transparent',
                          color: isSelected ? '#E5E7EB' : '#374151',
                          border: isSelected ? undefined : '1px solid rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected && <Check className="w-4 h-4" />}
                          <span>{variant.name || `Вариант ${variant.id}`}</span>
                          <span className="text-sm opacity-80">
                            {variant.price.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </StoneCard>
          </motion.div>
        ) : null}


        {/* Specifications */}
        {(() => {
          // Парсим specifications если это строка JSON
          let specs = product.specifications
          if (typeof specs === 'string') {
            try {
              specs = JSON.parse(specs)
            } catch {
              specs = {}
            }
          }
          return specs && typeof specs === 'object' && Object.keys(specs).length > 0 ? (
            <motion.div
              variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
              initial="hidden"
              animate="visible"
            >
              <StoneCard>
                <div className="p-4">
                  <ProductSpecifications specifications={specs} />
                </div>
              </StoneCard>
            </motion.div>
          ) : null
        })()}

        {/* Description with Markdown - гранитный стиль */}
        {product.description && (
          <motion.div
            variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
            initial="hidden"
            animate="visible"
          >
            <StoneCard>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {product.description}
                </ReactMarkdown>
              </div>
            </StoneCard>
          </motion.div>
        )}

        {/* Calculation Form Button */}
        <motion.div
          variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
          initial="hidden"
          animate="visible"
        >
          <motion.button
            onClick={() => setShowCalculationForm(true)}
            className="granite-button w-full py-4 rounded-lg font-body font-semibold flex items-center justify-center gap-2"
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            transition={getTransition(shouldReduceMotion, 'fast')}
          >
            <Calculator className="w-5 h-5" />
            <span>Сделать расчет</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Calculation Form Modal */}
      <AnimatePresence mode="wait" initial={false}>
        {showCalculationForm && (
          <>
            <motion.div
              variants={getAnimationVariants(shouldReduceMotion, 'fadeIn')}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowCalculationForm(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl safe-area-bottom"
              style={{ maxHeight: '90vh' }}
            >
              <div className="p-6 overflow-y-auto" style={{ maxHeight: '90vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-inscription text-gray-900">Расчет стоимости</h2>
                  <button
                    onClick={() => setShowCalculationForm(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="font-body text-sm text-gray-600 mb-1">Товар</p>
                  <p className="font-inscription text-lg text-gray-900">{product.name}</p>
                  <p className="font-body text-base text-gray-700 mt-1">
                    {currentPrice.toLocaleString('ru-RU')} ₽
                  </p>
                </div>

                {/* Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setIsSubmittingCalculation(true)
                    try {
                      // Отправка данных расчета на сервер
                      await axios.post(`${API_URL}/products/${product.slug}/calculation-request`, {
                        name: calculationData.name,
                        phone: calculationData.phone,
                        city: calculationData.city,
                        productId: product.id,
                        variantId: selectedVariant,
                        price: currentPrice,
                      })
                      // Очистка формы
                      setCalculationData({ name: '', phone: '', city: '' })
                      setShowCalculationForm(false)
                      // Можно показать уведомление об успехе
                    } catch (error) {
                      console.error('Ошибка отправки расчета:', error)
                      // Можно показать ошибку пользователю
                    } finally {
                      setIsSubmittingCalculation(false)
                    }
                  }}
                  className="space-y-4"
                >
                  {/* Имя */}
                  <div>
                    <label className="block mb-2 font-body text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Имя</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      required
                      value={calculationData.name}
                      onChange={(e) => setCalculationData({ ...calculationData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bronze-500/30 focus:border-bronze-500/50 transition-colors"
                      placeholder="Введите ваше имя"
                    />
                  </div>

                  {/* Телефон */}
                  <div>
                    <label className="block mb-2 font-body text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>Номер телефона</span>
                      </div>
                    </label>
                    <input
                      type="tel"
                      required
                      value={calculationData.phone}
                      onChange={(e) => setCalculationData({ ...calculationData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bronze-500/30 focus:border-bronze-500/50 transition-colors"
                      placeholder="+7 (999) 123-45-67"
                      style={{ color: '#000' }}
                    />
                  </div>

                  {/* Город */}
                  <div>
                    <label className="block mb-2 font-body text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>Город</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      required
                      value={calculationData.city}
                      onChange={(e) => setCalculationData({ ...calculationData, city: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bronze-500/30 focus:border-bronze-500/50 transition-colors"
                      placeholder="Введите город"
                    />
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isSubmittingCalculation}
                    className="granite-button w-full py-4 rounded-lg font-body font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={shouldReduceMotion || isSubmittingCalculation ? undefined : { scale: 1.02 }}
                    whileTap={shouldReduceMotion || isSubmittingCalculation ? undefined : { scale: 0.98 }}
                    transition={getTransition(shouldReduceMotion, 'fast')}
                  >
                    <Calculator className="w-5 h-5" />
                    <span>{isSubmittingCalculation ? 'Отправка...' : 'Отправить запрос'}</span>
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sticky Cart Controls - дизайн как на скриншоте */}
      <motion.div
        ref={stickyButtonRef}
        style={{ opacity }}
        className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom bg-gradient-to-b from-gray-100/50 via-gray-50 to-white border-t border-gray-200/50 p-4"
      >
        <div className="max-w-md mx-auto space-y-3">
          {/* Верхняя строка: Цена слева, Селектор количества справа */}
          <div className="flex items-center justify-between">
            {/* Цена */}
            <div className="flex items-baseline gap-1">
              <p className="text-xl font-inscription text-gray-900">
                {currentPrice.toLocaleString('ru-RU')}
              </p>
              <span className="text-base font-body text-gray-600">₽</span>
            </div>

            {/* Quantity Selector - в рамке как на скриншоте */}
            <div 
              className="flex items-center rounded-lg border"
              style={{
                background: 'rgba(0, 0, 0, 0.02)',
                borderColor: 'rgba(0, 0, 0, 0.1)',
              }}
            >
              <motion.button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleRemoveFromCart()
                }}
                disabled={isAddingToCart || cartQuantity <= 0}
                className="px-3 py-2 flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed border-r"
                style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}
                whileHover={shouldReduceMotion || cartQuantity <= 0 || isAddingToCart ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion || cartQuantity <= 0 || isAddingToCart ? undefined : { scale: 0.95 }}
                transition={getTransition(shouldReduceMotion, 'fast')}
              >
                <Minus className={`w-4 h-4 ${cartQuantity > 0 ? 'text-gray-900' : 'text-gray-400'}`} />
              </motion.button>
              {!shouldReduceMotion ? (
                <motion.div
                  key={cartQuantity}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={getTransition(shouldReduceMotion, 'fast')}
                  className="px-4 py-2 min-w-[40px] text-center border-r"
                  style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <span className={`text-base font-inscription ${cartQuantity > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {cartQuantity || 0}
                  </span>
                </motion.div>
              ) : (
                <div className="px-4 py-2 min-w-[40px] text-center border-r" style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}>
                  <span className={`text-base font-inscription ${cartQuantity > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {cartQuantity || 0}
                  </span>
                </div>
              )}
              <motion.button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="px-3 py-2 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={shouldReduceMotion || isAddingToCart ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion || isAddingToCart ? undefined : { scale: 0.95 }}
                transition={getTransition(shouldReduceMotion, 'fast')}
              >
                <Plus className="w-4 h-4 text-gray-900" />
              </motion.button>
            </div>
          </div>

          {/* Нижняя строка: Кнопка "Перейти в корзину" на всю ширину */}
          {cartQuantity > 0 ? (
            <motion.button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                navigate('/cart')
              }}
              className="granite-button w-full py-3 rounded-lg font-body font-semibold flex items-center justify-center gap-2"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              transition={getTransition(shouldReduceMotion, 'fast')}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Перейти в корзину</span>
            </motion.button>
          ) : (
            <motion.button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAddToCart()
              }}
              disabled={isAddingToCart}
              className="granite-button w-full py-3 rounded-lg font-body font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={shouldReduceMotion || isAddingToCart ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceMotion || isAddingToCart ? undefined : { scale: 0.98 }}
              transition={getTransition(shouldReduceMotion, 'fast')}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>В корзину</span>
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

