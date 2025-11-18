/**
 * Prefetch utilities for code splitting optimization
 */

/**
 * Prefetch a page component on hover or touch
 * Uses requestIdleCallback for optimal performance
 */
export const prefetchPage = (importFn: () => Promise<any>) => {
  if (typeof window === 'undefined') return

  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => importFn(), { timeout: 2000 })
  } else {
    setTimeout(() => importFn(), 100)
  }
}

/**
 * Prefetch on link hover/touch
 * Can be used in Link components for better UX
 */
export const usePrefetch = (importFn: () => Promise<any>) => {
  return {
    onMouseEnter: () => prefetchPage(importFn),
    onTouchStart: () => prefetchPage(importFn),
  }
}

