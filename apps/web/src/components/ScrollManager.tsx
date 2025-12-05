/**
 * ScrollManager - АГРЕССИВНОЕ управление скроллом при навигации
 * 
 * Проблема: Браузер автоматически восстанавливает позицию скролла
 * даже после window.scrollTo(0, 0) и history.scrollRestoration = 'manual'!
 * 
 * Решение: МНОГОКРАТНЫЙ сброс скролла в разное время:
 * 1. Немедленно при смене pathname (useLayoutEffect)
 * 2. После первого рендера (useEffect)
 * 3. В следующем фрейме (requestAnimationFrame)
 * 4. Через 0ms (setTimeout - после всех синхронных операций)
 * 5. Через 50ms (дополнительная страховка для iOS)
 * 
 * Также сбрасываем ВСЕ scrollable контейнеры!
 */
import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { debugLog, debugLogger } from './DebugPanel'

export default function ScrollManager() {
  const { pathname } = useLocation()

  // Начальное логирование при монтировании - НЕМЕДЛЕННО
  useEffect(() => {
    console.log('🔄 [ScrollManager] Component mounting...', new Date().toISOString())
    // Используем прямо debugLogger чтобы гарантировать добавление
    debugLogger.log('info', '🔄 ScrollManager component mounted', {
      timestamp: new Date().toISOString(),
      pathname,
      scrollY: window.scrollY,
    })
    // Также через debugLog
    debugLog.info('🔄 ScrollManager component mounted (via debugLog)', {
      timestamp: new Date().toISOString(),
    })
    console.log('🔄 [ScrollManager] Component mounted, logs count:', debugLogger.getLogs().length)
  }, [])

  // Отключаем автоматическое восстановление скролла
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
      debugLog.info('🔧 Scroll restoration disabled')
    }
  }, [])

  // 1. НЕМЕДЛЕННЫЙ сброс ДО paint
  useLayoutEffect(() => {
    const resetScroll = (phase: string) => {
      const beforeScroll = {
        window: window.scrollY,
        documentElement: document.documentElement.scrollTop,
        body: document.body.scrollTop,
      }
      
      // Сбрасываем window
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      
      // Сбрасываем documentElement и body
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      
      // Сбрасываем ВСЕ scrollable контейнеры
      const scrollableElements = document.querySelectorAll(
        '.layout__content, .page-scroll, .content-scroll, .scroll-area, .products-grid, [data-scrollable]'
      )
      const containerScrolls: any[] = []
      scrollableElements.forEach(el => {
        containerScrolls.push({
          selector: el.className || el.tagName,
          before: el.scrollTop,
        })
        el.scrollTop = 0
        el.scrollLeft = 0
      })
      
      const afterScroll = {
        window: window.scrollY,
        documentElement: document.documentElement.scrollTop,
        body: document.body.scrollTop,
      }
      
      if (phase === 'layout' || beforeScroll.window > 0 || beforeScroll.documentElement > 0 || containerScrolls.some(c => c.before > 0)) {
        debugLog.action(`🔄 Scroll reset [${phase}]`, {
          pathname,
          before: beforeScroll,
          after: afterScroll,
          containers: containerScrolls.filter(c => c.before > 0),
        })
      }
    }
    
    // Логируем только если реально был скролл
    const beforeWindow = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
    if (beforeWindow > 0) {
      resetScroll('layout')
    }
  }, [pathname])

  // 2. Дополнительные сбросы ПОСЛЕ рендера (упрощённо)
  useEffect(() => {
    const resetScroll = (phase: string) => {
      const beforeScroll = {
        window: window.scrollY,
        documentElement: document.documentElement.scrollTop,
        body: document.body.scrollTop,
      }
      
      if (beforeScroll.window === 0 && beforeScroll.documentElement === 0 && beforeScroll.body === 0) {
        return
      }

      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      
      const scrollableElements = document.querySelectorAll(
        '.layout__content, .page-scroll, .content-scroll, .scroll-area, .products-grid, [data-scrollable]'
      )
      scrollableElements.forEach(el => {
        el.scrollTop = 0
        el.scrollLeft = 0
      })
      
      const afterScroll = {
        window: window.scrollY,
        documentElement: document.documentElement.scrollTop,
        body: document.body.scrollTop,
      }
      
      // Логируем только если был скролл
      if (beforeScroll.window > 0 || beforeScroll.documentElement > 0) {
        debugLog.action(`🔄 Scroll reset [${phase}]`, {
          pathname,
          before: beforeScroll,
          after: afterScroll,
        })
      }
    }
    
    // Немедленно
    resetScroll('effect-immediate')
    
    // В следующем фрейме
    requestAnimationFrame(() => resetScroll('raf-1'))
    
    // Дополнительная страховка для iOS/Telegram
    const timeout50 = setTimeout(() => resetScroll('timeout-50'), 50)
    
    return () => {
      clearTimeout(timeout50)
    }
  }, [pathname])

  return null
}



