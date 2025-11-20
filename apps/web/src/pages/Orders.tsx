import { useNavigate } from 'react-router-dom'
import { StoneCard, StoneButton, Skeleton } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, ShoppingBag } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getAnimationVariants, getTransition } from '../utils/animation-variants'

import { API_URL } from '../config/api'

const statusConfig = {
  processing: { 
    label: 'В обработке', 
    icon: Clock, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100'
  },
  completed: { 
    label: 'Завершен', 
    icon: CheckCircle, 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconBg: 'bg-green-100'
  },
  cancelled: { 
    label: 'Отменен', 
    icon: XCircle, 
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100'
  },
}

export default function Orders() {
  const navigate = useNavigate()
  const { BackButton } = useTelegram()
  const { shouldReduceMotion } = useReducedMotion()

  // Используем React Query для оптимизированной загрузки заказов
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      
      if (!token) {
        return []
      }
      
      try {
        const response = await axios.get(`${API_URL}/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          validateStatus: (status) => status < 500,
        })
        
        // Проверяем статус ответа
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token')
          return []
        }
        
        // Проверяем, что данные - массив
        if (Array.isArray(response.data)) {
          return response.data
        } else if (response.data && Array.isArray(response.data.orders)) {
          return response.data.orders
        }
        
        return []
      } catch (error: any) {
        // Обрабатываем только сетевые ошибки, не 401/403
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token')
          return []
        }
        console.error('Error loading orders:', error)
        return []
      }
    },
    staleTime: 30 * 1000, // Кэш на 30 секунд
    gcTime: 5 * 60 * 1000, // Хранить в кэше 5 минут
    retry: 1, // Повторить только 1 раз при ошибке
  })

  // Мемоизированная сортировка заказов по дате (новые сначала)
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA
    })
  }, [orders])

  useEffect(() => {
    let handlerId: string | null = null

    if (BackButton && typeof BackButton.show === 'function') {
      try {
        BackButton.show()
        handlerId = BackButton.onClick(() => {
          navigate(-1)
        }, 'orders-back')
      } catch (error) {
        console.debug('BackButton not supported:', error)
      }
    }

    return () => {
      if (BackButton && typeof BackButton.hide === 'function') {
        try {
          BackButton.hide()
          if (handlerId) {
            BackButton.offClick(handlerId)
          } else if (typeof BackButton.clearHandlers === 'function') {
            BackButton.clearHandlers()
          }
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      }
    }
  }, [BackButton, navigate])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="px-4 pt-6 pb-4">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="granite-button p-2.5 rounded-lg mb-4 touch-manipulation"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5 text-gray-200" aria-hidden="true" />
          </motion.button>
          <Skeleton variant="text" width="40%" height={32} className="mb-6" />
        </div>
        <div className="px-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <StoneCard key={i} className="p-5">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton variant="text" width="60%" height={24} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </div>
                  <Skeleton variant="rectangular" width={100} height={32} className="rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton variant="text" width="80%" height={16} />
                  <Skeleton variant="text" width="70%" height={16} />
                </div>
                <div className="flex justify-between">
                  <Skeleton variant="text" width="30%" height={20} />
                  <Skeleton variant="text" width="40%" height={28} />
                </div>
              </div>
            </StoneCard>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (!isLoading && sortedOrders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="px-4 pt-6 pb-8">
          <motion.button
            variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
            initial="hidden"
            animate="visible"
            onClick={() => navigate(-1)}
            className="granite-button p-2.5 rounded-lg mb-6 touch-manipulation"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5 text-gray-200" aria-hidden="true" />
          </motion.button>
          
          <motion.div
            variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            {!shouldReduceMotion ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={getTransition(shouldReduceMotion, 'normal')}
                className="mb-6"
              >
                <div className="w-24 h-24 rounded-full granite-button flex items-center justify-center mx-auto">
                  <Package className="w-12 h-12 text-gray-200" aria-hidden="true" />
                </div>
              </motion.div>
            ) : (
              <div className="mb-6">
                <div className="w-24 h-24 rounded-full granite-button flex items-center justify-center mx-auto">
                  <Package className="w-12 h-12 text-gray-200" aria-hidden="true" />
                </div>
              </div>
            )}
            <h2 className="text-3xl font-inscription text-gray-900 mb-3">Нет заказов</h2>
            <p className="text-base font-body text-gray-600 mb-24 max-w-sm">
              У вас пока нет оформленных заказов. Начните покупки в нашем каталоге.
            </p>
          </motion.div>
        </div>
        
        {/* Sticky Catalog Button */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-b from-gray-100/50 via-gray-50 to-white border-t border-gray-200/50 safe-area-bottom">
          <div className="px-4 py-3">
            <motion.button
              onClick={() => navigate('/')}
              className="granite-button w-full block text-center font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 touch-manipulation"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              transition={getTransition(shouldReduceMotion, 'fast')}
              aria-label="Перейти в каталог"
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              Перейти в каталог
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <motion.button
          variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
          initial="hidden"
          animate="visible"
          onClick={() => navigate(-1)}
          className="granite-button p-2.5 rounded-lg mb-4 touch-manipulation"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5 text-gray-200" aria-hidden="true" />
        </motion.button>

        <motion.h1
          variants={getAnimationVariants(shouldReduceMotion, 'slideInFromTop')}
          initial="hidden"
          animate="visible"
          className="text-3xl font-inscription text-gray-900"
        >
          Мои заказы
        </motion.h1>
      </div>

      {/* Orders List */}
      <div className="px-4 space-y-4 pb-24">
        <AnimatePresence mode="popLayout" initial={false}>
          {sortedOrders.map((order, index) => {
          const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.processing
          const StatusIcon = statusInfo.icon
          const statusLabel = statusInfo.label
          const statusColor = statusInfo.color
          const statusBg = statusInfo.bgColor
          const statusBorder = statusInfo.borderColor
          const statusIconBg = statusInfo.iconBg

          const formattedDate = new Date(order.createdAt).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })

          return (
            <motion.div
              key={order.id}
              variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              <StoneCard className="overflow-hidden order-card touch-manipulation">
                <div className="p-5 space-y-4">
                  {/* Header: Order Number & Date */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-inscription text-gray-900" aria-label={`Заказ номер ${order.id}`}>
                        Заказ №{order.id}
                      </h3>
                      <p className="text-sm font-body text-gray-600" aria-label={`Дата заказа: ${formattedDate}`}>
                        {formattedDate}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <motion.div
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                      transition={getTransition(shouldReduceMotion, 'fast')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusBorder} ${statusBg} backdrop-blur-sm touch-manipulation`}
                      role="status"
                      aria-label={`Статус заказа: ${statusLabel}`}
                    >
                      <div className={`p-1.5 rounded-md ${statusIconBg}`}>
                        <StatusIcon className={`w-4 h-4 ${statusColor}`} aria-hidden="true" />
                      </div>
                      <span className={`text-sm font-body font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </motion.div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                  {/* Items List */}
                  <div className="space-y-2.5" role="list" aria-label="Список товаров в заказе">
                    {order.items.map((item: any, itemIndex: number) => {
                      const itemTotal = item.price * item.quantity
                      return (
                        <motion.div
                          key={itemIndex}
                          variants={shouldReduceMotion ? undefined : getAnimationVariants(shouldReduceMotion, 'slideIn')}
                          initial="hidden"
                          animate="visible"
                          className="flex items-center justify-between py-1.5"
                          role="listitem"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-bronze-500 opacity-60" aria-hidden="true" />
                            <span className="text-sm font-body text-gray-700" aria-label={`${item.name}, количество: ${item.quantity}`}>
                              {item.name} × {item.quantity}
                            </span>
                          </div>
                          <span className="text-sm font-body font-semibold text-gray-900" aria-label={`Цена: ${itemTotal.toLocaleString('ru-RU')} рублей`}>
                            {itemTotal.toLocaleString('ru-RU')} ₽
                          </span>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                  {/* Total */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-base font-inscription text-gray-900">
                      Итого:
                    </span>
                    <div className="flex items-baseline gap-1" aria-label={`Итоговая сумма заказа: ${order.total.toLocaleString('ru-RU')} рублей`}>
                      <span className="text-2xl font-inscription text-gray-900">
                        {order.total.toLocaleString('ru-RU')}
                      </span>
                      <span className="text-base font-body text-gray-600" aria-hidden="true">₽</span>
                    </div>
                  </div>
                </div>
              </StoneCard>
            </motion.div>
          )
        })}
        </AnimatePresence>
      </div>
    </div>
  )
}

