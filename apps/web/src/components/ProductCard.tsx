import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useRef } from 'react'
import { PLACEHOLDER_IMAGE } from '../utils/constants'

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

export default function ProductCard({ product, index = 0, onAddToCart }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (buttonRef.current && onAddToCart) {
      const rect = buttonRef.current.getBoundingClientRect()
      onAddToCart(product, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
    }
  }

  const imageUrl = product.images?.[0] || product.image || PLACEHOLDER_IMAGE

  return (
    <div 
      ref={cardRef} 
      className="bg-white rounded-lg overflow-hidden border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow duration-200"
      style={{
        background: 'linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)',
      }}
    >
      <Link to={`/p/${product.slug}`} className="block">
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
            onError={(e) => {
              // Fallback на placeholder при ошибке загрузки
              const target = e.target as HTMLImageElement
              target.src = PLACEHOLDER_IMAGE
            }}
          />
            {/* Add to Cart Button - темный гранитный стиль с мраморной текстурой */}
            <button
              ref={buttonRef}
              onClick={handleAddToCart}
              className="granite-button absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center z-10"
              style={{ position: 'absolute' }}
              aria-label="Добавить в корзину"
            >
              <ShoppingCart className="w-5 h-5 text-gray-200" />
            </button>
        </div>
        <div className="p-3">
          <h3 className="text-sm font-body font-medium text-gray-900 mb-1 line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mb-1">
            <p className="text-base font-body font-semibold text-gray-900">
              {product.price > 0 ? `${product.price.toLocaleString('ru-RU')} ₽` : 'По запросу'}
            </p>
            {product.material && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                product.material === 'MARBLE' 
                  ? 'bg-blue-100 text-blue-700' 
                  : product.material === 'GRANITE'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {product.material === 'MARBLE' ? 'Мрамор' : product.material === 'GRANITE' ? 'Гранит' : product.material}
              </span>
            )}
          </div>
          {product.productType && product.productType !== 'SIMPLE' && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {product.variants && product.variants.length > 0 && (
                <span className="text-xs text-gray-500">
                  {product.variants.length} {product.variants.length === 1 ? 'вариант' : product.variants.length < 5 ? 'варианта' : 'вариантов'}
                </span>
              )}
              {product.attributes && product.attributes.length > 0 && (
                <span className="text-xs text-gray-500">
                  • {product.attributes.length} {product.attributes.length === 1 ? 'атрибут' : product.attributes.length < 5 ? 'атрибута' : 'атрибутов'}
                </span>
              )}
            </div>
          )}
          {product.options && (
            <p className="text-xs font-body text-gray-600 mt-1">{product.options}</p>
          )}
        </div>
      </Link>
    </div>
  )
}

