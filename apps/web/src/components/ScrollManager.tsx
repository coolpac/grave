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

export default function ScrollManager() {
  const { pathname } = useLocation()

  // Отключаем автоматическое восстановление скролла
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  // 1. НЕМЕДЛЕННЫЙ сброс ДО paint
  useLayoutEffect(() => {
    const resetScroll = () => {
      // Сбрасываем window
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      
      // Сбрасываем documentElement и body
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      
      // Сбрасываем ВСЕ scrollable контейнеры
      const scrollableElements = document.querySelectorAll(
        '.layout__content, .page-scroll, .content-scroll, .scroll-area, .products-grid, [data-scrollable]'
      )
      scrollableElements.forEach(el => {
        el.scrollTop = 0
        el.scrollLeft = 0
      })
    }
    
    resetScroll()
  }, [pathname])

  // 2. Дополнительные сбросы ПОСЛЕ рендера
  useEffect(() => {
    const resetScroll = () => {
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
    }
    
    // Немедленно
    resetScroll()
    
    // В следующем фрейме
    requestAnimationFrame(() => {
      resetScroll()
      
      // Ещё раз в следующем фрейме (для надёжности)
      requestAnimationFrame(resetScroll)
    })
    
    // После всех синхронных операций
    const timeout0 = setTimeout(resetScroll, 0)
    
    // Дополнительная страховка для iOS/Telegram
    const timeout50 = setTimeout(resetScroll, 50)
    
    // Финальная проверка
    const timeout100 = setTimeout(resetScroll, 100)
    
    return () => {
      clearTimeout(timeout0)
      clearTimeout(timeout50)
      clearTimeout(timeout100)
    }
  }, [pathname])

  return null
}

