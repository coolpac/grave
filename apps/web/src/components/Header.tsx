import { useEffect, useRef, useState } from 'react'
import { useTgViewport } from '../hooks/useTgViewport'
import { useTelegram } from '../hooks/useTelegram'
import { debugLog, debugLogger } from './DebugPanel'

/**
 * Header - фиксированный хедер с эффектом "влажного гранита"
 * Учитывает Telegram viewport и safe area
 * Используется на каждой странице отдельно
 */
export default function Header() {
  const { safeAreaInsetTop } = useTgViewport()
  const { themeParams, isReady } = useTelegram()
  const headerRef = useRef<HTMLElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Минимизируем шум: логируем один раз после применения safeArea
  const hasLoggedRef = useRef(false)
  useEffect(() => {
    if (hasLoggedRef.current) return
    hasLoggedRef.current = true
    debugLogger.log('info', '🔵 Header mounted', {
      timestamp: new Date().toISOString(),
      safeAreaInsetTop,
      isReady,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lastPaddingRef = useRef<number | null>(null)
  useEffect(() => {
    // Применяем safe area top padding
    if (headerRef.current) {
      const topPadding = Math.max(safeAreaInsetTop, 0)
      headerRef.current.style.paddingTop = `${topPadding}px`
      
      // Логируем только если реально изменился padding > 0.5px
      if (lastPaddingRef.current === null || Math.abs((lastPaddingRef.current ?? 0) - topPadding) > 0.5) {
        lastPaddingRef.current = topPadding
        setTimeout(() => {
          if (headerRef.current) {
            const rect = headerRef.current.getBoundingClientRect()
            const styles = getComputedStyle(headerRef.current)
            
            debugLog.info('🔵 Header updated', {
              safeAreaInsetTop,
              topPadding,
              position: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              },
              styles: {
                position: styles.position,
                paddingTop: styles.paddingTop,
                backgroundColor: styles.backgroundColor,
                zIndex: styles.zIndex,
              },
            })
          }
        }, 80)
      }
    } else {
      debugLog.warn('⚠️ Header ref is null')
    }
  }, [safeAreaInsetTop])

  // Всегда используем темную тему для гранитного хедера
  useEffect(() => {
    setIsDark(true)
    
    // Логируем информацию о spacer с задержкой для получения актуальных размеров
    setTimeout(() => {
      const spacer = document.querySelector('.granite-header-spacer')
      if (spacer) {
        const spacerRect = spacer.getBoundingClientRect()
        const spacerStyles = getComputedStyle(spacer)
        debugLog.info('📏 Header spacer info', {
          height: spacerRect.height,
          marginTop: spacerStyles.marginTop,
          marginBottom: spacerStyles.marginBottom,
          width: spacerRect.width,
        })
      } else {
        debugLog.warn('⚠️ Header spacer not found')
      }
    }, 200)
  }, [])

  return (
    <div className="granite-header-wrapper">
      <header
        ref={headerRef}
        className={`granite-header ${isDark ? 'granite-header-dark' : 'granite-header-light'}`}
        style={{
          paddingTop: 'var(--header-safe-top)',
          marginTop: 0,
        }}
        aria-hidden="true"
      />
      {/* Spacer для контента под фиксированным хедером */}
      <div className="granite-header-spacer" />
    </div>
  )
}

