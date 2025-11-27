import { useNavigate } from 'react-router-dom'
import { StoneCard, StoneButton, Skeleton } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { Package, Clock, CheckCircle, XCircle, ShoppingBag, FileText, Wrench, PackageCheck, Gift } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getAnimationVariants, getTransition } from '../utils/animation-variants'

import { API_URL } from '../config/api'

// Конфигурация статусов для ритуальных товаров (без доставки)
const statusConfig: Record<string, {
  label: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  iconBg: string
  step: number
}> = {
  PENDING: { 
    label: 'Новый', 
    icon: FileText, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconBg: 'bg-amber-100',
    step: 1
  },
  CONFIRMED: { 
    label: 'Подтверждён', 
    icon: CheckCircle, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
    step: 2
  },
  PROCESSING: { 
    label: 'В работе', 
    icon: Wrench, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconBg: 'bg-purple-100',
    step: 3
  },
  SHIPPED: { 
    label: 'Готов к выдаче', 
    icon: PackageCheck, 
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    iconBg: 'bg-teal-100',
    step: 4
  },
  DELIVERED: { 
    label: 'Выдан', 
    icon: Gift, 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconBg: 'bg-green-100',
    step: 5
  },
  CANCELLED: { 
    label: 'Отменён', 
    icon: XCircle, 
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100',
    step: -1
  },
  // Fallback для старых статусов
  processing: { 
    label: 'В обработке', 
    icon: Clock, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
    step: 2
  },
  completed: { 
    label: 'Завершён', 
    icon: CheckCircle, 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconBg: 'bg-green-100',
    step: 5
  },
  cancelled: { 
    label: 'Отменён', 
    icon: XCircle, 
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100',
    step: -1
  },
}

// Этапы заказа для timeline (без доставки)
const orderSteps = [
  { key: 'PENDING', label: 'Новый', icon: FileText },
  { key: 'CONFIRMED', label: 'Подтверждён', icon: CheckCircle },
  { key: 'PROCESSING', label: 'В работе', icon: Wrench },
  { key: 'SHIPPED', label: 'Готов', icon: PackageCheck },
  { key: 'DELIVERED', label: 'Выдан', icon: Gift },
]

// Компонент Timeline для отслеживания статуса
const OrderTimeline = ({ currentStatus, shouldReduceMotion }: { currentStatus: string; shouldReduceMotion: boolean }) => {
  const statusInfo = statusConfig[currentStatus] || statusConfig.PENDING
  const currentStep = statusInfo.step
  
  // Если заказ отменён, показываем специальное состояние
  if (currentStep === -1) {
    return (
      <div className="flex items-center justify-center py-3 px-4 bg-red-50 rounded-lg border border-red-200">
        <XCircle className="w-5 h-5 text-red-500 mr-2" />
        <span className="text-sm font-medium text-red-600">Заказ отменён</span>
      </div>
    )
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 z-0" />
        
        {/* Progress line filled */}
        <motion.div 
          className="absolute top-4 left-6 h-0.5 bg-gradient-to-r from-green-500 to-teal-500 z-0"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep - 1) / (orderSteps.length - 1)) * 100}%` }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
          style={{ maxWidth: 'calc(100% - 48px)' }}
        />
        
        {orderSteps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isPending = stepNumber > currentStep
          const StepIcon = step.icon
          
          return (
            <div key={step.key} className="flex flex-col items-center z-10 relative">
              <motion.div
                initial={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { delay: index * 0.1, duration: 0.3 }}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-teal-500 text-white ring-4 ring-teal-100' : ''}
                  ${isPending ? 'bg-gray-100 text-gray-400 border-2 border-gray-200' : ''}
                `}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </motion.div>
              <span className={`
                text-xs mt-1 font-medium text-center max-w-[60px] leading-tight
                ${isCompleted ? 'text-green-600' : ''}
                ${isCurrent ? 'text-teal-600' : ''}
                ${isPending ? 'text-gray-400' : ''}
              `}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
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
        <div className="px-4 pt-4 pb-4">
          {/* Используем Telegram BackButton */}
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
        <div className="px-4 pt-4 pb-8">
          {/* Используем Telegram BackButton */}
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
      {/* Используем Telegram BackButton */}
      <div className="h-2" />

      {/* Header */}
      <div className="px-4 pt-2 pb-4">
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

                  {/* Order Progress Timeline */}
                  <OrderTimeline currentStatus={order.status} shouldReduceMotion={shouldReduceMotion} />

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

