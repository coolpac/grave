import { Link, useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { useCart } from '../hooks/useCart'
import { Trash2, Plus, Minus, ShoppingCart, Loader2, WifiOff } from 'lucide-react'
import { useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import OptimizedImage from '../components/OptimizedImage'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getAnimationVariants, getTransition } from '../utils/animation-variants'
import Header from '../components/Header'

export default function Cart() {
  const navigate = useNavigate()
  const { BackButton, MainButton } = useTelegram()
  const {
    items,
    total,
    itemsCount,
    isLoading,
    isOffline,
    updateQuantity,
    removeItem,
  } = useCart()
  const { shouldReduceMotion } = useReducedMotion()

  // Оптимизированный обработчик удаления с подтверждением
  const handleRemoveItem = useCallback((itemId: number, productName: string) => {
    // Показываем подтверждение удаления
    const confirmed = window.confirm(`Удалить "${productName}" из корзины?`)
    if (confirmed) {
      removeItem(itemId)
      // Откладываем toast, чтобы избежать обновления состояния во время рендера
      setTimeout(() => {
        toast.success('Товар удален из корзины', {
          icon: '🗑️',
        })
      }, 0)
    }
  }, [removeItem])

  // Оптимизированный обработчик изменения количества
  const handleUpdateQuantity = useCallback((itemId: number, delta: number) => {
    updateQuantity(itemId, delta)
    if (delta > 0) {
      // Откладываем toast, чтобы избежать обновления состояния во время рендера
      setTimeout(() => {
        toast.success('Количество увеличено', {
          icon: '➕',
          duration: 2000,
        })
      }, 0)
    }
  }, [updateQuantity])


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

    // Скрываем Telegram MainButton - используем только нашу кастомную кнопку
    if (MainButton && typeof MainButton.hide === 'function') {
      MainButton.hide()
    }

    return () => {
      if (BackButton && typeof BackButton.hide === 'function') {
        try {
          BackButton.hide()
          BackButton.clearHandlers()
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      }
    }
  }, [BackButton, MainButton, navigate])

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

  // Используем items.length, чтобы показывать товары даже с проблемами цены
  if (!isLoading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Используем Telegram BackButton */}
        <div className="h-4" />
        <motion.div
          variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
        >
          {!shouldReduceMotion ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={getTransition(shouldReduceMotion, 'normal')}
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
          ) : (
            <div className="mb-6">
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
            </div>
          )}
          <h2 className="text-2xl font-inscription text-gray-900 mb-2">Корзина пуста</h2>
          <p className="text-base font-body text-gray-600 mb-24">
            Добавьте товары из каталога
          </p>
        </motion.div>
        
        {/* Sticky Catalog Button */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-b from-gray-100/50 via-gray-50 to-white border-t border-gray-200/50 safe-area-bottom">
          <div className="px-4 py-3">
            <motion.button
              onClick={() => navigate('/')}
              className="granite-button w-full block text-center font-medium py-3 px-4 rounded-lg"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              transition={getTransition(shouldReduceMotion, 'fast')}
            >
              Перейти в каталог
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      {/* Используем Telegram BackButton */}
      <div className="h-2" />

      {/* Title */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center justify-between">
          <motion.h1
            variants={getAnimationVariants(shouldReduceMotion, 'slideInFromTop')}
            initial="hidden"
            animate="visible"
            className="text-3xl font-inscription text-gray-900"
          >
            Корзина
          </motion.h1>
          {isOffline && (
            <motion.div
              variants={getAnimationVariants(shouldReduceMotion, 'scaleIn')}
              initial="hidden"
              animate="visible"
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
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item) => {
            // Правильно определяем цену: сначала вариант, потом базовая цена продукта
            const price = item.variant?.price ?? item.product?.basePrice ?? 0
            const imageUrl = item.product?.media?.[0]?.url || '/placeholder-image.svg'
            const itemTotal = price * item.quantity
            
            return (
              <motion.div
                key={`${item.id}-${item.variantId || 'default'}`}
                variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout={false}
                layoutId={undefined}
              >
                <StoneCard className="cart-item-card touch-manipulation">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link 
                      to={`/p/${item.product.slug}`} 
                      className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze-400 focus-visible:ring-offset-2 rounded-lg"
                      aria-label={`Перейти к товару ${item.product.name}`}
                    >
                      <div className="w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden bg-gray-100 granite-button">
                        {imageUrl && imageUrl !== '/placeholder-image.svg' ? (
                          <OptimizedImage
                            src={imageUrl}
                            alt={item.product.name}
                            aspectRatio={1}
                            size="thumbnail"
                            sizes="80px"
                            className="w-full h-full"
                            objectFit="cover"
                            placeholder="blur"
                            loading="lazy"
                          />
                        ) : (
                          <ShoppingCart className="w-8 h-8 text-gray-400" aria-hidden="true" />
                        )}
                      </div>
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/p/${item.product.slug}`}
                        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze-400 focus-visible:ring-offset-2 rounded"
                      >
                        <h3 className="font-inscription text-lg text-gray-900 mb-1 truncate hover:text-bronze-500 transition-colors">
                          {item.product.name}
                        </h3>
                      </Link>
                      {item.variant?.name && (
                        <p className="text-sm text-gray-600 mb-1" aria-label="Вариант товара">
                          {item.variant.name}
                        </p>
                      )}
                      <div className="flex flex-col gap-1 mb-3">
                        <div className="flex items-baseline gap-1">
                          <p className="text-xl font-inscription text-gray-900" aria-label="Цена за единицу">
                            {itemTotal.toLocaleString('ru-RU')}
                          </p>
                          <span className="text-sm font-body text-gray-600" aria-hidden="true">₽</span>
                        </div>
                        <span className="text-xs font-body text-gray-500" aria-label={`${price.toLocaleString('ru-RU')} рублей за единицу, количество ${item.quantity}`}>
                          {price.toLocaleString('ru-RU')} ₽ × {item.quantity}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3" role="group" aria-label="Управление количеством">
                          <motion.button
                            onClick={() => {
                              if (item.quantity > 1) {
                                handleUpdateQuantity(item.id, -1)
                              } else {
                                handleRemoveItem(item.id, item.product.name)
                              }
                            }}
                            disabled={(item.quantity <= 1 || isLoading)}
                            className="granite-button w-9 h-9 rounded-lg flex items-center justify-center touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Уменьшить количество ${item.product.name}`}
                            type="button"
                            whileHover={shouldReduceMotion || item.quantity <= 1 ? undefined : { scale: 1.1 }}
                            whileTap={shouldReduceMotion || item.quantity <= 1 ? undefined : { scale: 0.9 }}
                            transition={getTransition(shouldReduceMotion, 'fast')}
                          >
                            <Minus className="w-4 h-4 text-gray-200" aria-hidden="true" />
                          </motion.button>
                          <motion.span 
                            key={item.quantity}
                            initial={shouldReduceMotion ? false : { scale: 1.2, opacity: 0.7 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={getTransition(shouldReduceMotion, 'fast')}
                            className="text-lg font-inscription text-gray-900 w-8 text-center"
                            aria-label={`Количество: ${item.quantity}`}
                          >
                            {item.quantity}
                          </motion.span>
                          <motion.button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            disabled={isLoading}
                            className="granite-button w-9 h-9 rounded-lg flex items-center justify-center touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Увеличить количество ${item.product.name}`}
                            type="button"
                            whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }}
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                            transition={getTransition(shouldReduceMotion, 'fast')}
                          >
                            <Plus className="w-4 h-4 text-gray-200" aria-hidden="true" />
                          </motion.button>
                        </div>
                        <motion.button
                          onClick={() => handleRemoveItem(item.id, item.product.name)}
                          className="granite-button w-9 h-9 rounded-lg flex items-center justify-center touch-manipulation"
                          aria-label={`Удалить ${item.product.name} из корзины`}
                          type="button"
                          whileHover={shouldReduceMotion ? undefined : { scale: 1.1, rotate: 5 }}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                          transition={getTransition(shouldReduceMotion, 'fast')}
                        >
                          <Trash2 className="w-4 h-4 text-gray-200" aria-hidden="true" />
                        </motion.button>
                      </div>

                      {/* Item Total */}
                      <div className="pt-2 border-t border-gray-200/50">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-body text-gray-600">Итого:</span>
                          <div className="flex items-baseline gap-1" aria-label={`Итого за товар: ${itemTotal.toLocaleString('ru-RU')} рублей`}>
                            <span className="text-lg font-inscription text-gray-900">
                              {itemTotal.toLocaleString('ru-RU')}
                            </span>
                            <span className="text-sm font-body text-gray-600" aria-hidden="true">₽</span>
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
          variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
          initial="hidden"
          animate="visible"
        >
          <StoneCard variant="elevated" className="cart-summary-card">
            <div className="space-y-4" role="region" aria-label="Итоговая информация о корзине">
              <div className="flex justify-between items-center">
                <span className="text-sm font-body text-gray-600">Товаров:</span>
                <span className="font-inscription text-base text-gray-900" aria-label={`Количество товаров: ${itemsCount}`}>
                  {itemsCount} шт.
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-body text-gray-600">Сумма:</span>
                <div className="flex items-baseline gap-1" aria-label={`Сумма: ${total.toLocaleString('ru-RU')} рублей`}>
                  <span className="font-inscription text-base text-gray-900">
                    {total.toLocaleString('ru-RU')}
                  </span>
                  <span className="text-sm font-body text-gray-600" aria-hidden="true">₽</span>
                </div>
              </div>
              <div className="border-t border-gray-300/50 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-inscription text-gray-900">Итого:</span>
                  {!shouldReduceMotion ? (
                    <motion.div
                      key={total}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={getTransition(shouldReduceMotion, 'fast')}
                      className="flex items-baseline gap-1"
                      aria-label={`Итоговая сумма: ${total.toLocaleString('ru-RU')} рублей`}
                    >
                      <span className="text-3xl font-inscription text-gray-900">
                        {total.toLocaleString('ru-RU')}
                      </span>
                      <span className="text-lg font-body text-gray-600" aria-hidden="true">₽</span>
                    </motion.div>
                  ) : (
                    <div className="flex items-baseline gap-1" aria-label={`Итоговая сумма: ${total.toLocaleString('ru-RU')} рублей`}>
                      <span className="text-3xl font-inscription text-gray-900">
                        {total.toLocaleString('ru-RU')}
                      </span>
                      <span className="text-lg font-body text-gray-600" aria-hidden="true">₽</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </StoneCard>
        </motion.div>
      </div>

      {/* Sticky Checkout Button */}
      <motion.div
        variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
        initial="hidden"
        animate="visible"
        className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom bg-gradient-to-b from-gray-100/50 via-gray-50 to-white border-t border-gray-200/50 px-4 pt-4 pb-6"
      >
        <div className="max-w-md mx-auto">
          <motion.button
            onClick={() => navigate('/checkout')}
            className="granite-button w-full py-4 rounded-xl font-body font-semibold flex items-center gap-3 px-4 touch-manipulation"
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            transition={getTransition(shouldReduceMotion, 'fast')}
            aria-label={`Оформить заказ на сумму ${total.toLocaleString('ru-RU')} рублей`}
            type="button"
          >
            <ShoppingCart className="w-5 h-5" aria-hidden="true" />
            <span className="flex-1 text-left">Оформить заказ</span>
            <div className="flex items-baseline gap-1" aria-hidden="true">
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
