import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Check } from 'lucide-react'
import { StoneCard } from '@monorepo/ui'

interface AttributeValue {
  id: number
  value: string
  displayName: string
}

interface Variant {
  id: number
  attributes: Record<string, string>
  price: number
  stock?: number
  weight?: number
  unit?: string
}

interface VariantSelectorProps {
  product: {
    id: number
    name: string
    attributes: Array<{
      id: number
      name: string
      slug: string
      values: AttributeValue[]
    }>
    variants: Variant[]
  }
  onAddToCart: (variantId: number, selectedAttributes: Record<string, string>) => void
}

export default function VariantSelector({ product, onAddToCart }: VariantSelectorProps) {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({})
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [price, setPrice] = useState<number | null>(null)

  // Инициализация первого атрибута
  useEffect(() => {
    if (product.attributes.length > 0 && !selectedAttributes[product.attributes[0].slug]) {
      const firstAttr = product.attributes[0]
      if (firstAttr.values.length > 0) {
        setSelectedAttributes({
          [firstAttr.slug]: firstAttr.values[0].value,
        })
      }
    }
  }, [product.attributes])

  // Поиск варианта при изменении выбранных атрибутов
  useEffect(() => {
    if (Object.keys(selectedAttributes).length === product.attributes.length) {
      const variant = product.variants.find((v) => {
        return Object.keys(selectedAttributes).every(
          (key) => v.attributes[key] === selectedAttributes[key],
        )
      })
      if (variant) {
        setSelectedVariant(variant)
        setPrice(variant.price)
      } else {
        setSelectedVariant(null)
        setPrice(null)
      }
    } else {
      setSelectedVariant(null)
      setPrice(null)
    }
  }, [selectedAttributes, product.variants, product.attributes.length])

  const handleAttributeSelect = (attrSlug: string, value: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attrSlug]: value,
    }))
  }

  const handleAddToCart = () => {
    if (selectedVariant) {
      onAddToCart(selectedVariant.id, selectedAttributes)
    }
  }

  return (
    <div className="space-y-4">
      {product.attributes.map((attribute) => (
        <div key={attribute.id}>
          <label className="block mb-2 font-body text-sm font-medium text-gray-900">
            {attribute.name}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {attribute.values.map((value) => {
              const isSelected = selectedAttributes[attribute.slug] === value.value
              return (
                <motion.button
                  key={value.id}
                  onClick={() => handleAttributeSelect(attribute.slug, value.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-bronze-500 bg-bronze-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm text-gray-900">
                      {value.displayName}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-bronze-600" />
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}

      {price !== null && selectedVariant && (
        <StoneCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-body text-gray-600 mb-1">Цена</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-inscription text-gray-900">
                  {price.toLocaleString('ru-RU')}
                </span>
                <span className="text-sm font-body text-gray-600">
                  {selectedVariant.unit === 'SQUARE_METER' ? '₽/м²' : selectedVariant.unit === 'TON' ? '₽/т' : '₽'}
                </span>
              </div>
              {selectedVariant.weight && (
                <p className="text-xs font-body text-gray-500 mt-1">
                  Вес: {selectedVariant.weight} кг
                </p>
              )}
            </div>
          </div>
          <motion.button
            onClick={handleAddToCart}
            className="granite-button w-full py-3 rounded-lg font-body font-semibold flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>В корзину</span>
          </motion.button>
        </StoneCard>
      )}
    </div>
  )
}

