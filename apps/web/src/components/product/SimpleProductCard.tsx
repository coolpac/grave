import { motion } from 'framer-motion'
import { ShoppingCart } from 'lucide-react'
import { StoneCard } from '@monorepo/ui'
import ProductSpecifications from '../ProductSpecifications'
import { PLACEHOLDER_IMAGE } from '../../utils/constants'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { getTransition } from '../../utils/animation-variants'
import OptimizedImage from '../OptimizedImage'
import { memo, useMemo, useCallback } from 'react'
import { useStableCallback } from '../../hooks/useStableCallback'

interface SimpleProductCardProps {
  product: {
    id: number
    name: string
    price: number
    image?: string
    unit?: string
    specifications?: Record<string, string>
  }
  onAddToCart: () => void
}

function SimpleProductCard({ product, onAddToCart }: SimpleProductCardProps) {
  const { shouldReduceMotion } = useReducedMotion()
  
  // Мемоизированное форматирование цены
  const formattedPrice = useMemo(() => {
    return product.price.toLocaleString('ru-RU')
  }, [product.price])

  // Мемоизированная единица измерения
  const unitLabel = useMemo(() => {
    if (product.unit === 'SQUARE_METER') return '₽/м²'
    if (product.unit === 'TON') return '₽/т'
    return '₽'
  }, [product.unit])

  // Стабильный обработчик добавления в корзину
  const handleAddToCart = useStableCallback(() => {
    onAddToCart()
  }, [onAddToCart])
  
  return (
    <StoneCard className="cursor-pointer overflow-hidden">
      <div className="flex flex-col">
        <OptimizedImage
          src={product.image || ''}
          alt={product.name}
          aspectRatio={16 / 9}
          size="thumbnail"
          sizes="100vw"
          className="w-full"
          objectFit="cover"
          placeholder="blur"
        />
        <div className="p-4">
          <h3 className="font-inscription text-lg text-gray-900 mb-2">
            {product.name}
          </h3>
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mb-3">
              <ProductSpecifications specifications={product.specifications} className="text-xs" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-inscription text-gray-900">
                {formattedPrice}
              </span>
              <span className="text-sm font-body text-gray-600">
                {unitLabel}
              </span>
            </div>
            <motion.button
              onClick={handleAddToCart}
              className="granite-button px-4 py-2 rounded-lg flex items-center gap-2"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              transition={getTransition(shouldReduceMotion, 'fast')}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm font-body">В корзину</span>
            </motion.button>
          </div>
        </div>
      </div>
    </StoneCard>
  )
}

// Мемоизация компонента для предотвращения лишних ре-рендеров
const areEqual = (prevProps: SimpleProductCardProps, nextProps: SimpleProductCardProps): boolean => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.image === nextProps.product.image &&
    prevProps.product.unit === nextProps.product.unit &&
    prevProps.onAddToCart === nextProps.onAddToCart
  )
}

export default memo(SimpleProductCard, areEqual)

