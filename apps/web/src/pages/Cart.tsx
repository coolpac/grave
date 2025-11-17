import { Link, useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { useCart } from '../hooks/useCart'
import { ArrowLeft, Trash2, Plus, Minus, ShoppingCart, Loader2, WifiOff } from 'lucide-react'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Cart() {
  const navigate = useNavigate()
  const { BackButton, MainButton } = useTelegram()
  const {
    cart,
    items,
    total,
    itemsCount,
    isLoading,
    isOffline,
    updateQuantity,
    removeItem,
  } = useCart()

  useEffect(() => {
    // Проверяем поддержку BackButton перед использованием
    if (BackButton && typeof BackButton.show === 'function') {
      try {
        BackButton.show()
        BackButton.onClick(() => {
          navigate(-1)
        })
      } catch (error) {
        // BackButton не поддерживается в этой версии Telegram
        console.debug('BackButton not supported:', error)
      }
    }

    if (items.length > 0) {
      if (MainButton && typeof MainButton.setText === 'function') {
        MainButton.setText(`Оформить заказ • ${total.toLocaleString('ru-RU')} ₽`)
        MainButton.show()
        MainButton.onClick(() => {
          navigate('/checkout')
        })
      }
    } else {
      if (MainButton && typeof MainButton.hide === 'function') {
        MainButton.hide()
      }
    }

    return () => {
      if (BackButton && typeof BackButton.hide === 'function') {
        try {
          BackButton.hide()
          BackButton.offClick(() => {})
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      }
      if (MainButton && typeof MainButton.hide === 'function') {
        MainButton.hide()
        MainButton.offClick(() => {})
      }
    }
  }, [BackButton, MainButton, navigate, items.length, total])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка корзины...</p>
        </div>
      </div>
    )
  }

  // Показываем индикатор офлайн режима
  const isUpdating = false // Теперь управляется через React Query

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="px-4 pt-4 pb-2">
          <motion.button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-lg transition-all duration-200 shadow-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
              boxShadow: `
                inset 0 2px 4px rgba(255, 255, 255, 0.1),
                inset 0 -2px 4px rgba(0, 0, 0, 0.5),
                inset 2px 0 2px rgba(255, 255, 255, 0.08),
                inset -2px 0 2px rgba(0, 0, 0, 0.4),
                0 2px 8px rgba(0, 0, 0, 0.3)
              `,
              border: '1px solid rgba(139, 107, 63, 0.3)',
            }}
          >
            <ArrowLeft className="w-5 h-5 text-gray-200" />
          </motion.button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-6"
          >
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
                boxShadow: `
                  inset 0 2px 4px rgba(255, 255, 255, 0.1),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.5),
                  0 4px 12px rgba(0, 0, 0, 0.4)
                `,
                border: '2px solid rgba(139, 107, 63, 0.3)',
              }}
            >
              <ShoppingCart className="w-12 h-12 text-gray-200" />
            </div>
          </motion.div>
          <h2 className="text-2xl font-inscription text-gray-900 mb-2">Корзина пуста</h2>
          <p className="text-base font-body text-gray-600 mb-8">
            Добавьте товары из каталога
          </p>
          <motion.button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-lg font-body font-semibold transition-all duration-200"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
              boxShadow: `
                inset 0 3px 6px rgba(255, 255, 255, 0.1),
                inset 0 -3px 6px rgba(0, 0, 0, 0.5),
                inset 3px 0 3px rgba(255, 255, 255, 0.08),
                inset -3px 0 3px rgba(0, 0, 0, 0.4),
                0 4px 12px rgba(0, 0, 0, 0.4),
                0 8px 24px rgba(0, 0, 0, 0.3)
              `,
              border: '2px solid rgba(139, 107, 63, 0.3)',
              color: '#E5E7EB',
            }}
          >
            Перейти в каталог
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <motion.button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-lg transition-all duration-200 shadow-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
            boxShadow: `
              inset 0 2px 4px rgba(255, 255, 255, 0.1),
              inset 0 -2px 4px rgba(0, 0, 0, 0.5),
              inset 2px 0 2px rgba(255, 255, 255, 0.08),
              inset -2px 0 2px rgba(0, 0, 0, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.3)
            `,
            border: '1px solid rgba(139, 107, 63, 0.3)',
          }}
        >
          <ArrowLeft className="w-5 h-5 text-gray-200" />
        </motion.button>
      </div>

      {/* Title */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-3xl font-inscription text-gray-900"
          >
            Корзина
          </motion.h1>
          {isOffline && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-100/50 border border-yellow-300/50"
            >
              <WifiOff className="w-4 h-4 text-yellow-700" />
              <span className="text-xs font-body text-yellow-800">Офлайн режим</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="px-4 space-y-4 pb-32">
        <AnimatePresence mode="popLayout">
          {items
            .filter((item) => {
              // Фильтруем элементы без product или с невалидной ценой
              if (!item.product) return false
              const price = item.variant?.price ?? item.product?.basePrice ?? 0
              return price > 0 && !isNaN(price)
            })
            .map((item, index) => {
            // Правильно определяем цену: сначала вариант, потом базовая цена продукта
            const price = item.variant?.price ?? item.product?.basePrice ?? 0
            const imageUrl = item.product?.media?.[0]?.url || '/placeholder-image.jpg'
            
            return (
              <motion.div
                key={`${item.id}-${item.variantId || 'default'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{ 
                  duration: 0.2,
                  exit: { duration: 0.15 }
                }}
              >
                <StoneCard>
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link to={`/p/${item.product.slug}`} className="flex-shrink-0">
                      <div 
                        className="w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden bg-gray-100"
                        style={{
                          background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
                          boxShadow: `
                            inset 0 2px 4px rgba(255, 255, 255, 0.1),
                            inset 0 -2px 4px rgba(0, 0, 0, 0.5),
                            0 2px 8px rgba(0, 0, 0, 0.2)
                          `,
                          border: '1px solid rgba(139, 107, 63, 0.3)',
                        }}
                      >
                        {imageUrl && imageUrl !== '/placeholder-image.jpg' ? (
                          <img 
                            src={imageUrl} 
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ShoppingCart className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/p/${item.product.slug}`}>
                        <h3 className="font-inscription text-lg text-gray-900 mb-1 truncate hover:text-bronze-500 transition-colors">
                          {item.product.name}
                        </h3>
                      </Link>
                      {item.variant?.name && (
                        <p className="text-sm text-gray-600 mb-1">{item.variant.name}</p>
                      )}
                      <div className="flex flex-col gap-1 mb-3">
                        <div className="flex items-baseline gap-1">
                          <p className="text-xl font-inscription text-gray-900">
                            {(price * item.quantity).toLocaleString('ru-RU')}
                          </p>
                          <span className="text-sm font-body text-gray-600">₽</span>
                        </div>
                        <span className="text-xs font-body text-gray-500">
                          {price.toLocaleString('ru-RU')} ₽ × {item.quantity}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateQuantity(item.id, -1)
                              } else {
                                removeItem(item.id)
                              }
                            }}
                            disabled={(item.quantity <= 1 || isLoading)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 active:opacity-60"
                            style={{
                              background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
                              boxShadow: `
                                inset 0 2px 4px rgba(255, 255, 255, 0.1),
                                inset 0 -2px 4px rgba(0, 0, 0, 0.5),
                                0 2px 4px rgba(0, 0, 0, 0.2)
                              `,
                              border: '1px solid rgba(139, 107, 63, 0.3)',
                            }}
                          >
                            <Minus className="w-4 h-4 text-gray-200" />
                          </button>
                          <span className="text-lg font-inscription text-gray-900 w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={isLoading}
                            className="w-9 h-9 rounded-lg flex items-center justify-center transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 active:opacity-60"
                            style={{
                              background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
                              boxShadow: `
                                inset 0 2px 4px rgba(255, 255, 255, 0.1),
                                inset 0 -2px 4px rgba(0, 0, 0, 0.5),
                                0 2px 4px rgba(0, 0, 0, 0.2)
                              `,
                              border: '1px solid rgba(139, 107, 63, 0.3)',
                            }}
                          >
                            <Plus className="w-4 h-4 text-gray-200" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center transition-opacity duration-200 disabled:opacity-50 hover:opacity-80 active:opacity-60"
                          style={{
                            background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
                            boxShadow: `
                              inset 0 2px 4px rgba(255, 255, 255, 0.1),
                              inset 0 -2px 4px rgba(0, 0, 0, 0.5),
                              0 2px 4px rgba(0, 0, 0, 0.2)
                            `,
                            border: '1px solid rgba(139, 107, 63, 0.3)',
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-gray-200" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <div className="pt-2 border-t border-gray-200/50">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-body text-gray-600">Итого:</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-inscription text-gray-900">
                              {(price * item.quantity).toLocaleString('ru-RU')}
                            </span>
                            <span className="text-sm font-body text-gray-600">₽</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </StoneCard>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <StoneCard variant="elevated">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-body text-gray-600">Товаров:</span>
                <span className="font-inscription text-base text-gray-900">{itemsCount} шт.</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-body text-gray-600">Сумма:</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-inscription text-base text-gray-900">
                    {total.toLocaleString('ru-RU')}
                  </span>
                  <span className="text-sm font-body text-gray-600">₽</span>
                </div>
              </div>
              <div className="border-t border-gray-300/50 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-inscription text-gray-900">Итого:</span>
                  <motion.div
                    key={total}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="flex items-baseline gap-1"
                  >
                    <span className="text-3xl font-inscription text-gray-900">
                      {total.toLocaleString('ru-RU')}
                    </span>
                    <span className="text-lg font-body text-gray-600">₽</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </StoneCard>
        </motion.div>
      </div>

      {/* Sticky Checkout Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom bg-gradient-to-b from-gray-100/50 via-gray-50 to-white border-t border-gray-200/50 px-4 pt-4 pb-6"
      >
        <div className="max-w-md mx-auto">
          <motion.button
            onClick={() => navigate('/checkout')}
            className="granite-button w-full py-4 rounded-xl font-body font-semibold flex items-center gap-3 px-4"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="flex-1 text-left">Оформить заказ</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-inscription text-gray-100">
                {total.toLocaleString('ru-RU')}
              </span>
              <span className="text-base font-body text-gray-300">₽</span>
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
