import { useEffect } from 'react'

declare global {
  interface Window {
    hideSplashScreen?: () => void
  }
}

interface LoadingScreenProps {
  onComplete: () => void
}

/**
 * LoadingScreen Component
 * 
 * Этот компонент теперь работает вместе с HTML splash screen.
 * Он только вызывает hideSplashScreen() и затем onComplete().
 * Вся визуальная часть теперь в index.html для мгновенного показа.
 */
export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  useEffect(() => {
    // Минимальное время показа - для плавности
    const minDisplayTime = 800
    const startTime = Date.now()

    const finishLoading = () => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, minDisplayTime - elapsed)
      
      setTimeout(() => {
        // Скрываем HTML splash screen
        if (window.hideSplashScreen) {
          window.hideSplashScreen()
        }
        
        // Небольшая задержка перед показом контента
        setTimeout(() => {
          onComplete()
        }, 100)
      }, remaining)
    }

    // Ждем загрузки критических ресурсов
    if (document.readyState === 'complete') {
      finishLoading()
    } else {
      window.addEventListener('load', finishLoading)
      // Fallback таймер
      const fallbackTimer = setTimeout(finishLoading, 2000)
      
      return () => {
        window.removeEventListener('load', finishLoading)
        clearTimeout(fallbackTimer)
      }
    }
  }, [onComplete])

  // Компонент не рендерит ничего - вся визуализация в HTML
  return null
}






