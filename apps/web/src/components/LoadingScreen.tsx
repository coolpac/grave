import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  onComplete: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        onComplete()
      }, 400)
    }, 2000)

    return () => {
      clearTimeout(timer)
    }
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'var(--tg-theme-bg-color, #000000)',
      }}
    >
      {/* Очень subtle каменная текстура - едва заметная */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='stoneNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23stoneNoise)'/%3E%3C/svg%3E")`,
          backgroundSize: '300px 300px',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Минималистичный контент */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col items-center gap-12"
      >
        {/* Простой логотип - только буква, минималистично */}
        <motion.div
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <span
            className="text-6xl font-light tracking-tight"
            style={{
              color: 'rgba(255, 255, 255, 0.95)',
              fontFamily: 'Cinzel, serif',
              fontWeight: 300,
              letterSpacing: '-0.02em',
            }}
          >
            G
          </span>
        </motion.div>

        {/* Минималистичный индикатор загрузки в стиле Apple - тонкая линия */}
        <motion.div
          className="relative w-32 h-px overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {/* Фон линии - очень темный */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          />
          
          {/* Анимированная линия загрузки */}
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              width: '100%',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}






