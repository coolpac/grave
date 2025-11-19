/**
 * Telegram HapticFeedback Utility
 * 
 * Provides type-safe wrapper for Telegram WebApp HapticFeedback API
 * Handles errors gracefully with no-op fallbacks
 */

import WebApp from '@twa-dev/sdk'

export type HapticFeedbackType = 
  | 'impactOccurred'
  | 'notificationOccurred'
  | 'selectionChanged'

export type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
export type HapticNotificationType = 'error' | 'success' | 'warning'

export interface HapticFeedbackAPI {
  impactOccurred: (style: HapticImpactStyle) => void
  notificationOccurred: (type: HapticNotificationType) => void
  selectionChanged: () => void
}

/**
 * Check if HapticFeedback is available
 */
export function isHapticFeedbackSupported(): boolean {
  if (typeof WebApp === 'undefined' || !WebApp) {
    return false
  }
  
  // HapticFeedback was added in version 6.1
  if (typeof (WebApp as any).isVersionAtLeast === 'function') {
    return (WebApp as any).isVersionAtLeast('6.1')
  }
  
  return typeof (WebApp as any).HapticFeedback !== 'undefined' && 
         (WebApp as any).HapticFeedback !== null
}

/**
 * Get HapticFeedback API with no-op fallback
 */
export function getHapticFeedback(): HapticFeedbackAPI {
  const isSupported = isHapticFeedbackSupported()
  const hapticFeedback = isSupported ? (WebApp as any).HapticFeedback : null

  if (!hapticFeedback) {
    // No-op fallback (haptic feedback is optional)
    return {
      impactOccurred: () => {},
      notificationOccurred: () => {},
      selectionChanged: () => {},
    }
  }

  return {
    impactOccurred: (style: HapticImpactStyle = 'medium') => {
      try {
        hapticFeedback.impactOccurred(style)
      } catch (error) {
        console.warn('HapticFeedback impactOccurred error:', error)
      }
    },
    notificationOccurred: (type: HapticNotificationType) => {
      try {
        hapticFeedback.notificationOccurred(type)
      } catch (error) {
        console.warn('HapticFeedback notificationOccurred error:', error)
      }
    },
    selectionChanged: () => {
      try {
        hapticFeedback.selectionChanged()
      } catch (error) {
        console.warn('HapticFeedback selectionChanged error:', error)
      }
    },
  }
}




