import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getTransition } from '../utils/animation-variants'

interface FlyingElementProps {
  trigger: boolean
  from: { x: number; y: number }
  to: { x: number; y: number }
  onComplete?: () => void
  children: React.ReactNode
}

export default function FlyingElement({
  trigger,
  from,
  to,
  onComplete,
  children,
}: FlyingElementProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const { shouldReduceMotion } = useReducedMotion()

  useEffect(() => {
    if (trigger) {
      setIsAnimating(true)
      // Сброс через небольшую задержку для повторного использования
      const duration = shouldReduceMotion ? 300 : 700
      setTimeout(() => {
        setIsAnimating(false)
      }, duration)
    }
  }, [trigger, shouldReduceMotion])

  // На слабых устройствах упрощаем анимацию
  if (shouldReduceMotion) {
    return null // Полностью отключаем анимацию на слабых устройствах
  }

  return (
    <AnimatePresence mode="wait">
      {isAnimating && (
        <motion.div
          initial={{
            x: from.x,
            y: from.y,
            scale: 1,
            opacity: 1,
          }}
          animate={{
            x: to.x,
            y: to.y,
            scale: 0.3,
            opacity: 0.8,
          }}
          exit={{
            scale: 0,
            opacity: 0,
          }}
          transition={getTransition(shouldReduceMotion, 'normal')}
          onAnimationComplete={() => {
            setIsAnimating(false)
            onComplete?.()
          }}
          className="fixed z-50 pointer-events-none"
          style={{
            left: 0,
            top: 0,
            // Используем transform для GPU acceleration
            willChange: 'transform',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

