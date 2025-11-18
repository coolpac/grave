import { useNavigate } from 'react-router-dom'
import { StoneCard, StoneButton } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, ShoppingBag } from 'lucide-react'
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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
  // Начинаем с пустого массива, заказы загрузятся с сервера
  const [orders, setOrders] = useState<any[]>([])
  const hasLoadedRef = useRef(false) // Флаг для предотвращения повторных загрузок

  // Стабильная функция загрузки заказов с useCallback
  const loadOrders = useCallback(async () => {
    // Предотвращаем повторные вызовы
    if (hasLoadedRef.current) {
      return
    }
    
    hasLoadedRef.current = true // Помечаем сразу, чтобы предотвратить повторные вызовы
    
    const token = localStorage.getItem('token')
    
    // Если нет токена, не пытаемся загружать заказы
    if (!token) {
      // Не вызываем setOrders, если уже пустой массив
      return
    }
    
    try {
      const response = await axios.get(`${API_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status < 500, // Не выбрасывать ошибку для 4xx
      })
      
      // Проверяем статус ответа
      if (response.status === 401 || response.status === 403) {
        console.log('Unauthorized, clearing token and using empty orders list')
        localStorage.removeItem('token')
        return
      }
      
      // Проверяем, что данные - массив
      let ordersData: any[] = []
      if (Array.isArray(response.data)) {
        ordersData = response.data
      } else if (response.data && Array.isArray(response.data.orders)) {
        ordersData = response.data.orders
      }
      
      // Обновляем состояние только если есть данные
      if (ordersData.length > 0) {
        setOrders(ordersData)
      }
    } catch (error: any) {
      // Обрабатываем только сетевые ошибки, не 401/403
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Unauthorized, clearing token and using empty orders list')
        localStorage.removeItem('token')
      } else {
        console.error('Error loading orders:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (BackButton && typeof BackButton.show === 'function') {
      try {
        BackButton.show()
        BackButton.onClick(() => {
          navigate(-1)
        })
      } catch (error) {
        console.debug('BackButton not supported:', error)
      }
    }

    // Загружаем заказы только один раз
    loadOrders()

    return () => {
      if (BackButton && typeof BackButton.hide === 'function') {
        try {
          BackButton.hide()
          BackButton.offClick(() => {})
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      }
    }
  }, [BackButton, navigate, loadOrders])

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="px-4 pt-6 pb-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="granite-button p-2.5 rounded-lg mb-6"
          >
            <ArrowLeft className="w-5 h-5 text-gray-200" />
          </motion.button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-6"
            >
              <div className="w-24 h-24 rounded-full granite-button flex items-center justify-center mx-auto">
                <Package className="w-12 h-12 text-gray-200" />
              </div>
            </motion.div>
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
              className="granite-button w-full block text-center font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ShoppingBag className="w-5 h-5" />
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
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="granite-button p-2.5 rounded-lg mb-4"
        >
          <ArrowLeft className="w-5 h-5 text-gray-200" />
        </motion.button>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-inscription text-gray-900"
        >
          Мои заказы
        </motion.h1>
      </div>

      {/* Orders List */}
      <div className="px-4 space-y-4">
        {orders.map((order, index) => {
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <StoneCard className="overflow-hidden">
                <div className="p-5 space-y-4">
                  {/* Header: Order Number & Date */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-inscription text-gray-900">
                        Заказ №{order.id}
                      </h3>
                      <p className="text-sm font-body text-gray-600">
                        {formattedDate}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusBorder} ${statusBg} backdrop-blur-sm`}
                    >
                      <div className={`p-1.5 rounded-md ${statusIconBg}`}>
                        <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                      </div>
                      <span className={`text-sm font-body font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </motion.div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                  {/* Items List */}
                  <div className="space-y-2.5">
                    {order.items.map((item: any, itemIndex: number) => (
                      <motion.div
                        key={itemIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + itemIndex * 0.05 }}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-bronze-500 opacity-60" />
                          <span className="text-sm font-body text-gray-700">
                            {item.name} × {item.quantity}
                          </span>
                        </div>
                        <span className="text-sm font-body font-semibold text-gray-900">
                          {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                  {/* Total */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-base font-inscription text-gray-900">
                      Итого:
                    </span>
                    <span className="text-2xl font-inscription text-gray-900">
                      {order.total.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              </StoneCard>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

