import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Check, AlertCircle } from 'lucide-react'
import { StoneCard } from '@monorepo/ui'
import axios from 'axios'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { getTransition } from '../../utils/animation-variants'

import { API_URL } from '../../config/api'

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

interface MatrixSelectorProps {
  product: {
    id: number
    slug: string
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
  onPriceChange?: (price: number | null) => void
}

export default function MatrixSelector({ product, onAddToCart, onPriceChange }: MatrixSelectorProps) {
  const { shouldReduceMotion } = useReducedMotion()
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({})
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Поиск варианта при изменении выбранных атрибутов
  useEffect(() => {
    const allSelected = product.attributes.every(
      (attr) => selectedAttributes[attr.slug] !== undefined && selectedAttributes[attr.slug] !== '',
    )

    if (allSelected && Object.keys(selectedAttributes).length > 0) {
      // Сначала пытаемся найти вариант локально
      const localVariant = product.variants.find((v) => {
        const variantAttrs = typeof v.attributes === 'string' 
          ? JSON.parse(v.attributes) 
          : v.attributes as Record<string, string>
        return Object.keys(selectedAttributes).every(
          (key) => variantAttrs[key] === selectedAttributes[key],
        )
      })

      if (localVariant) {
        // Если вариант найден локально, используем его цену
        setPrice(localVariant.price)
        setSelectedVariant(localVariant)
        // Откладываем onPriceChange, чтобы избежать обновления состояния во время рендера
        setTimeout(() => {
          onPriceChange?.(localVariant.price)
        }, 0)
        setIsCalculating(false)
        return
      }

      // Если вариант не найден локально, запрашиваем через API
      setIsCalculating(true)
      
      // Фильтруем пустые значения перед отправкой
      const validAttributes = Object.fromEntries(
        Object.entries(selectedAttributes).filter(([_, value]) => value !== undefined && value !== '')
      )
      
      axios
        .post(`${API_URL}/products/${product.slug}/calculate-price`, {
          attributes: validAttributes,
        })
        .then((response) => {
          const calculatedPrice = response.data.price
          setPrice(calculatedPrice)
          // Откладываем onPriceChange, чтобы избежать обновления состояния во время рендера
          setTimeout(() => {
            onPriceChange?.(calculatedPrice)
          }, 0)
          if (response.data.variant) {
            const variant = product.variants.find((v) => v.id === response.data.variant.id)
            setSelectedVariant(variant || null)
          }
        })
        .catch((error) => {
          // Тихо обрабатываем ошибку, не логируем в консоль если это 400
          if (error.response?.status !== 400) {
            console.error('Error calculating price:', error)
          }
          setPrice(null)
          setSelectedVariant(null)
          setTimeout(() => {
            onPriceChange?.(null)
          }, 0)
        })
        .finally(() => {
          setIsCalculating(false)
        })
    } else {
      setPrice(null)
      setSelectedVariant(null)
      // Откладываем onPriceChange, чтобы избежать обновления состояния во время рендера
      setTimeout(() => {
        onPriceChange?.(null)
      }, 0)
      setIsCalculating(false)
    }
  }, [selectedAttributes, product.slug, product.variants, product.attributes, onPriceChange])

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

  const allSelected = product.attributes.every(
    (attr) => selectedAttributes[attr.slug] !== undefined,
  )

  return (
    <div className="space-y-4">
      {product.attributes.map((attribute, attrIndex) => (
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
                  className={`p-3 rounded-lg border-2 transition-all relative ${
                    isSelected
                      ? 'border-bronze-500 bg-bronze-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  transition={getTransition(shouldReduceMotion, 'fast')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm text-gray-900 text-left">
                      {value.displayName}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-bronze-600 shrink-0 ml-2" />
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}

      {isCalculating && (
        <StoneCard className="p-4">
          <div className="flex items-center justify-center gap-2">
            {!shouldReduceMotion ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-gray-200 border-t-bronze-500 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-200 border-t-bronze-500 rounded-full" />
            )}
            <span className="text-sm font-body text-gray-600">Расчет цены...</span>
          </div>
        </StoneCard>
      )}

      {!isCalculating && price !== null && selectedVariant && (
        <StoneCard className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
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
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              transition={getTransition(shouldReduceMotion, 'fast')}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>В корзину</span>
            </motion.button>
          </div>
        </StoneCard>
      )}

      {/* Fallback: если все атрибуты выбраны, но вариант не найден */}
      {!isCalculating && allSelected && !selectedVariant && product.variants?.length > 0 && (
        <StoneCard className="p-4">
          <p className="text-sm font-body text-gray-600 mb-3">
            Вариант для выбранных параметров не найден. Используем ближайший доступный.
          </p>
          <motion.button
            onClick={() => {
              // Используем первый доступный вариант
              const fallbackVariant = product.variants[0]
              if (fallbackVariant) {
                onAddToCart(fallbackVariant.id, selectedAttributes)
              }
            }}
            className="granite-button w-full py-3 rounded-lg font-body font-semibold flex items-center justify-center gap-2"
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            transition={getTransition(shouldReduceMotion, 'fast')}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Добавить в корзину</span>
          </motion.button>
        </StoneCard>
      )}

      {!isCalculating && !allSelected && (
        <StoneCard className="p-4">
          <div className="flex items-center gap-2 text-sm font-body text-gray-600">
            <AlertCircle className="w-4 h-4" />
            <span>Выберите все параметры для расчета цены</span>
          </div>
        </StoneCard>
      )}
    </div>
  )
}

