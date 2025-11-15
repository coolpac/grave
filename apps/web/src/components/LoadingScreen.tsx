import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  onComplete: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Показываем экран загрузки минимум 1.5 секунды для плавности
    const timer = setTimeout(() => {
      setIsVisible(false)
      // Даем время на fade-out анимацию перед вызовом onComplete
      setTimeout(onComplete, 500)
    }, 1500)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg"
      style={{
        backgroundColor: 'var(--tg-theme-bg-color, hsl(var(--bg)))',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className="flex flex-col items-center gap-4"
      >
        {/* Логотип - можно заменить на реальный */}
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg"
          style={{
            backgroundColor: 'var(--tg-theme-button-color, hsl(var(--accent)))',
          }}
        >
          <span className="text-3xl font-bold text-white">G</span>
        </motion.div>
        
        {/* Индикатор загрузки */}
        <motion.div
          className="flex gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-accent"
              style={{
                backgroundColor: 'var(--tg-theme-button-color, hsl(var(--accent)))',
              }}
              animate={{
                y: [0, -8, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}






