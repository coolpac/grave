import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getTransition } from '../utils/animation-variants'

interface LoadingScreenProps {
  onComplete: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const { shouldReduceMotion } = useReducedMotion()

  useEffect(() => {
    // Убеждаемся что экран виден сразу
    setIsVisible(true)
    
    // На слабых устройствах сокращаем время загрузки
    const loadingTime = shouldReduceMotion ? 800 : 1500
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        onComplete()
      }, shouldReduceMotion ? 150 : 300)
    }, loadingTime)

    return () => {
      clearTimeout(timer)
    }
  }, [onComplete, shouldReduceMotion])

  // На слабых устройствах упрощаем анимацию загрузки
  if (shouldReduceMotion) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color, #000000)',
          zIndex: 99999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          height: '100dvh', // Dynamic viewport height для мобильных
        }}
      >
        <div className="flex flex-col items-center gap-12">
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
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={getTransition(shouldReduceMotion, 'normal')}
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: 'var(--tg-theme-bg-color, #000000)',
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        height: '100dvh', // Dynamic viewport height для мобильных
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
        transition={getTransition(shouldReduceMotion, 'normal')}
        className="flex flex-col items-center gap-12"
      >
        {/* Простой логотип - только буква, минималистично */}
        <motion.div
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={getTransition(shouldReduceMotion, 'normal')}
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
          transition={getTransition(shouldReduceMotion, 'normal')}
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






