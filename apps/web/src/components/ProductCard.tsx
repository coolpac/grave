import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useRef, useMemo, useCallback, memo } from 'react'
import OptimizedImage from './OptimizedImage'
import { PLACEHOLDER_IMAGE } from '../utils/constants'
import { usePrefetch } from '../hooks/usePrefetch'
import { useStableCallback } from '../hooks/useStableCallback'
import { useRenderCount } from '../hooks/useRenderCount'

interface ProductCardProps {
  product: {
    id?: number
    slug: string
    name: string
    price: number
    image?: string
    images?: string[]
    options?: string
    productType?: string
    variants?: any[]
    attributes?: any[]
    material?: string
  }
  index?: number
  onAddToCart?: (product: any, position: { x: number; y: number }) => void
}

/**
 * Оптимизированная карточка товара с React.memo и мемоизацией
 * 
 * Оптимизации:
 * - React.memo для предотвращения лишних ре-рендеров
 * - useMemo для вычисления imageUrl
 * - useCallback для event handlers
 */
function ProductCard({ product, index = 0, onAddToCart }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { prefetchProduct } = usePrefetch()
  
  // Отслеживание рендеров (только в development)
  useRenderCount('ProductCard', false)

  // Мемоизированный URL изображения
  const imageUrl = useMemo(
    () => product.images?.[0] || product.image || PLACEHOLDER_IMAGE,
    [product.images, product.image]
  )

  // Стабильный обработчик prefetch (не меняется между рендерами)
  const handleMouseEnter = useStableCallback(() => {
    if (product.slug) {
      prefetchProduct(product.slug)
    }
  }, [product.slug, prefetchProduct])

  // Стабильный обработчик добавления в корзину
  const handleAddToCart = useStableCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (buttonRef.current && onAddToCart) {
        const rect = buttonRef.current.getBoundingClientRect()
        onAddToCart(product, {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
      }
    },
    [product, onAddToCart]
  )

  // Мемоизированное форматирование цены
  const formattedPrice = useMemo(() => {
    return product.price > 0
      ? `${product.price.toLocaleString('ru-RU')} ₽`
      : 'По запросу'
  }, [product.price])

  // Мемоизированное форматирование материала
  const materialLabel = useMemo(() => {
    if (!product.material) return null
    return product.material === 'MARBLE' ? 'Мрамор' : product.material === 'GRANITE' ? 'Гранит' : product.material
  }, [product.material])

  // Мемоизированные классы для материала
  const materialClasses = useMemo(() => {
    if (!product.material) return ''
    return product.material === 'MARBLE'
      ? 'bg-blue-100 text-blue-700'
      : product.material === 'GRANITE'
      ? 'bg-gray-100 text-gray-700'
      : 'bg-gray-100 text-gray-600'
  }, [product.material])

  // Мемоизированное форматирование вариантов
  const variantsText = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null
    const count = product.variants.length
    return `${count} ${count === 1 ? 'вариант' : count < 5 ? 'варианта' : 'вариантов'}`
  }, [product.variants])

  // Мемоизированное форматирование атрибутов
  const attributesText = useMemo(() => {
    if (!product.attributes || product.attributes.length === 0) return null
    const count = product.attributes.length
    return `${count} ${count === 1 ? 'атрибут' : count < 5 ? 'атрибута' : 'атрибутов'}`
  }, [product.attributes])

  return (
    <article 
      ref={cardRef} 
      className="product-card bg-white rounded-lg overflow-hidden border border-gray-200/50 shadow-sm touch-manipulation"
      style={{
        background: 'linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)',
        // GPU-ускорение для плавных анимаций
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      }}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
      itemScope
      itemType="https://schema.org/Product"
    >
      <Link 
        to={`/p/${product.slug}`} 
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze-400 focus-visible:ring-offset-2"
        aria-label={`Перейти к товару ${product.name}`}
      >
        <div className="relative aspect-square bg-gray-100 overflow-hidden group">
          <OptimizedImage
            src={imageUrl}
            alt={product.name}
            aspectRatio={1}
            size="thumbnail"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="transition-transform duration-300 ease-out group-hover:scale-105 will-change-transform"
            priority={index !== undefined && index < 4}
            loading={index !== undefined && index < 4 ? 'eager' : 'lazy'}
            objectFit="cover"
            placeholder="blur"
            itemProp="image"
          />
          {/* Add to Cart Button - темный гранитный стиль с мраморной текстурой */}
          <button
            ref={buttonRef}
            onClick={handleAddToCart}
            className="granite-button absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center z-10 touch-manipulation shadow-lg hover:shadow-xl transition-shadow duration-200"
            style={{ position: 'absolute' }}
            aria-label={`Добавить ${product.name} в корзину`}
            type="button"
          >
            <ShoppingCart className="w-5 h-5 text-gray-200" aria-hidden="true" />
          </button>
        </div>
        <div className="p-3">
          <h3 
            className="text-sm font-body font-medium text-gray-900 mb-1 line-clamp-2"
            itemProp="name"
          >
            {product.name}
          </h3>
          <div className="flex items-center justify-between mb-1">
            <p 
              className="text-base font-body font-semibold text-gray-900"
              itemProp="offers"
              itemScope
              itemType="https://schema.org/Offer"
            >
              <meta itemProp="price" content={product.price.toString()} />
              <meta itemProp="priceCurrency" content="RUB" />
              <span>{formattedPrice}</span>
            </p>
            {materialLabel && (
              <span 
                className={`text-xs px-2 py-0.5 rounded ${materialClasses}`}
                itemProp="material"
              >
                {materialLabel}
              </span>
            )}
          </div>
          {product.productType && product.productType !== 'SIMPLE' && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {variantsText && (
                <span className="text-xs text-gray-500" aria-label="Количество вариантов">
                  {variantsText}
                </span>
              )}
              {attributesText && (
                <span className="text-xs text-gray-500" aria-label="Количество атрибутов">
                  • {attributesText}
                </span>
              )}
            </div>
          )}
          {product.options && (
            <p className="text-xs font-body text-gray-600 mt-1 line-clamp-1">
              {product.options}
            </p>
          )}
        </div>
      </Link>
    </article>
  )
}

/**
 * Сравнение props для React.memo
 * Оптимизировано для предотвращения лишних ре-рендеров
 * 
 * Возвращает true если props равны (компонент не должен ре-рендериться)
 * Возвращает false если props изменились (компонент должен ре-рендериться)
 */
const areEqual = (prevProps: ProductCardProps, nextProps: ProductCardProps): boolean => {
  // Быстрая проверка: если ссылки на объекты одинаковые, props не изменились
  if (prevProps === nextProps) {
    return true
  }

  // Сравниваем основные свойства товара (примитивы - быстро)
  if (
    prevProps.product.id !== nextProps.product.id ||
    prevProps.product.slug !== nextProps.product.slug ||
    prevProps.product.name !== nextProps.product.name ||
    prevProps.product.price !== nextProps.product.price ||
    prevProps.product.image !== nextProps.product.image ||
    prevProps.product.material !== nextProps.product.material ||
    prevProps.index !== nextProps.index
  ) {
    return false
  }

  // Сравниваем массивы изображений (shallow comparison)
  const prevImages = prevProps.product.images || []
  const nextImages = nextProps.product.images || []
  if (prevImages.length !== nextImages.length) {
    return false
  }
  if (prevImages.some((img, i) => img !== nextImages[i])) {
    return false
  }

  // Сравниваем варианты (только количество для производительности)
  // Если нужно более точное сравнение, можно добавить проверку по id
  const prevVariants = prevProps.product.variants || []
  const nextVariants = nextProps.product.variants || []
  if (prevVariants.length !== nextVariants.length) {
    return false
  }

  // Сравниваем атрибуты (только количество)
  const prevAttributes = prevProps.product.attributes || []
  const nextAttributes = nextProps.product.attributes || []
  if (prevAttributes.length !== nextAttributes.length) {
    return false
  }

  // onAddToCart - функция, обычно стабильная благодаря useStableCallback
  // Но проверяем ссылку на всякий случай
  if (prevProps.onAddToCart !== nextProps.onAddToCart) {
    return false
  }

  // Все проверки пройдены - props не изменились
  return true
}

// Экспортируем мемоизированный компонент
export default memo(ProductCard, areEqual)

