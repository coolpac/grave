/**
 * Telegram Analytics Hook
 * 
 * Provides analytics tracking for Telegram WebApp events
 * Uses Telegram WebApp event system and optional backend tracking
 */

import { useCallback, useRef } from 'react'
import WebApp from '@twa-dev/sdk'

export type AnalyticsEventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_started'
  | 'checkout_completed'
  | 'order_placed'
  | 'button_click'
  | 'search'
  | 'filter_applied'

export interface AnalyticsEvent {
  type: AnalyticsEventType
  data?: Record<string, any>
  timestamp?: number
}

/**
 * Throttle function for analytics events
 */
function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Hook for Telegram Analytics
 */
export function useTelegramAnalytics() {
  const eventQueueRef = useRef<AnalyticsEvent[]>([])
  const isInitializedRef = useRef(false)

  // Initialize analytics on mount
  const initialize = useCallback(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    // Send queued events
    if (eventQueueRef.current.length > 0) {
      eventQueueRef.current.forEach((event) => {
        sendEvent(event)
      })
      eventQueueRef.current = []
    }
  }, [])

  // Send event to Telegram and optionally to backend
  const sendEvent = useCallback(
    throttle((event: AnalyticsEvent) => {
      try {
        // Add timestamp if not present
        if (!event.timestamp) {
          event.timestamp = Date.now()
        }

        // Send to Telegram WebApp (if available)
        if (typeof WebApp !== 'undefined' && WebApp) {
          // Telegram WebApp doesn't have built-in analytics, but we can use events
          // For now, we'll just log or send to backend
          if (typeof (WebApp as any).sendData === 'function') {
            try {
              ;(WebApp as any).sendData(JSON.stringify(event))
            } catch (error) {
              // sendData might not be available or might fail
              console.debug('Telegram sendData not available:', error)
            }
          }
        }

        // Send to backend analytics endpoint (optional)
        if (import.meta.env.VITE_ANALYTICS_ENABLED === 'true') {
          const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT || '/api/analytics'
          fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }).catch((error) => {
            console.warn('Failed to send analytics event to backend:', error)
          })
        }
      } catch (error) {
        console.error('Error sending analytics event:', error)
      }
    }, 100), // Throttle to max 10 events per second
    []
  )

  // Track page view
  const trackPageView = useCallback(
    (page: string, data?: Record<string, any>) => {
      const event: AnalyticsEvent = {
        type: 'page_view',
        data: {
          page,
          ...data,
        },
      }

      if (isInitializedRef.current) {
        sendEvent(event)
      } else {
        eventQueueRef.current.push(event)
      }
    },
    [sendEvent]
  )

  // Track product view
  const trackProductView = useCallback(
    (productId: string | number, productSlug: string, data?: Record<string, any>) => {
      const event: AnalyticsEvent = {
        type: 'product_view',
        data: {
          productId: String(productId),
          productSlug,
          ...data,
        },
      }

      if (isInitializedRef.current) {
        sendEvent(event)
      } else {
        eventQueueRef.current.push(event)
      }
    },
    [sendEvent]
  )

  // Track add to cart
  const trackAddToCart = useCallback(
    (productId: string | number, quantity: number = 1, data?: Record<string, any>) => {
      const event: AnalyticsEvent = {
        type: 'add_to_cart',
        data: {
          productId: String(productId),
          quantity,
          ...data,
        },
      }

      if (isInitializedRef.current) {
        sendEvent(event)
      } else {
        eventQueueRef.current.push(event)
      }
    },
    [sendEvent]
  )

  // Track remove from cart
  const trackRemoveFromCart = useCallback(
    (productId: string | number, data?: Record<string, any>) => {
      const event: AnalyticsEvent = {
        type: 'remove_from_cart',
        data: {
          productId: String(productId),
          ...data,
        },
      }

      if (isInitializedRef.current) {
        sendEvent(event)
      } else {
        eventQueueRef.current.push(event)
      }
    },
    [sendEvent]
  )

  // Track checkout started
  const trackCheckoutStarted = useCallback(
    (data?: Record<string, any>) => {
      const event: AnalyticsEvent = {
        type: 'checkout_started',
        data,
      }

      if (isInitializedRef.current) {
        sendEvent(event)
      } else {
        eventQueueRef.current.push(event)
      }
    },
    [sendEvent]
  )

  // Track checkout completed
  const trackCheckoutCompleted = useCallback(
    (orderId: string | number, total: number, data?: Record<string, any>) => {
      const event: AnalyticsEvent = {
        type: 'checkout_completed',
        data: {
          orderId: String(orderId),
          total,
          ...data,
        },
      }

      if (isInitializedRef.current) {
        sendEvent(event)
      } else {
        eventQueueRef.current.push(event)
      }
    },
    [sendEvent]
  )

  // Track custom event
  const trackEvent = useCallback(
    (type: AnalyticsEventType, data?: Record<string, any>) => {
      const event: AnalyticsEvent = {
        type,
        data,
      }

      if (isInitializedRef.current) {
        sendEvent(event)
      } else {
        eventQueueRef.current.push(event)
      }
    },
    [sendEvent]
  )

  return {
    initialize,
    trackPageView,
    trackProductView,
    trackAddToCart,
    trackRemoveFromCart,
    trackCheckoutStarted,
    trackCheckoutCompleted,
    trackEvent,
  }
}







