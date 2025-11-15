import { ReactNode, useEffect } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { useTgViewport } from '../hooks/useTgViewport'
import GraniteHeader from './GraniteHeader'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { themeParams } = useTelegram()
  useTgViewport() // Инициализация viewport для CSS переменных

  useEffect(() => {
    // Применяем цвета Telegram темы к документу
    if (themeParams) {
      if (themeParams.bg_color) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color)
      }
      if (themeParams.text_color) {
        document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color)
      }
      if (themeParams.secondary_bg_color) {
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color)
      }
    }
  }, [themeParams])

  return (
    <div
      className="flex flex-col w-full safe-area-insets overflow-hidden relative z-10"
      style={{
        backgroundColor: 'transparent',
        color: 'var(--tg-theme-text-color, hsl(var(--text)))',
        height: 'var(--vh, 100vh)',
        minHeight: '100vh',
      }}
    >
      {/* Empty Granite Header */}
      <GraniteHeader />
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

