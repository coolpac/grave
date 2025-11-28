import { Check } from 'lucide-react'
import { StoneCard } from '@monorepo/ui'
import ProductSpecifications from '../ProductSpecifications'
import { memo, useMemo } from 'react'

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

function SimpleProductCard({ product }: SimpleProductCardProps) {
  const formattedPrice = useMemo(() => {
    return product.price.toLocaleString('ru-RU')
  }, [product.price])

  const unitLabel = useMemo(() => {
    if (product.unit === 'SQUARE_METER') return '₽/м²'
    if (product.unit === 'TON') return '₽/т'
    return '₽'
  }, [product.unit])
  
  return (
    <StoneCard className="overflow-hidden">
      <div className="p-4">
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mb-3">
            <ProductSpecifications specifications={product.specifications} className="text-xs" />
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-body text-gray-600 mb-1">Цена</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-inscription text-gray-900">
                {formattedPrice}
              </span>
              <span className="text-sm font-body text-gray-600">
                {unitLabel}
              </span>
            </div>
          </div>
          <Check className="w-6 h-6 text-green-500" />
        </div>
      </div>
    </StoneCard>
  )
}

const areEqual = (prevProps: SimpleProductCardProps, nextProps: SimpleProductCardProps): boolean => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.unit === nextProps.product.unit
  )
}

export default memo(SimpleProductCard, areEqual)
