import { useParams, useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { CheckCircle, Package, Sparkles, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import Header from '../components/Header'

export default function OrderSuccess() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { MainButton, BackButton } = useTelegram()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Скрываем кнопки Telegram, так как это финальный экран
    if (BackButton && typeof BackButton.hide === 'function') {
      try {
        BackButton.hide()
      } catch (error) {
        // Игнорируем ошибки
      }
    }
    if (MainButton && typeof MainButton.hide === 'function') {
      MainButton.hide()
    }

    return () => {
      if (BackButton && typeof BackButton.hide === 'function') {
        try {
          BackButton.hide()
        } catch (error) {
          // Игнорируем ошибки
        }
      }
      if (MainButton && typeof MainButton.hide === 'function') {
        MainButton.hide()
      }
    }
  }, [BackButton, MainButton])

  // Автоматический редирект через 5 секунд
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center min-h-screen px-4 py-8"
        >
          {/* Success Animation - красивый эффект */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              delay: 0.2, 
              type: 'spring', 
              stiffness: 200,
              damping: 15
            }}
            className="relative mb-8"
          >
            {/* Внешний круг с анимацией */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.1, 0.3]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
              }}
            />
            
            {/* Иконка успеха */}
            <div 
              className="relative w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                boxShadow: `
                  0 8px 32px rgba(34, 197, 94, 0.4),
                  inset 0 2px 4px rgba(255, 255, 255, 0.2),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.2)
                `,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
              >
                <CheckCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
              </motion.div>
            </div>

            {/* Блестки вокруг */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="absolute"
                style={{
                  top: '50%',
                  left: '50%',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-80px)`,
                  boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)',
                }}
              />
            ))}
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center space-y-4 mb-8"
          >
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-4xl font-inscription text-gray-900 mb-2"
            >
              Заказ оформлен!
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <Sparkles className="w-5 h-5 text-bronze-500" />
              <p className="text-lg font-body text-gray-700">
                Номер заказа: <span className="font-inscription text-xl text-gray-900">#{id}</span>
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-base font-body text-gray-600 max-w-md mx-auto leading-relaxed"
            >
              Ваш заказ принят в обработку. Мы свяжемся с вами в ближайшее время для подтверждения и уточнения деталей доставки.
            </motion.p>
          </motion.div>

          {/* Order Status Card - гранитный стиль */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="w-full max-w-md mb-8"
          >
            <StoneCard>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
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
                    <Package className="w-6 h-6 text-gray-200" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-body text-gray-600 mb-1">Статус заказа</p>
                    <p className="text-lg font-inscription text-gray-900">В обработке</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200/50 pt-4">
                  <div className="flex items-center gap-2 text-sm font-body text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Вы получите уведомление о статусе заказа в Telegram</span>
                  </div>
                </div>
              </div>
            </StoneCard>
          </motion.div>

          {/* Countdown Timer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center"
          >
            <p className="text-sm font-body text-gray-500">
              Автоматический переход на главную через{' '}
              <span className="font-inscription text-base text-gray-900 font-semibold">
                {countdown}
              </span>{' '}
              {countdown === 1 ? 'секунду' : countdown < 5 ? 'секунды' : 'секунд'}
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

