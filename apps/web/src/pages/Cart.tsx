import { Link, useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { ArrowLeft, Trash2, Plus, Minus, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Моковые данные корзины
const mockCartItems = [
  { id: 1, slug: 'product-1', name: 'Товар 1', price: 1999, quantity: 2, image: '📱' },
  { id: 2, slug: 'product-2', name: 'Товар 2', price: 2999, quantity: 1, image: '💻' },
]

export default function Cart() {
  const navigate = useNavigate()
  const { BackButton, MainButton } = useTelegram()
  const [items, setItems] = useState(mockCartItems)

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    BackButton.show()
    BackButton.onClick(() => {
      navigate(-1)
    })

    if (items.length > 0) {
      MainButton.setText(`Оформить заказ • ${total.toLocaleString('ru-RU')} ₽`)
      MainButton.show()
      MainButton.onClick(() => {
        navigate('/checkout')
      })
    } else {
      MainButton.hide()
    }

    return () => {
      BackButton.hide()
      BackButton.offClick(() => {})
      MainButton.hide()
      MainButton.offClick(() => {})
    }
  }, [BackButton, MainButton, navigate, items, total])

  const updateQuantity = (id: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

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
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl font-inscription text-gray-900"
        >
          Корзина
        </motion.h1>
      </div>

      {/* Cart Items */}
      <div className="px-4 space-y-4 pb-32">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                exit: { duration: 0.2 }
              }}
            >
              <StoneCard>
                <div className="flex gap-4">
                  {/* Product Image */}
                  <Link to={`/p/${item.slug}`} className="flex-shrink-0">
                    <div 
                      className="w-24 h-24 rounded-lg flex items-center justify-center text-4xl overflow-hidden"
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
                      <span className="text-3xl">{item.image}</span>
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/p/${item.slug}`}>
                      <h3 className="font-inscription text-lg text-gray-900 mb-1 truncate hover:text-bronze-500 transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    <div className="flex items-baseline gap-1 mb-3">
                      <p className="text-xl font-inscription text-gray-900">
                        {item.price.toLocaleString('ru-RU')}
                      </p>
                      <span className="text-sm font-body text-gray-600">₽</span>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <motion.button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
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
                        </motion.button>
                        <motion.span
                          key={item.quantity}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                          className="text-lg font-inscription text-gray-900 w-8 text-center"
                        >
                          {item.quantity}
                        </motion.span>
                        <motion.button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
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
                        </motion.button>
                      </div>
                      <motion.button
                        onClick={() => removeItem(item.id)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                        whileHover={{ scale: 1.1, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
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
                      </motion.button>
                    </div>

                    {/* Item Total */}
                    <div className="pt-2 border-t border-gray-200/50">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-body text-gray-600">Итого:</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-inscription text-gray-900">
                            {(item.price * item.quantity).toLocaleString('ru-RU')}
                          </span>
                          <span className="text-sm font-body text-gray-600">₽</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </StoneCard>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Summary Card - гранитный стиль */}
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

      {/* Sticky Checkout Button - в стиле других стики кнопок */}
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
