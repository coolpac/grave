import { Variants, Transition } from 'framer-motion'

/**
 * Переиспользуемые варианты анимаций для оптимизации производительности
 * 
 * Все анимации оптимизированы для:
 * - Использования transform вместо width/height
 * - Минимальной длительности на мобильных
 * - Упрощенных transitions на слабых устройствах
 */

/**
 * Базовые transition варианты
 */
export const transitions = {
  // Быстрая анимация для мобильных
  fast: {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1], // ease-out
  } as Transition,

  // Средняя анимация
  normal: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1],
  } as Transition,

  // Медленная анимация (только для desktop)
  slow: {
    duration: 0.5,
    ease: [0.4, 0, 0.2, 1],
  } as Transition,

  // Spring анимация (только для desktop, избегаем на mobile)
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  } as Transition,

  // Минимальная анимация для слабых устройств
  minimal: {
    duration: 0.15,
    ease: 'easeOut',
  } as Transition,
}

/**
 * Fade in анимация
 * Использует только opacity для производительности
 */
export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: transitions.fast,
  },
  exit: {
    opacity: 0,
    transition: transitions.fast,
  },
}

/**
 * Slide in анимация
 * Использует transform для производительности
 */
export const slideIn: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    // Используем transform вместо top/left
    x: 0,
  },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    y: -20,
    x: 0,
    transition: transitions.fast,
  },
}

/**
 * Slide in from top
 */
export const slideInFromTop: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: transitions.fast,
  },
}

/**
 * Scale in анимация
 * Использует transform: scale для производительности
 */
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: transitions.fast,
  },
}

/**
 * Hover анимации (только для desktop)
 */
export const hoverScale: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.98,
    transition: transitions.fast,
  },
}

/**
 * Hover с подъемом (только для desktop)
 * Оптимизирован для лучшей производительности
 */
export const hoverLift: Variants = {
  rest: {
    y: 0,
    scale: 1,
  },
  hover: {
    y: -4,
    scale: 1.005,
    transition: {
      ...transitions.fast,
      // Используем более плавную кривую для элегантности
      ease: [0.22, 1, 0.36, 1],
    },
  },
  tap: {
    y: 0,
    scale: 0.995,
    transition: {
      duration: 0.1,
      ease: 'easeOut',
    },
  },
}

/**
 * Stagger children анимация
 * Для списков элементов
 */
export const staggerContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
}

export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
}

/**
 * Минимальные варианты для слабых устройств
 */
export const minimalVariants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: transitions.minimal },
    exit: { opacity: 0, transition: transitions.minimal },
  },
  slideIn: {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: transitions.minimal },
    exit: { opacity: 0, y: -10, transition: transitions.minimal },
  },
}

/**
 * Получить варианты анимации в зависимости от устройства
 */
export function getAnimationVariants(
  shouldReduceMotion: boolean,
  variant: 'fadeIn' | 'slideIn' | 'scaleIn' | 'slideInFromTop'
): Variants {
  if (shouldReduceMotion) {
    // Минимальные анимации для слабых устройств
    switch (variant) {
      case 'fadeIn':
        return minimalVariants.fadeIn
      case 'slideIn':
      case 'slideInFromTop':
        return minimalVariants.slideIn
      case 'scaleIn':
        return minimalVariants.fadeIn // Заменяем scale на fade
      default:
        return minimalVariants.fadeIn
    }
  }

  // Полные анимации для мощных устройств
  switch (variant) {
    case 'fadeIn':
      return fadeIn
    case 'slideIn':
      return slideIn
    case 'scaleIn':
      return scaleIn
    case 'slideInFromTop':
      return slideInFromTop
    default:
      return fadeIn
  }
}

/**
 * Получить transition в зависимости от устройства
 */
export function getTransition(
  shouldReduceMotion: boolean,
  type: 'fast' | 'normal' | 'slow' | 'spring' = 'normal'
): Transition {
  if (shouldReduceMotion) {
    return transitions.minimal
  }

  // На мобильных избегаем spring анимаций
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )

  if (isMobile && type === 'spring') {
    return transitions.normal
  }

  return transitions[type]
}







