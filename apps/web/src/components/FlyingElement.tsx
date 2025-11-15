import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

  useEffect(() => {
    if (trigger) {
      setIsAnimating(true)
      // Сброс через небольшую задержку для повторного использования
      setTimeout(() => {
        setIsAnimating(false)
      }, 700)
    }
  }, [trigger])

  return (
    <AnimatePresence>
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
          transition={{
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          onAnimationComplete={() => {
            setIsAnimating(false)
            onComplete?.()
          }}
          className="fixed z-50 pointer-events-none"
          style={{
            left: 0,
            top: 0,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

