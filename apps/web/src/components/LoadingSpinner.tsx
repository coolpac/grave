import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
  variant?: 'spinner' | 'dots' | 'pulse' | 'bar'
}

/**
 * Premium Loading Spinner Component
 * 
 * Универсальный компонент загрузки в гранитном стиле.
 * Используется для загрузки страниц, данных и действий.
 */
export default function LoadingSpinner({ 
  size = 'md', 
  text,
  className = '',
  variant = 'spinner'
}: LoadingSpinnerProps) {
  const { shouldReduceMotion } = useReducedMotion()
  
  const sizes = {
    sm: { spinner: 'w-6 h-6', dot: 'w-1 h-1', text: 'text-xs' },
    md: { spinner: 'w-10 h-10', dot: 'w-1.5 h-1.5', text: 'text-sm' },
    lg: { spinner: 'w-14 h-14', dot: 'w-2 h-2', text: 'text-base' },
  }
  
  const currentSize = sizes[size]

  // Simplified version for reduced motion
  if (shouldReduceMotion) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div 
          className={`${currentSize.spinner} rounded-full border-2 border-white/10 border-t-bronze-500/50`}
          style={{ animation: 'spin 1s linear infinite' }}
        />
        {text && <span className={`${currentSize.text} text-white/40 font-body`}>{text}</span>}
      </div>
    )
  }

  // Spinner variant (default)
  if (variant === 'spinner') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className={`relative ${currentSize.spinner}`}>
          {/* Outer rotating ring with granite gradient */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0%, rgba(139, 107, 63, 0.5) 40%, transparent 80%)',
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          
          {/* Inner circle */}
          <div 
            className="absolute inset-[3px] rounded-full"
            style={{
              background: 'linear-gradient(135deg, #0a0a0a 0%, #151515 100%)',
            }}
          />
          
          {/* Center pulsing dot */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div 
              className={`${currentSize.dot} rounded-full`}
              style={{ background: 'rgba(139, 107, 63, 0.7)' }}
            />
          </motion.div>
        </div>
        
        {text && (
          <motion.span 
            className={`${currentSize.text} text-white/40 font-body`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.span>
        )}
      </div>
    )
  }

  // Dots variant
  if (variant === 'dots') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`${currentSize.dot} rounded-full`}
              style={{ background: 'rgba(139, 107, 63, 0.6)' }}
              animate={{
                y: [0, -8, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        {text && <span className={`${currentSize.text} text-white/40 font-body`}>{text}</span>}
      </div>
    )
  }

  // Pulse variant
  if (variant === 'pulse') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className={`relative ${currentSize.spinner}`}>
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139, 107, 63, 0.3) 0%, transparent 70%)',
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          <div 
            className="absolute inset-[25%] rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 107, 63, 0.5) 0%, rgba(139, 107, 63, 0.3) 100%)',
            }}
          />
        </div>
        {text && <span className={`${currentSize.text} text-white/40 font-body`}>{text}</span>}
      </div>
    )
  }

  // Bar variant
  if (variant === 'bar') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className="relative w-24 h-1 rounded-full overflow-hidden bg-white/10">
          <motion.div
            className="absolute inset-y-0 left-0 w-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(139, 107, 63, 0.6) 50%, transparent 100%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </div>
        {text && <span className={`${currentSize.text} text-white/40 font-body`}>{text}</span>}
      </div>
    )
  }

  return null
}

/**
 * Full-page loading overlay
 */
export function LoadingOverlay({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <LoadingSpinner size="lg" text={text} variant="spinner" />
    </div>
  )
}

/**
 * Inline loading indicator
 */
export function InlineLoader({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return <LoadingSpinner size={size} variant="dots" />
}

/**
 * Button loading state
 */
export function ButtonLoader() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  )
}
