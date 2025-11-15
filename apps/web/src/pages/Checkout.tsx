import { useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { ArrowLeft, User, Phone, Mail, MessageSquare, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import PaymentMethodSelect, { PaymentMethod } from '../components/PaymentMethod'
import { motion } from 'framer-motion'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const checkoutSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  phone: z.string().min(10, 'Некорректный номер телефона').regex(/^[\d\s\-\+\(\)]+$/, 'Некорректный формат телефона'),
  email: z.string().email('Некорректный email').optional().or(z.literal('')),
  comment: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export default function Checkout() {
  const navigate = useNavigate()
  const { BackButton, MainButton, user, webApp } = useTelegram()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('invoice')
  const [authToken, setAuthToken] = useState<string | null>(null)

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
          
          if (response.data?.token) {
            localStorage.setItem('token', response.data.token)
            setAuthToken(response.data.token)
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

  useEffect(() => {
    BackButton.show()
    BackButton.onClick(() => {
      navigate(-1)
    })

    return () => {
      BackButton.hide()
      BackButton.offClick(() => {})
      MainButton.hide()
      MainButton.offClick(() => {})
    }
  }, [BackButton, MainButton, navigate])

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true)

    try {
      // Получаем токен если его еще нет
      let token = authToken || localStorage.getItem('token')
      
      // Если токена нет, пытаемся получить через Telegram
      if (!token && typeof webApp !== 'undefined' && webApp?.initData) {
        try {
          const authResponse = await axios.post(`${API_URL}/auth/validate`, {
            initData: webApp.initData,
          })
          if (authResponse.data?.token) {
            token = authResponse.data.token
            localStorage.setItem('token', token)
            setAuthToken(token)
          }
        } catch (authError) {
          console.warn('Failed to authenticate:', authError)
        }
      }

      // Отправка заказа на сервер
      const orderData = {
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email || undefined,
        comment: data.comment || undefined,
        paymentMethod: paymentMethod || 'invoice',
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await axios.post(`${API_URL}/orders`, orderData, { headers })

      // Сохранение данных клиента для будущих заказов
      const customerData = {
        name: data.name,
        phone: data.phone,
        email: data.email || '',
      }
      localStorage.setItem('customer_data', JSON.stringify(customerData))

      setIsSubmitting(false)

      // Переход на экран успеха с номером заказа
      const orderNumber = response.data.orderNumber || response.data.id
      navigate(`/order-success/${orderNumber}`)
    } catch (error: any) {
      console.error('Error creating order:', error)
      setIsSubmitting(false)
      
      // Обработка различных типов ошибок
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        // Если API недоступен, создаем моковый заказ для демонстрации
        if (import.meta.env.DEV) {
          // Сохраняем данные клиента даже при ошибке сети (для демонстрации)
          const customerData = {
            name: data.name,
            phone: data.phone,
            email: data.email || '',
          }
          localStorage.setItem('customer_data', JSON.stringify(customerData))
          
          const mockOrderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          console.warn('API недоступен, используем моковый заказ:', mockOrderNumber)
          navigate(`/order-success/${mockOrderNumber}`)
          return
        }
        alert('Сервер недоступен. Проверьте подключение к интернету и попробуйте позже.')
      } else if (error.response?.status === 401) {
        alert('Ошибка авторизации. Пожалуйста, обновите страницу.')
      } else if (error.response?.status === 400) {
        alert(error.response.data?.message || 'Ошибка при оформлении заказа. Проверьте данные.')
      } else {
        alert('Ошибка при оформлении заказа. Попробуйте позже.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-32">
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
