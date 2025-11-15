import { useState, useEffect } from 'react'
import SimpleProductCard from './SimpleProductCard'
import VariantSelector from './VariantSelector'
import MatrixSelector from './MatrixSelector'
import { ProductType } from '@prisma/client'

interface ProductVariantSelectorProps {
  product: {
    id: number
    slug: string
    name: string
    productType?: ProductType | string
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
}

export default function ProductVariantSelector({ product, onAddToCart }: ProductVariantSelectorProps) {
  const productType = product.productType || 'SIMPLE'

  // Для простых товаров
  if (productType === 'SIMPLE' || (!product.attributes && !product.variants)) {
    return (
      <SimpleProductCard
        product={{
          id: product.id,
          name: product.name,
          price: product.basePrice || product.price || 0,
        }}
        onAddToCart={() => onAddToCart(null, {})}
      />
    )
  }

  // Для товаров с одним атрибутом
  if (productType === 'SINGLE_VARIANT' && product.attributes && product.attributes.length === 1) {
    return (
      <VariantSelector
        product={product as any}
        onAddToCart={(variantId, selectedAttributes) => onAddToCart(variantId, selectedAttributes)}
      />
    )
  }

  // Для товаров с матрицей атрибутов
  if (productType === 'MATRIX' && product.attributes && product.attributes.length > 1) {
    return (
      <MatrixSelector
        product={product as any}
        onAddToCart={(variantId, selectedAttributes) => onAddToCart(variantId, selectedAttributes)}
      />
    )
  }

  // Fallback для старых товаров с вариантами (без productType)
  if (product.variants && product.variants.length > 0 && !product.attributes) {
    // Используем старый селектор вариантов
    return (
      <VariantSelector
        product={{
          ...product,
          attributes: [
            {
              id: 1,
              name: 'Вариант',
              slug: 'variant',
              values: product.variants.map((v, i) => ({
                id: i + 1,
                value: String(v.id),
                displayName: v.name || `Вариант ${i + 1}`,
              })),
            },
          ],
        } as any}
        onAddToCart={(variantId, selectedAttributes) => onAddToCart(variantId, selectedAttributes)}
      />
    )
  }

  // По умолчанию показываем простой товар
  return (
    <SimpleProductCard
      product={{
        id: product.id,
        name: product.name,
        price: product.basePrice || product.price || 0,
      }}
      onAddToCart={() => onAddToCart(null, {})}
    />
  )
}

