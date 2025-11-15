import { useParams, useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { ArrowLeft, ShoppingCart, Plus, Minus, Check, Calculator, Truck, MapPin, User, Phone } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import ProductImageGallery from '../components/ProductImageGallery'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import axios from 'axios'

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
})

// Перехватываем ошибки и обновляем флаг доступности
silentAxios.interceptors.response.use(
  (response) => {
    setApiAvailable(true)
    return response
  },
  (error) => {
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
  const [cartQuantity, setCartQuantity] = useState(0) // Количество товара в корзине
  const [showGallery, setShowGallery] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
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
  
  const product = slug ? getMockProduct(slug) : null

  // Загрузка количества товара в корзине
  useEffect(() => {
    const loadCartQuantity = async () => {
      if (!product) return
      
      // Пропускаем запрос только если API точно недоступен (после первой ошибки)
      const apiAvailable = getApiAvailable()
      if (!apiAvailable) {
        // API недоступен - используем локальное состояние из sessionStorage
        try {
          const cartData = sessionStorage.getItem(`cart_${product.slug}_${selectedVariant || 'default'}`)
          if (cartData) {
            const parsed = JSON.parse(cartData)
            setCartQuantity(parsed.quantity || 0)
            return
          }
        } catch {
          // Игнорируем ошибки парсинга
        }
        setCartQuantity(0)
        return
      }
      
      try {
        const response = await silentAxios.get(`${API_URL}/cart`)
        const items = response.data?.items || []
        // Находим товар в корзине по slug и variant
        const cartItem = items.find((item: any) => {
          const matchesSlug = item.product?.slug === product.slug || item.slug === product.slug
          const matchesVariant = selectedVariant 
            ? item.variantId === selectedVariant 
            : !item.variantId
          return matchesSlug && matchesVariant
        })
        const quantity = cartItem?.quantity || 0
        setCartQuantity(quantity)
        // Сохраняем в sessionStorage для офлайн режима
        try {
          sessionStorage.setItem(`cart_${product.slug}_${selectedVariant || 'default'}`, JSON.stringify({ quantity }))
        } catch {
          // Игнорируем ошибки sessionStorage
        }
      } catch (error: any) {
        // Тихая обработка сетевых ошибок (API может быть не запущен)
        const isNetworkError = error?.isNetworkError || error?.silent ||
                              error?.code === 'ERR_NETWORK' || 
                              error?.code === 'ERR_CONNECTION_REFUSED' ||
                              error?.code === 'ECONNABORTED' ||
                              error?.message?.includes('Network Error') ||
                              error?.message?.includes('ERR_CONNECTION_REFUSED') ||
                              error?.message === 'Network error'
        
        // Не логируем сетевые ошибки
        if (!isNetworkError) {
          console.error('Error loading cart quantity:', error)
        }
        // Пытаемся загрузить из sessionStorage
        try {
          const cartData = sessionStorage.getItem(`cart_${product.slug}_${selectedVariant || 'default'}`)
          if (cartData) {
            const parsed = JSON.parse(cartData)
            setCartQuantity(parsed.quantity || 0)
          } else {
            setCartQuantity(0)
          }
        } catch {
          setCartQuantity(0)
        }
      }
    }
    loadCartQuantity()
  }, [product, selectedVariant])

  useEffect(() => {
    BackButton.show()
    BackButton.onClick(() => {
      navigate(-1)
    })

    return () => {
      BackButton.hide()
      BackButton.offClick(() => {})
      MainButton.hide()
      MainButton.offClick(() => {})
    }
  }, [BackButton, MainButton, navigate])

  // Добавление товара в корзину
  const handleAddToCart = async () => {
    if (!product || isUpdatingCart) return
    
    // Сразу обновляем локальное состояние для мгновенной обратной связи
    setCartQuantity((prev) => {
      const newQuantity = prev + 1
      // Сохраняем в sessionStorage для офлайн режима
      try {
        sessionStorage.setItem(`cart_${product.slug}_${selectedVariant || 'default'}`, JSON.stringify({ quantity: newQuantity }))
      } catch {
        // Игнорируем ошибки sessionStorage
      }
      return newQuantity
    })
    
    // Если API недоступен, работаем только с локальным состоянием
    const apiAvailable = getApiAvailable()
    if (!apiAvailable) {
      return
    }
    
    setIsUpdatingCart(true)
    try {
      await silentAxios.post(`${API_URL}/cart/add`, {
        productId: product.slug,
        variantId: selectedVariant,
        quantity: 1,
      })
      // Успешно добавлено - состояние уже обновлено
    } catch (error: any) {
      // Если API недоступен, состояние уже обновлено локально
      const isNetworkError = error?.isNetworkError || error?.silent ||
                            error?.code === 'ERR_NETWORK' || 
                            error?.code === 'ERR_CONNECTION_REFUSED' ||
                            error?.code === 'ECONNABORTED' ||
                            error?.message?.includes('Network Error') ||
                            error?.message?.includes('ERR_CONNECTION_REFUSED') ||
                            error?.message === 'Network error'
      if (!isNetworkError) {
        // Откатываем изменение при не-сетевой ошибке
        setCartQuantity((prev) => {
          const newQuantity = Math.max(0, prev - 1)
          try {
            sessionStorage.setItem(`cart_${product.slug}_${selectedVariant || 'default'}`, JSON.stringify({ quantity: newQuantity }))
          } catch {
            // Игнорируем ошибки sessionStorage
          }
          return newQuantity
        })
        console.error('Error adding to cart:', error)
      }
    } finally {
      setIsUpdatingCart(false)
    }
  }

  // Удаление товара из корзины
  const handleRemoveFromCart = async () => {
    if (!product || cartQuantity <= 0 || isUpdatingCart) return
    
    // Сразу обновляем локальное состояние для мгновенной обратной связи
    setCartQuantity((prev) => {
      const newQuantity = Math.max(0, prev - 1)
      // Сохраняем в sessionStorage для офлайн режима
      try {
        sessionStorage.setItem(`cart_${product.slug}_${selectedVariant || 'default'}`, JSON.stringify({ quantity: newQuantity }))
      } catch {
        // Игнорируем ошибки sessionStorage
      }
      return newQuantity
    })
    
    // Если API недоступен, работаем только с локальным состоянием
    const apiAvailable = getApiAvailable()
    if (!apiAvailable) {
      return
    }
    
    setIsUpdatingCart(true)
    try {
      await silentAxios.post(`${API_URL}/cart/remove`, {
        productId: product.slug,
        variantId: selectedVariant,
        quantity: 1,
      })
      // Успешно удалено - состояние уже обновлено
    } catch (error: any) {
      // Если API недоступен, состояние уже обновлено локально
      const isNetworkError = error?.isNetworkError || error?.silent ||
                            error?.code === 'ERR_NETWORK' || 
                            error?.code === 'ERR_CONNECTION_REFUSED' ||
                            error?.code === 'ECONNABORTED' ||
                            error?.message?.includes('Network Error') ||
                            error?.message?.includes('ERR_CONNECTION_REFUSED') ||
                            error?.message === 'Network error'
      if (!isNetworkError) {
        // Откатываем изменение при не-сетевой ошибке
        setCartQuantity((prev) => {
          const newQuantity = prev + 1
          try {
            sessionStorage.setItem(`cart_${product.slug}_${selectedVariant || 'default'}`, JSON.stringify({ quantity: newQuantity }))
          } catch {
            // Игнорируем ошибки sessionStorage
          }
          return newQuantity
        })
        console.error('Error removing from cart:', error)
      }
    } finally {
      setIsUpdatingCart(false)
    }
  }

  const currentPrice = selectedVariant
    ? product?.variants?.find((v: any) => v.id === selectedVariant)?.price || product?.price || 0
    : product?.price || 0

  if (!product) {
    return <div>Товар не найден</div>
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
            {product.images && product.images.length > 0 ? (
              <>
                <img
                  src={product.images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback на placeholder при ошибке загрузки
                    const target = e.target as HTMLImageElement
                    target.src = `https://via.placeholder.com/400/cccccc/666666?text=${encodeURIComponent(product.name)}`
                  }}
                />
                {product.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                    {product.images.map((_: string, index: number) => (
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

      {showGallery && product.images && (
        <ProductImageGallery
          images={product.images}
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

        {/* Variant Selection - гранитный стиль */}
        {product.variants && product.variants.length > 0 && (
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
                          <span>{variant.name}</span>
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
        )}


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

        {/* Delivery Information - гранитный стиль */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <StoneCard>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-gray-700" />
                <h3 className="font-inscription text-lg text-gray-900">Условия доставки</h3>
              </div>
              <div className="space-y-2 text-sm font-body text-gray-700">
                <p>• Доставка по городу: от 1 500 ₽</p>
                <p>• Доставка в регионы: рассчитывается индивидуально</p>
                <p>• Срок доставки: 3-7 рабочих дней</p>
                <p>• Установка: по договоренности</p>
              </div>
            </div>
          </StoneCard>
        </motion.div>

        {/* Calculation Form Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
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
                    // Здесь будет отправка данных на сервер
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                    setIsSubmittingCalculation(false)
                    setShowCalculationForm(false)
                    // Можно показать уведомление об успешной отправке
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
                        <span>Город (для расчета доставки)</span>
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

