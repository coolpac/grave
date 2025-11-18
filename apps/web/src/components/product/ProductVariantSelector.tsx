import { useEffect } from 'react'
import SimpleProductCard from './SimpleProductCard'
import VariantSelector from './VariantSelector'
import MatrixSelector from './MatrixSelector'
interface ProductVariantSelectorProps {
  product: {
    id: number
    slug: string
    name: string
    productType?: 'SIMPLE' | 'SINGLE_VARIANT' | 'MATRIX' | string
    basePrice?: number
    price?: number
    attributes?: Array<{
      id: number
      name: string
      slug: string
      values: Array<{
        id: number
        value: string
        displayName: string
      }>
    }>
    variants?: Array<{
      id: number
      name?: string
      attributes: Record<string, string>
      price: number
      stock?: number
      weight?: number
      unit?: string
    }>
  }
  onAddToCart: (variantId: number | null, selectedAttributes: Record<string, string>) => void
  onPriceChange?: (price: number | null) => void
}

export default function ProductVariantSelector({ product, onAddToCart, onPriceChange }: ProductVariantSelectorProps) {
  const productType = product.productType || 'SIMPLE'
  
  // Определяем, какой компонент использовать
  const isSimple = productType === 'SIMPLE' || (!product.attributes && !product.variants)
  const isSingleVariant = productType === 'SINGLE_VARIANT' && product.attributes && product.attributes.length === 1
  const isMatrix = productType === 'MATRIX' && product.attributes && product.attributes.length > 1
  const isLegacyVariants = product.variants && product.variants.length > 0 && !product.attributes

  // Для простых товаров - устанавливаем цену через useEffect
  const simplePrice = product.basePrice || product.price || 0
  useEffect(() => {
    if (isSimple && onPriceChange) {
      // Откладываем onPriceChange, чтобы избежать обновления состояния во время рендера
      setTimeout(() => {
        onPriceChange(simplePrice)
      }, 0)
    }
  }, [isSimple, simplePrice, onPriceChange])

  // Для простых товаров
  if (isSimple) {
    return (
      <SimpleProductCard
        product={{
          id: product.id,
          name: product.name,
          price: simplePrice,
        }}
        onAddToCart={() => onAddToCart(null, {})}
      />
    )
  }

  // Для товаров с одним атрибутом
  if (isSingleVariant) {
    return (
      <VariantSelector
        product={product as any}
        onAddToCart={(variantId, selectedAttributes) => onAddToCart(variantId, selectedAttributes)}
        onPriceChange={onPriceChange}
      />
    )
  }

  // Для товаров с матрицей атрибутов
  if (isMatrix) {
    return (
      <MatrixSelector
        product={product as any}
        onAddToCart={(variantId, selectedAttributes) => onAddToCart(variantId, selectedAttributes)}
        onPriceChange={onPriceChange}
      />
    )
  }

  // Fallback для старых товаров с вариантами (без productType)
  if (isLegacyVariants) {
    return (
      <VariantSelector
        product={{
          ...product,
          attributes: [
            {
              id: 1,
              name: 'Вариант',
              slug: 'variant',
              values: (product.variants ?? []).map((v, i) => ({
                id: i + 1,
                value: String(v.id),
                displayName: v.name || `Вариант ${i + 1}`,
              })),
            },
          ],
        } as any}
        onAddToCart={(variantId, selectedAttributes) => onAddToCart(variantId, selectedAttributes)}
        onPriceChange={onPriceChange}
      />
    )
  }

  // По умолчанию показываем простой товар
  const defaultPrice = product.basePrice || product.price || 0
  useEffect(() => {
    if (onPriceChange) {
      // Откладываем onPriceChange, чтобы избежать обновления состояния во время рендера
      setTimeout(() => {
        onPriceChange(defaultPrice)
      }, 0)
    }
  }, [defaultPrice, onPriceChange])
  
  return (
    <SimpleProductCard
      product={{
        id: product.id,
        name: product.name,
        price: defaultPrice,
      }}
      onAddToCart={() => onAddToCart(null, {})}
    />
  )
}

