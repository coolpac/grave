import { useParams, useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { useCart } from '../hooks/useCart'
import { ArrowLeft, ShoppingCart, Plus, Minus, Check, Calculator, Truck, MapPin, User, Phone } from 'lucide-react'
import { useEffect, useState, useRef, useMemo } from 'react'
import ProductImageGallery from '../components/ProductImageGallery'
import ProductSpecifications from '../components/ProductSpecifications'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import ProductVariantSelector from '../components/product/ProductVariantSelector'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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
  const { addToCart, updateQuantity, items: cartItems } = useCart()
  const [showGallery, setShowGallery] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null) // Цена выбранного варианта
  const [isUpdatingCart, setIsUpdatingCart] = useState(false)
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

  useEffect(() => {
    // Проверяем поддержку BackButton перед использованием
    if (BackButton && typeof BackButton.show === 'function') {
      try {
        BackButton.show()
        BackButton.onClick(() => {
          navigate(-1)
        })
      } catch (error) {
        // BackButton не поддерживается в этой версии Telegram
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
      if (MainButton && typeof MainButton.hide === 'function') {
        MainButton.hide()
        MainButton.offClick(() => {})
      }
    }
  }, [BackButton, MainButton, navigate])

  // Добавление товара в корзину
  const handleAddToCart = () => {
    if (!product || isUpdatingCart) return
    
    setIsUpdatingCart(true)
    
    // Определяем цену: если есть вариант, используем его цену, иначе базовую цену продукта
    const priceToUse = selectedVariant && selectedPrice 
      ? selectedPrice 
      : (product.basePrice || currentPrice || 0)
    
    // Используем хук useCart для добавления
    addToCart(product.id, {
      variantId: selectedVariant || undefined,
      quantity: 1,
      productSlug: product.slug,
      productName: product.name,
      productPrice: product.basePrice || priceToUse || 0, // Убеждаемся, что цена есть
      variantPrice: selectedVariant && selectedPrice ? selectedPrice : undefined,
      variantName: product.variants?.find((v: any) => v.id === selectedVariant)?.name,
      imageUrl: product.media?.[0]?.url || product.images?.[0],
    })
    
    // Сбрасываем флаг обновления через небольшую задержку для UX
    setTimeout(() => setIsUpdatingCart(false), 300)
  }

  // Удаление товара из корзины (уменьшение количества на 1)
  const handleRemoveFromCart = () => {
    if (!product || cartQuantity <= 0 || isUpdatingCart) return
    
    // Находим элемент корзины
    const cartItem = cartItems.find((item) => {
      const matchesProduct = item.product.id === product.id || item.product.slug === product.slug
      const matchesVariant = selectedVariant 
        ? item.variantId === selectedVariant 
        : !item.variantId
      return matchesProduct && matchesVariant
    })
    
    if (cartItem) {
      setIsUpdatingCart(true)
      // Используем updateQuantity для уменьшения количества на 1
      updateQuantity(cartItem.id, -1)
      setTimeout(() => setIsUpdatingCart(false), 300)
    }
  }

  // Определяем текущую цену (используем selectedPrice если есть, иначе вычисляем)
  const currentPrice = (() => {
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
  })()

  // Преобразуем изображения из media
  const productImages = product?.media?.map((m: any) => m.url) || 
                        product?.images || 
                        (product?.image ? [product.image] : [])

  if (isLoadingProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-bronze-500 mb-4" />
          <p className="text-gray-600">Загрузка товара...</p>
        </div>
      </div>
    )
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Товар не найден</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-bronze-500 text-white rounded-lg"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header with Back Button */}
      <div className="px-4 pt-4 pb-2">
        <motion.button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-lg transition-all duration-200 shadow-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
            boxShadow: `
              inset 0 2px 4px rgba(255, 255, 255, 0.1),
              inset 0 -2px 4px rgba(0, 0, 0, 0.5),
              inset 2px 0 2px rgba(255, 255, 255, 0.08),
              inset -2px 0 2px rgba(0, 0, 0, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.3)
            `,
            border: '1px solid rgba(139, 107, 63, 0.3)',
          }}
        >
          <ArrowLeft className="w-5 h-5 text-gray-200" />
        </motion.button>
      </div>

      {/* Product Image - гранитный стиль */}
      <div className="px-4 pb-4">
        <StoneCard padding={false} className="overflow-hidden cursor-pointer" onClick={() => setShowGallery(true)}>
          <div className="aspect-square bg-gray-100 relative">
            {productImages && productImages.length > 0 ? (
              <>
                <img
                  src={productImages[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback на placeholder при ошибке загрузки
                    const target = e.target as HTMLImageElement
                    target.src = `https://via.placeholder.com/400/cccccc/666666?text=${encodeURIComponent(product.name)}`
                  }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
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
                  setSelectedVariant(variantId)
                  // Находим вариант для получения цены
                  const variant = variantId 
                    ? product.variants?.find((v: any) => v.id === variantId)
                    : null
                  
                  // Добавляем товар в корзину при выборе варианта
                  if (product) {
                    addToCart(product.id, {
                      variantId: variantId || undefined,
                      quantity: 1,
                      productSlug: product.slug,
                      productName: product.name,
                      productPrice: product.basePrice,
                      variantPrice: variant?.price || selectedPrice || undefined,
                      variantName: variant?.name,
                      imageUrl: product.media?.[0]?.url || product.images?.[0],
                    })
                  }
                }}
              />
            </StoneCard>
          </motion.div>
        ) : product.variants && product.variants.length > 0 ? (
          // Fallback для старых товаров без атрибутов
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
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
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <motion.button
            onClick={() => setShowCalculationForm(true)}
            className="granite-button w-full py-4 rounded-lg font-body font-semibold flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Calculator className="w-5 h-5" />
            <span>Сделать расчет</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Calculation Form Modal */}
      <AnimatePresence>
        {showCalculationForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCalculationForm(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
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
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
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
                    whileHover={{ scale: isSubmittingCalculation ? 1 : 1.02 }}
                    whileTap={{ scale: isSubmittingCalculation ? 1 : 0.98 }}
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
                disabled={isUpdatingCart || cartQuantity <= 0}
                className="px-3 py-2 flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed border-r"
                style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}
                whileHover={{ scale: cartQuantity > 0 && !isUpdatingCart ? 1.05 : 1 }}
                whileTap={{ scale: cartQuantity > 0 && !isUpdatingCart ? 0.95 : 1 }}
              >
                <Minus className={`w-4 h-4 ${cartQuantity > 0 ? 'text-gray-900' : 'text-gray-400'}`} />
              </motion.button>
              <motion.div
                key={cartQuantity}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="px-4 py-2 min-w-[40px] text-center border-r"
                style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}
              >
                <span className={`text-base font-inscription ${cartQuantity > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                  {cartQuantity || 0}
                </span>
              </motion.div>
              <motion.button
                onClick={handleAddToCart}
                disabled={isUpdatingCart}
                className="px-3 py-2 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: !isUpdatingCart ? 1.05 : 1 }}
                whileTap={{ scale: !isUpdatingCart ? 0.95 : 1 }}
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
              disabled={isUpdatingCart}
              className="granite-button w-full py-3 rounded-lg font-body font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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

