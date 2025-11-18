import { ReactNode, ComponentType } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getAnimationVariants, getTransition } from '../utils/animation-variants'

/**
 * Оптимизированный motion компонент с автоматическим определением reduced motion
 * 
 * Использование:
 * <OptimizedMotion.div variants="fadeIn">...</OptimizedMotion.div>
 */
interface OptimizedMotionProps extends MotionProps {
  variant?: 'fadeIn' | 'slideIn' | 'scaleIn' | 'slideInFromTop'
  children: ReactNode
}

export const OptimizedMotion = {
  div: ({ variant = 'fadeIn', children, ...props }: OptimizedMotionProps) => {
    const { shouldReduceMotion } = useReducedMotion()
    const variants = getAnimationVariants(shouldReduceMotion, variant)
    
    return (
      <motion.div
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={getTransition(shouldReduceMotion, 'normal')}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
  button: ({ variant, children, ...props }: OptimizedMotionProps & { onClick?: () => void }) => {
    const { shouldReduceMotion } = useReducedMotion()
    
    return (
      <motion.button
        whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
        transition={getTransition(shouldReduceMotion, 'fast')}
        {...props}
      >
        {children}
      </motion.button>
    )
  },
  a: ({ variant, children, ...props }: OptimizedMotionProps & { href?: string }) => {
    const { shouldReduceMotion } = useReducedMotion()
    
    return (
      <motion.a
        whileHover={shouldReduceMotion ? undefined : { x: 2 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
        transition={getTransition(shouldReduceMotion, 'fast')}
        {...props}
      >
        {children}
      </motion.a>
    )
  },
}

/**
 * HOC для создания оптимизированных motion компонентов
 */
export function withOptimizedMotion<P extends object>(
  Component: ComponentType<P>
): ComponentType<P & { shouldReduceMotion?: boolean }> {
  return function OptimizedMotionComponent(props: P & { shouldReduceMotion?: boolean }) {
    const { shouldReduceMotion: hookReducedMotion } = useReducedMotion()
    const shouldReduceMotion = props.shouldReduceMotion ?? hookReducedMotion
    
    return <Component {...(props as P)} shouldReduceMotion={shouldReduceMotion} />
  }
}




