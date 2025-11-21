import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import ProductCard from './ProductCard'
import { Skeleton } from '@monorepo/ui'

interface Product {
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

interface VirtualizedProductGridProps {
  products: Product[]
  onAddToCart?: (product: Product, position: { x: number; y: number }) => void
  isLoading?: boolean
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  onLoadMore?: () => void
  columns?: number // Количество колонок (по умолчанию 2)
  gap?: number // Отступ между элементами в px (по умолчанию 16)
  itemHeight?: number // Примерная высота элемента (для initial render)
}

/**
 * Виртуализированная сетка товаров для производительности больших списков
 * 
 * Особенности:
 * - Виртуализация для grid layout (2 колонки)
 * - Dynamic height calculation
 * - Smooth scrolling
 * - Infinite scroll с Intersection Observer
 * - Оптимизированный рендеринг только видимых элементов
 */
export default function VirtualizedProductGrid({
  products,
  onAddToCart,
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  onLoadMore,
  columns = 2,
  gap = 16,
  itemHeight = 280, // Примерная высота карточки товара
}: VirtualizedProductGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Вычисляем количество строк для виртуализации
  const rowCount = Math.ceil(products.length / columns)

  // Виртуализатор для строк
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight + gap, // Высота строки + отступ
    overscan: 2, // Рендерим 2 дополнительные строки для smooth scrolling
    // Динамический расчет высоты на основе реальных размеров
    measureElement: (element) => {
      return element?.getBoundingClientRect().height ?? itemHeight
    },
  })

  // Infinite scroll с Intersection Observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage || !onLoadMore) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore()
        }
      },
      {
        root: parentRef.current,
        rootMargin: '200px', // Начинаем загрузку за 200px до конца
        threshold: 0.1,
      }
    )

    observer.observe(loadMoreRef.current)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  // Мемоизированный обработчик добавления в корзину
  const handleAddToCart = useCallback(
    (product: Product, position: { x: number; y: number }) => {
      onAddToCart?.(product, position)
    },
    [onAddToCart]
  )

  // Рендер строки с товарами
  const renderRow = useCallback(
    (rowIndex: number) => {
      const startIndex = rowIndex * columns
      const endIndex = Math.min(startIndex + columns, products.length)
      const rowProducts = products.slice(startIndex, endIndex)

      return (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            paddingBottom: gap,
          }}
        >
          {rowProducts.map((product, colIndex) => (
            <ProductCard
              key={product.id || `${product.slug}-${startIndex + colIndex}`}
              product={product}
              index={startIndex + colIndex}
              onAddToCart={handleAddToCart}
            />
          ))}
          {/* Заполняем пустые ячейки в последней строке */}
          {rowProducts.length < columns &&
            Array.from({ length: columns - rowProducts.length }).map((_, i) => (
              <div key={`empty-${i}`} aria-hidden="true" />
            ))}
        </div>
      )
    },
    [products, columns, gap, handleAddToCart]
  )

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg overflow-hidden">
            <Skeleton variant="rectangular" width="100%" height={200} />
            <div className="p-3 space-y-2">
              <Skeleton variant="text" width="80%" height={16} />
              <Skeleton variant="text" width="60%" height={20} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Товары не найдены</p>
      </div>
    )
  }

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{
        // Smooth scrolling
        scrollBehavior: 'smooth',
        // Оптимизация для производительности
        willChange: 'scroll-position',
      }}
    >
      {/* Виртуальный контейнер с правильной высотой */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Рендерим только видимые строки */}
        {virtualItems.map((virtualRow) => {
          const rowIndex = virtualRow.index
          return (
            <div
              key={virtualRow.key}
              data-index={rowIndex}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow(rowIndex)}
            </div>
          )
        })}
      </div>

      {/* Infinite scroll trigger */}
      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="h-4 flex items-center justify-center"
          style={{ minHeight: '16px' }}
        >
          {isFetchingNextPage && (
            <div className="grid grid-cols-2 gap-4 w-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden">
                  <Skeleton variant="rectangular" width="100%" height={200} />
                  <div className="p-3 space-y-2">
                    <Skeleton variant="text" width="80%" height={16} />
                    <Skeleton variant="text" width="60%" height={20} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}








