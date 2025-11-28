import { ReactNode, useEffect, useMemo, memo } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { useTgViewport } from '../hooks/useTgViewport'
import { useTelegramAnalytics } from '../hooks/useTelegramAnalytics'
import { useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { themeParams, isReady, expand, enableClosingConfirmation, colorScheme } = useTelegram()
  const location = useLocation()
  const analytics = useTelegramAnalytics()
  useTgViewport() // Инициализация viewport для CSS переменных

  // Мемоизированные стили для предотвращения лишних обновлений
  const containerStyle = useMemo(
    () => ({
      backgroundColor: 'transparent',
      color: 'var(--tg-theme-text-color, hsl(var(--text)))',
      minHeight: '100vh',
    }),
    [] // Стили не зависят от props/state
  )

  // Initialize analytics
  useEffect(() => {
    if (isReady) {
      analytics.initialize()
    }
  }, [isReady, analytics])

  // Track page views
  useEffect(() => {
    if (isReady && location.pathname) {
      analytics.trackPageView(location.pathname, {
        search: location.search,
        hash: location.hash,
      })
    }
  }, [location.pathname, location.search, location.hash, isReady, analytics])

  // Auto-expand and enable closing confirmation on mount
  useEffect(() => {
    if (isReady) {
      // Expand to fullscreen
      expand()
      
      // Enable closing confirmation for better UX
      enableClosingConfirmation()
    }
  }, [isReady, expand, enableClosingConfirmation])

  // Theme is already applied in useTelegram hook, but we ensure it's applied here too
  useEffect(() => {
    // Theme colors are applied in useTelegram hook via applyThemeColors
    // This effect ensures the color scheme class is set
    if (colorScheme !== 'auto') {
      document.documentElement.classList.toggle('tg-dark', colorScheme === 'dark')
      document.documentElement.classList.toggle('tg-light', colorScheme === 'light')
    }
  }, [colorScheme, themeParams])

  return (
    <div
      className="flex flex-col w-full relative z-10"
      style={{
        ...containerStyle,
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

// Мемоизация Layout для предотвращения лишних ре-рендеров
// Layout ре-рендерится только когда изменяются children
export default memo(Layout)

