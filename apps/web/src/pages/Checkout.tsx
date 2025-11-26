import { useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { useCart } from '../hooks/useCart'
import { useTelegramAnalytics } from '../hooks/useTelegramAnalytics'
import { User, Phone, Mail, MessageSquare, CheckCircle, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import PaymentMethodSelect, { PaymentMethod } from '../components/PaymentMethod'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import axios from 'axios'

import { API_URL } from '../config/api'

const checkoutSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  phone: z.string().min(10, 'Некорректный номер телефона').regex(/^[\d\s\-\+\(\)]+$/, 'Некорректный формат телефона'),
  email: z.string().email('Некорректный email').optional().or(z.literal('')),
  address: z.string().min(5, 'Адрес должен содержать минимум 5 символов').optional().or(z.literal('')),
  comment: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export default function Checkout() {
  const navigate = useNavigate()
  const { BackButton, MainButton, user, webApp } = useTelegram()
  const { items, isLoading: isCartLoading, total, syncCart } = useCart()
  const analytics = useTelegramAnalytics()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('invoice')
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Track checkout started
  useEffect(() => {
    if (items.length > 0) {
      analytics.trackCheckoutStarted({
        itemsCount: items.length,
        total: total || 0,
        paymentMethod,
      })
    }
  }, [analytics, items.length, total, paymentMethod])

  // Проверка пустой корзины при загрузке страницы
  useEffect(() => {
    if (!isCartLoading && items.length === 0) {
      // Откладываем toast и навигацию, чтобы избежать обновления состояния во время рендера
      setTimeout(() => {
        toast.error('Ваша корзина пуста. Добавьте товары перед оформлением заказа.')
        navigate('/')
      }, 0)
    }
  }, [items.length, isCartLoading, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  })

  // Получение токена авторизации
  useEffect(() => {
    const getAuthToken = async () => {
      // Проверяем токен в localStorage
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        setAuthToken(storedToken)
        return
      }

      // Если токена нет, пытаемся получить через Telegram initData
      try {
        if (typeof webApp !== 'undefined' && webApp?.initData) {
          const response = await axios.post(`${API_URL}/auth/validate`, {
            initData: webApp.initData,
          })
          
          // API возвращает accessToken
          const token = response.data?.accessToken || response.data?.token
          if (token) {
            localStorage.setItem('token', token)
            setAuthToken(token)
          }
        }
      } catch (error) {
        console.warn('Failed to get auth token:', error)
        // В режиме разработки продолжаем без токена
        if (import.meta.env.DEV) {
          console.log('Running in dev mode without auth token')
        }
      }
    }

    getAuthToken()
  }, [webApp])

  // Загрузка сохраненных данных клиента и автозаполнение формы
  useEffect(() => {
    // Сначала проверяем сохраненные данные клиента
    const savedCustomerData = localStorage.getItem('customer_data')
    if (savedCustomerData) {
      try {
        const data = JSON.parse(savedCustomerData)
        if (data.name) setValue('name', data.name)
        if (data.phone) setValue('phone', data.phone)
        if (data.email) setValue('email', data.email)
        if (data.address) setValue('address', data.address)
      } catch (error) {
        console.warn('Failed to parse saved customer data:', error)
      }
    }
    
    // Затем проверяем данные из Telegram (если они есть и не перезаписывают сохраненные)
    if (user) {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
      if (fullName && !savedCustomerData) {
        setValue('name', fullName)
      }
    }
  }, [user, setValue])

  // ВАЖНО: Скрываем Telegram MainButton - у нас своя кнопка оформления
  useEffect(() => {
    // Сразу скрываем MainButton при входе на страницу Checkout
    if (MainButton && typeof MainButton.hide === 'function') {
      try {
        MainButton.hide()
        MainButton.clearHandlers()
      } catch (error) {
        console.debug('MainButton hide error:', error)
      }
    }
  }, [MainButton])

  useEffect(() => {
    if (BackButton && typeof BackButton.show === 'function') {
      try {
        BackButton.show()
        const handlerId = BackButton.onClick(() => {
          navigate(-1)
        }, 'checkout-back')

        return () => {
          if (BackButton && typeof BackButton.hide === 'function') {
            try {
              BackButton.hide()
              BackButton.offClick(handlerId)
            } catch (error) {
              // Игнорируем ошибки при очистке
            }
          }
        }
      } catch (error) {
        console.debug('BackButton not supported:', error)
      }
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
  }, [BackButton, navigate])

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true)

    try {
      // Получаем токен если его еще нет
      let token = authToken || localStorage.getItem('token')
      
      // Получаем Telegram WebApp напрямую из window
      const tgWebApp = (window as any).Telegram?.WebApp
      const initData = tgWebApp?.initData || webApp?.initData
      
      // Если токена нет, пытаемся получить через Telegram
      if (!token && initData) {
        try {
          const authResponse = await axios.post(`${API_URL}/auth/validate`, {
            initData: initData,
          })
          // API возвращает accessToken
          const newToken = (authResponse.data?.accessToken || authResponse.data?.token) as string | undefined
          if (newToken) {
            token = newToken
            localStorage.setItem('token', newToken)
            setAuthToken(newToken)
          }
        } catch (authError) {
          console.warn('Failed to authenticate:', authError)
        }
      }

      // Проверяем доступность Telegram и токена
      const isTelegramAvailable = !!tgWebApp || !!webApp
      
      // Проверяем, что токен есть перед отправкой заказа
      if (!token) {
        setIsSubmitting(false)
        if (!isTelegramAvailable) {
          toast.error('Требуется авторизация. Пожалуйста, откройте приложение через Telegram.')
        } else {
          toast.error('Ошибка авторизации. Попробуйте перезапустить приложение.')
        }
        return
      }

      // ВАЖНО: Синхронизируем корзину с сервером перед оформлением заказа
      console.log('Syncing cart before order...')
      const cartSynced = await syncCart()
      
      if (!cartSynced) {
        setIsSubmitting(false)
        toast.error('Корзина пуста. Добавьте товары перед оформлением заказа.')
        navigate('/')
        return
      }
      
      console.log('Cart synced successfully, creating order...')

      // Отправка заказа на сервер
      const orderData = {
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email || undefined,
        customerAddress: data.address || undefined,
        comment: data.comment || undefined,
        paymentMethod: paymentMethod || 'invoice',
      }

      // Используем уже полученные Telegram данные для авторизации
      const tgUserId = tgWebApp?.initDataUnsafe?.user?.id

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
      
      // Добавляем Telegram хедеры для серверной валидации
      if (initData) {
        headers['X-Telegram-Init-Data'] = initData
      }
      if (tgUserId) {
        headers['X-Tg-Id'] = String(tgUserId)
        headers['X-Tg-User-Id'] = String(tgUserId)
      }

      const response = await axios.post(`${API_URL}/orders`, orderData, { headers })

      // Сохранение данных клиента для будущих заказов
      const customerData = {
        name: data.name,
        phone: data.phone,
        email: data.email || '',
        address: data.address || '',
      }
      localStorage.setItem('customer_data', JSON.stringify(customerData))

      setIsSubmitting(false)

      // Track checkout completed
      const orderId = response.data.id || response.data.orderNumber
      if (orderId) {
        analytics.trackCheckoutCompleted(orderId, total || 0, {
          paymentMethod,
          itemsCount: items.length,
        })
      }

      // Показываем успешное уведомление (откладываем, чтобы избежать обновления состояния во время рендера)
      setTimeout(() => {
        toast.success('Заказ успешно оформлен!', {
          icon: '✅',
          duration: 3000,
        })
      }, 0)

      // Переход на экран успеха с номером заказа
      const orderNumber = response.data.orderNumber || response.data.id
      navigate(`/order-success/${orderNumber}`)
    } catch (error: any) {
      console.error('Error creating order:', error)
      setIsSubmitting(false)
      
      // Обработка различных типов ошибок
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        // Если API недоступен
        if (import.meta.env.DEV) {
          // В dev режиме создаём моковый заказ
          const customerData = {
            name: data.name,
            phone: data.phone,
            email: data.email || '',
            address: data.address || '',
          }
          localStorage.setItem('customer_data', JSON.stringify(customerData))
          
          const mockOrderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          console.warn('API недоступен, используем моковый заказ:', mockOrderNumber)
          toast.success('Заказ создан (dev mode)')
          navigate(`/order-success/${mockOrderNumber}`)
          return
        }
        toast.error('Сервер недоступен. Проверьте подключение к интернету.')
      } else if (error.response?.status === 401) {
        // Токен недействителен - пытаемся обновить
        localStorage.removeItem('token')
        setAuthToken(null)
        
        if (typeof webApp !== 'undefined' && webApp?.initData) {
          try {
            const authResponse = await axios.post(`${API_URL}/auth/validate`, {
              initData: webApp.initData,
            })
            // API возвращает accessToken
            const newToken = authResponse.data?.accessToken || authResponse.data?.token
            if (newToken) {
              localStorage.setItem('token', newToken)
              setAuthToken(newToken)
              
              // Синхронизируем корзину с новым токеном
              await syncCart()
              
              // Повторяем отправку заказа
              const orderData = {
                customerName: data.name,
                customerPhone: data.phone,
                customerEmail: data.email || undefined,
                customerAddress: data.address || undefined,
                comment: data.comment || undefined,
                paymentMethod: paymentMethod || 'invoice',
              }
              
              try {
                const retryResponse = await axios.post(`${API_URL}/orders`, orderData, {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${newToken}`,
                  },
                })
                
                const orderNumber = retryResponse.data.orderNumber || retryResponse.data.id
                toast.success('Заказ успешно оформлен!')
                navigate(`/order-success/${orderNumber}`)
                return
              } catch (retryError: any) {
                console.error('Failed to retry order creation:', retryError)
                toast.error('Не удалось создать заказ. Попробуйте снова.')
              }
            } else {
              toast.error('Ошибка авторизации. Обновите страницу.')
            }
          } catch (authError) {
            console.error('Failed to re-authenticate:', authError)
            toast.error('Ошибка авторизации. Откройте приложение через Telegram.')
          }
        } else {
          toast.error('Требуется авторизация через Telegram.')
        }
      } else if (error.response?.status === 400) {
        // Ошибка валидации или пустая корзина
        const message = error.response.data?.message || 'Ошибка при оформлении заказа'
        if (message.includes('empty') || message.includes('Cart')) {
          toast.error('Корзина пуста. Добавьте товары.')
          navigate('/')
        } else {
          toast.error(message)
        }
      } else {
        toast.error('Ошибка при оформлении заказа. Попробуйте позже.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-32">
      {/* Используем Telegram BackButton */}
      <div className="h-2" />

      {/* Title */}
      <div className="px-4 pb-4 pt-2">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl font-inscription text-gray-900"
        >
          Оформление заказа
        </motion.h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-4 space-y-4">
        {/* Customer Information Card - гранитный стиль */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <StoneCard>
            <div className="space-y-4">
              <h2 className="font-inscription text-xl text-gray-900 mb-4">Контактные данные</h2>

              {/* Имя */}
              <div>
                <label className="block mb-2 font-body text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Имя *</span>
                  </div>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bronze-500/30 focus:border-bronze-500/50 transition-colors"
                  placeholder="Введите ваше имя"
                  style={{ color: '#000' }}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1 font-body">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Телефон */}
              <div>
                <label className="block mb-2 font-body text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>Номер телефона *</span>
                  </div>
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bronze-500/30 focus:border-bronze-500/50 transition-colors"
                  placeholder="+7 (999) 123-45-67"
                  style={{ color: '#000' }}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 mt-1 font-body">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* Email - необязательное поле */}
              <div>
                <label className="block mb-2 font-body text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                    <span className="text-xs text-gray-500 font-normal">(необязательно)</span>
                  </div>
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bronze-500/30 focus:border-bronze-500/50 transition-colors"
                  placeholder="example@mail.com"
                  style={{ color: '#000' }}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1 font-body">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Адрес доставки - необязательное поле */}
              <div>
                <label className="block mb-2 font-body text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>Адрес доставки</span>
                    <span className="text-xs text-gray-500 font-normal">(необязательно)</span>
                  </div>
                </label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bronze-500/30 focus:border-bronze-500/50 transition-colors resize-none"
                  placeholder="Город, улица, дом, квартира"
                  style={{ color: '#000' }}
                />
                {errors.address && (
                  <p className="text-sm text-red-600 mt-1 font-body">
                    {errors.address.message}
                  </p>
                )}
              </div>

              {/* Комментарий - необязательное поле */}
              <div>
                <label className="block mb-2 font-body text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Комментарий</span>
                    <span className="text-xs text-gray-500 font-normal">(необязательно)</span>
                  </div>
                </label>
                <textarea
                  {...register('comment')}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bronze-500/30 focus:border-bronze-500/50 transition-colors resize-none"
                  placeholder="Дополнительная информация, пожелания по доставке и т.д."
                  style={{ color: '#000' }}
                />
              </div>
            </div>
          </StoneCard>
        </motion.div>

        {/* Payment Method Selection - гранитный стиль */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <StoneCard>
            <PaymentMethodSelect value={paymentMethod} onChange={setPaymentMethod} />
          </StoneCard>
        </motion.div>

        {/* Hidden submit button for form submission */}
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>

      {/* Sticky Submit Button - гранитный стиль */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom bg-gradient-to-b from-gray-100/50 via-gray-50 to-white border-t border-gray-200/50 px-4 pt-4 pb-6"
      >
        <div className="max-w-md mx-auto">
          <motion.button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="granite-button w-full py-4 rounded-xl font-body font-semibold flex items-center justify-center gap-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          >
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-gray-200 border-t-transparent rounded-full"
                />
                <span>Оформление...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Подтвердить заказ</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
