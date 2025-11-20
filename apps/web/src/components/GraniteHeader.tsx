import { useEffect, useRef, useState } from 'react'
import { useTgViewport } from '../hooks/useTgViewport'
import { useTelegram } from '../hooks/useTelegram'

/**
 * Пустой Header с эффектом "влажного гранита"
 * Учитывает Telegram viewport и safe area
 */
export default function GraniteHeader() {
  const { safeAreaInsetTop } = useTgViewport()
  const { themeParams } = useTelegram()
  const headerRef = useRef<HTMLElement>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Применяем safe area top padding
    if (headerRef.current) {
      const topPadding = Math.max(safeAreaInsetTop, 0)
      headerRef.current.style.paddingTop = `${topPadding}px`
    }
  }, [safeAreaInsetTop])

  // Всегда используем темную тему для гранитного хедера
  useEffect(() => {
    setIsDark(true)
  }, [])

  return (
    <header
      ref={headerRef}
      className={`granite-header ${isDark ? 'granite-header-dark' : 'granite-header-light'}`}
      style={{
        paddingTop: `max(${safeAreaInsetTop}px, env(safe-area-inset-top, 0px))`,
        marginTop: 0, // Убираем возможные отступы
      }}
      aria-hidden="true"
    />
  )
}

