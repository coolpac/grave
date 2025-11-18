import { useRef, useEffect } from 'react'

/**
 * useRenderCount Hook
 * 
 * Отслеживает количество рендеров компонента для отладки и оптимизации.
 * 
 * @param componentName - Имя компонента для логирования
 * @param logToConsole - Логировать ли в консоль (по умолчанию только в development)
 * @returns Текущее количество рендеров
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const renderCount = useRenderCount('MyComponent')
 *   // ...
 * }
 * ```
 */
export function useRenderCount(
  componentName?: string,
  logToConsole?: boolean
): number {
  const renderCountRef = useRef(0)
  const shouldLog = logToConsole ?? import.meta.env.DEV

  useEffect(() => {
    renderCountRef.current += 1
    if (shouldLog && componentName) {
      console.log(`[RenderCount] ${componentName}: ${renderCountRef.current}`)
    }
  })

  return renderCountRef.current
}

/**
 * useRenderTracker Hook
 * 
 * Более продвинутый трекер рендеров с детальной информацией
 * 
 * @param componentName - Имя компонента
 * @param trackProps - Отслеживать ли изменения props
 * @returns Объект с информацией о рендерах
 */
export function useRenderTracker(
  componentName: string,
  trackProps = false
) {
  const renderCountRef = useRef(0)
  const prevPropsRef = useRef<any>(null)
  const renderTimesRef = useRef<number[]>([])

  useEffect(() => {
    renderCountRef.current += 1
    const now = performance.now()
    renderTimesRef.current.push(now)

    // Оставляем только последние 10 рендеров
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current.shift()
    }

    if (import.meta.env.DEV) {
      const avgTime = renderTimesRef.current.length > 1
        ? renderTimesRef.current.slice(1).reduce((acc, time, i) => {
            return acc + (time - renderTimesRef.current[i])
          }, 0) / (renderTimesRef.current.length - 1)
        : 0

      console.group(`[RenderTracker] ${componentName}`)
      console.log('Render count:', renderCountRef.current)
      if (trackProps && prevPropsRef.current) {
        console.log('Props changed:', prevPropsRef.current !== null)
      }
      if (avgTime > 0) {
        console.log('Avg time between renders:', `${avgTime.toFixed(2)}ms`)
      }
      console.groupEnd()
    }
  })

  const trackPropsChange = (props: any) => {
    if (trackProps && prevPropsRef.current) {
      const changed = Object.keys(props).some(
        key => prevPropsRef.current[key] !== props[key]
      )
      if (changed && import.meta.env.DEV) {
        console.log(`[RenderTracker] ${componentName} props changed:`, props)
      }
    }
    prevPropsRef.current = props
  }

  return {
    renderCount: renderCountRef.current,
    trackPropsChange,
  }
}


