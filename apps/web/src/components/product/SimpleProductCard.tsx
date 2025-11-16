import { motion } from 'framer-motion'
import { ShoppingCart } from 'lucide-react'
import { StoneCard } from '@monorepo/ui'
import ProductSpecifications from '../ProductSpecifications'

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

export default function SimpleProductCard({ product, onAddToCart }: SimpleProductCardProps) {
  return (
    <StoneCard className="cursor-pointer overflow-hidden">
      <div className="flex flex-col">
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = `https://via.placeholder.com/400/cccccc/666666?text=${encodeURIComponent(product.name)}`
            }}
          />
        )}
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
                {product.price.toLocaleString('ru-RU')}
              </span>
              <span className="text-sm font-body text-gray-600">
                {product.unit === 'SQUARE_METER' ? '₽/м²' : product.unit === 'TON' ? '₽/т' : '₽'}
              </span>
            </div>
            <motion.button
              onClick={onAddToCart}
              className="granite-button px-4 py-2 rounded-lg flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
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

