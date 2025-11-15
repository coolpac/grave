import { useEffect, useState } from 'react'
import WebApp from '@twa-dev/sdk'

export interface TelegramViewport {
  height: number
  width: number
  isExpanded: boolean
  stableHeight: number
}

export interface UseTgViewportReturn {
  viewport: TelegramViewport | null
  safeAreaInsetTop: number
  viewportHeight: number
  isReady: boolean
}

/**
 * Хук для работы с Telegram WebApp viewport API
 * Управляет CSS переменными для safe area и viewport height
 */
export function useTgViewport(): UseTgViewportReturn {
  const [viewport, setViewport] = useState<TelegramViewport | null>(null)
  const [safeAreaInsetTop, setSafeAreaInsetTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    try {
      // Проверяем доступность WebApp SDK (в браузере может быть недоступен)
      if (typeof WebApp === 'undefined' || !WebApp) {
        // Браузерный режим - используем window.innerHeight
        const fallbackHeight = window.innerHeight
        setSafeAreaInsetTop(0)
        setViewportHeight(fallbackHeight)
        document.documentElement.style.setProperty('--tg-top-safe', '0px')
        document.documentElement.style.setProperty('--vh', `${fallbackHeight / 100}px`)
        setIsReady(true)
        
        // Обновляем при изменении размера окна
        const handleResize = () => {
          const newHeight = window.innerHeight
          document.documentElement.style.setProperty('--vh', `${newHeight / 100}px`)
          setViewportHeight(newHeight)
        }
        
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
      }

      // Получаем начальные значения из Telegram WebApp API
      // Проверяем доступность свойств (могут быть не во всех версиях SDK)
      const stableHeight = (WebApp as any).viewportStableHeight || (WebApp as any).viewport?.stableHeight
      const viewportHeight = (WebApp as any).viewportHeight || (WebApp as any).viewport?.height || window.innerHeight
      const safeAreaInsets = (WebApp as any).safeAreaInsets || (WebApp as any).viewport?.safeAreaInsets

      const initialViewport = stableHeight
        ? {
            height: viewportHeight,
            width: window.innerWidth,
            isExpanded: WebApp.isExpanded || false,
            stableHeight: stableHeight,
          }
        : null

      // Получаем safe area top из Telegram или из CSS env()
      const tgSafeAreaTop = safeAreaInsets?.top || 0
      const cssSafeAreaTop = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--tg-safe-area-inset-top') || 
        getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || 
        '0',
        10
      )
      const initialSafeArea = Math.max(tgSafeAreaTop, cssSafeAreaTop, 0)

      setViewport(initialViewport)
      setSafeAreaInsetTop(initialSafeArea)
      setViewportHeight(initialViewport?.stableHeight || window.innerHeight)

      // Устанавливаем CSS переменные
      document.documentElement.style.setProperty('--tg-top-safe', `${initialSafeArea}px`)
      document.documentElement.style.setProperty('--vh', `${(initialViewport?.stableHeight || window.innerHeight) / 100}px`)

      // Обработчик изменения viewport
      const handleViewportChange = () => {
        const stableHeight = (WebApp as any).viewportStableHeight || (WebApp as any).viewport?.stableHeight
        const viewportHeight = (WebApp as any).viewportHeight || (WebApp as any).viewport?.height || window.innerHeight
        const safeAreaInsets = (WebApp as any).safeAreaInsets || (WebApp as any).viewport?.safeAreaInsets

        const newViewport = stableHeight
          ? {
              height: viewportHeight,
              width: window.innerWidth,
              isExpanded: WebApp.isExpanded || false,
              stableHeight: stableHeight,
            }
          : null

        const tgSafeAreaTop = safeAreaInsets?.top || 0
        const cssSafeAreaTop = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--tg-safe-area-inset-top') || 
          getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || 
          '0',
          10
        )
        const newSafeArea = Math.max(tgSafeAreaTop, cssSafeAreaTop, 0)

        setViewport(newViewport)
        setSafeAreaInsetTop(newSafeArea)
        setViewportHeight(newViewport?.stableHeight || window.innerHeight)

        // Обновляем CSS переменные
        document.documentElement.style.setProperty('--tg-top-safe', `${newSafeArea}px`)
        document.documentElement.style.setProperty('--vh', `${(newViewport?.stableHeight || window.innerHeight) / 100}px`)
      }

      // Обработчик изменения safe area
      const handleSafeAreaChange = () => {
        const safeAreaInsets = (WebApp as any).safeAreaInsets || (WebApp as any).viewport?.safeAreaInsets
        const tgSafeAreaTop = safeAreaInsets?.top || 0
        const cssSafeAreaTop = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--tg-safe-area-inset-top') || 
          getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || 
          '0',
          10
        )
        const newSafeArea = Math.max(tgSafeAreaTop, cssSafeAreaTop, 0)
        setSafeAreaInsetTop(newSafeArea)
        document.documentElement.style.setProperty('--tg-top-safe', `${newSafeArea}px`)
      }

      // Подписываемся на события
      WebApp.onEvent('viewportChanged', handleViewportChange)
      
      // Для safe area используем env() переменные и события изменения размера
      window.addEventListener('resize', handleSafeAreaChange)
      
      // Также проверяем при изменении ориентации
      window.addEventListener('orientationchange', () => {
        setTimeout(handleSafeAreaChange, 100)
      })

      setIsReady(true)

      return () => {
        WebApp.offEvent('viewportChanged', handleViewportChange)
        window.removeEventListener('resize', handleSafeAreaChange)
        window.removeEventListener('orientationchange', handleSafeAreaChange)
      }
    } catch (error) {
      console.error('Error initializing Telegram viewport:', error)
      // Fallback значения для браузера
      const fallbackHeight = window.innerHeight
      setSafeAreaInsetTop(0)
      setViewportHeight(fallbackHeight)
      document.documentElement.style.setProperty('--tg-top-safe', '0px')
      document.documentElement.style.setProperty('--vh', `${fallbackHeight / 100}px`)
      setIsReady(true)
      
      // Обновляем при изменении размера окна (для браузера)
      const handleResize = () => {
        const newHeight = window.innerHeight
        document.documentElement.style.setProperty('--vh', `${newHeight / 100}px`)
        setViewportHeight(newHeight)
      }
      
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  return {
    viewport,
    safeAreaInsetTop,
    viewportHeight,
    isReady,
  }
}

