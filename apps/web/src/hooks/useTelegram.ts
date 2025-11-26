import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import WebApp from '@twa-dev/sdk'
import { OptimizedMainButton, OptimizedBackButton } from '../utils/telegram-buttons'
import { getCloudStorage, CloudStorageAPI } from '../utils/telegram-storage'
import { getHapticFeedback, HapticFeedbackAPI } from '../utils/telegram-haptic'
import { applyThemeColors, getTelegramTheme, subscribeToThemeChanges, TelegramThemeParams } from '../utils/telegram-theme'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface UseTelegramReturn {
  webApp: typeof WebApp | null
  initDataUnsafe: {
    user?: TelegramUser
    auth_date?: number
    hash?: string
    query_id?: string
    start_param?: string
    [key: string]: any
  } | null
  themeParams: TelegramThemeParams | null
  colorScheme: 'light' | 'dark' | 'auto'
  user: TelegramUser | null
  isReady: boolean
  MainButton: OptimizedMainButton
  BackButton: OptimizedBackButton
  CloudStorage: CloudStorageAPI
  HapticFeedback: HapticFeedbackAPI
  sendDataToServer: () => Promise<boolean>
  expand: () => void
  close: () => Promise<boolean>
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  isExpanded: boolean
  version: string
}

/**
 * Throttle function for frequent calls
 */
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => ReturnType<T> {
  let inThrottle: boolean
  let lastResult: ReturnType<T>
  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    if (!inThrottle) {
      lastResult = func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
    return lastResult
  }
}

/**
 * Optimized Telegram WebApp Hook
 * 
 * Features:
 * - Memoized methods
 * - Throttled frequent calls
 * - Lazy initialization
 * - CloudStorage, HapticFeedback, enableClosingConfirmation support
 * - Optimized button lifecycle management
 * - Theme adaptation (dark/light mode)
 */
export const useTelegram = (): UseTelegramReturn => {
  const [initDataUnsafe, setInitDataUnsafe] = useState<UseTelegramReturn['initDataUnsafe']>(null)
  const [themeParams, setThemeParams] = useState<TelegramThemeParams | null>(null)
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | 'auto'>('auto')
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [version, setVersion] = useState('')
  const isInitialized = useRef(false)
  const themeUnsubscribeRef = useRef<(() => void) | null>(null)

  // Create optimized button instances (memoized)
  const mainButtonRef = useRef<OptimizedMainButton | null>(null)
  const backButtonRef = useRef<OptimizedBackButton | null>(null)
  const cloudStorageRef = useRef<CloudStorageAPI | null>(null)
  const hapticFeedbackRef = useRef<HapticFeedbackAPI | null>(null)

  // Lazy initialization
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    // Check if Telegram WebApp SDK is available
    if (typeof WebApp === 'undefined' || !WebApp) {
      console.log('Telegram WebApp SDK not available, running in browser mode')
      setIsReady(true)
      return
    }

    try {
      // Initialize SDK
      WebApp.ready()

      // Get version
      const webAppVersion = (WebApp as any).version || 'unknown'
      setVersion(webAppVersion)

      // Get initial data
      const unsafe = WebApp.initDataUnsafe
      const theme = WebApp.themeParams

      setInitDataUnsafe(unsafe)
      setThemeParams(theme)

      if (unsafe?.user) {
        setUser(unsafe.user)
      }

      // Apply theme colors
      if (theme) {
        applyThemeColors(theme)
        const scheme = theme.bg_color
          ? (parseInt(theme.bg_color.replace('#', '').substring(0, 2), 16) +
             parseInt(theme.bg_color.replace('#', '').substring(2, 4), 16) +
             parseInt(theme.bg_color.replace('#', '').substring(4, 6), 16)) / 3 > 127.5
            ? 'light'
            : 'dark'
          : 'auto'
        setColorScheme(scheme)
      }

      // Expand app to fullscreen (throttled to prevent multiple calls)
      const expandApp = throttle(() => {
        try {
          WebApp.expand()
          setIsExpanded(true)
        } catch (error) {
          console.warn('Failed to expand WebApp:', error)
        }
      }, 100)

      expandApp()

      // Disable vertical swipes to prevent closing by swipe (Bot API 7.7+)
      if (typeof (WebApp as any).disableVerticalSwipes === 'function') {
        try {
          ;(WebApp as any).disableVerticalSwipes()
        } catch (error) {
          console.warn('Failed to disable vertical swipes:', error)
        }
      }

      // Enable closing confirmation (if supported)
      if (typeof (WebApp as any).enableClosingConfirmation === 'function') {
        try {
          ;(WebApp as any).enableClosingConfirmation()
        } catch (error) {
          console.warn('Failed to enable closing confirmation:', error)
        }
      }

      // Request fullscreen mode for immersive experience (Bot API 8.0+)
      if (typeof (WebApp as any).requestFullscreen === 'function') {
        try {
          ;(WebApp as any).requestFullscreen()
        } catch (error) {
          console.warn('Failed to request fullscreen:', error)
        }
      }

      // Lock orientation to portrait for better UX
      if (typeof (WebApp as any).lockOrientation === 'function') {
        try {
          ;(WebApp as any).lockOrientation()
        } catch (error) {
          console.warn('Failed to lock orientation:', error)
        }
      }

      // Subscribe to theme changes
      themeUnsubscribeRef.current = subscribeToThemeChanges((newTheme) => {
        setThemeParams(newTheme)
        applyThemeColors(newTheme)
        const scheme = newTheme.bg_color
          ? (parseInt(newTheme.bg_color.replace('#', '').substring(0, 2), 16) +
             parseInt(newTheme.bg_color.replace('#', '').substring(2, 4), 16) +
             parseInt(newTheme.bg_color.replace('#', '').substring(4, 6), 16)) / 3 > 127.5
            ? 'light'
            : 'dark'
          : 'auto'
        setColorScheme(scheme)
      })

      // Subscribe to viewport changes
      if (typeof WebApp.onEvent === 'function') {
        const handleViewportChange = () => {
          setIsExpanded(WebApp.isExpanded || false)
        }
        WebApp.onEvent('viewportChanged', handleViewportChange)
      }

      setIsReady(true)
    } catch (error) {
      console.error('Error initializing Telegram WebApp:', error)
      setIsReady(true) // Set ready even on error to not block the app
    }

    return () => {
      // Cleanup
      if (themeUnsubscribeRef.current) {
        themeUnsubscribeRef.current()
        themeUnsubscribeRef.current = null
      }
    }
  }, [])

  // Memoized sendDataToServer with throttling
  const sendDataToServer = useCallback(
    throttle(async (): Promise<boolean> => {
      try {
        if (typeof WebApp === 'undefined' || !WebApp) {
          console.log('WebApp SDK not available, skipping validation (browser mode)')
          return true
        }

        const initData = WebApp.initData
        if (!initData) {
          console.warn('No initData available - running in development mode?')
          return true
        }

        // Используем правильный эндпоинт API
        const endpoint = '/api/auth/validate'

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData }),
        })

        if (!response.ok) {
          if (import.meta.env.DEV) {
            console.warn('Validation server unavailable, continuing in dev mode')
            return true
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        
        // ВАЖНО: Сохраняем токен при успешной авторизации
        // API возвращает accessToken (или token для совместимости)
        const token = result.accessToken || result.token
        if (token) {
          localStorage.setItem('token', token)
          console.log('Auth token saved successfully')
        }
        
        // Возвращаем true если есть токен
        return !!token
      } catch (error) {
        console.error('Error sending initData to server:', error)
        if (import.meta.env.DEV) {
          console.warn('Continuing in development mode despite validation error')
          return true
        }
        return false
      }
    }, 1000), // Throttle to max 1 call per second
    []
  )

  // Memoized expand (throttled)
  const expand = useCallback(
    throttle(() => {
      if (typeof WebApp === 'undefined' || !WebApp) return
      try {
        WebApp.expand()
        setIsExpanded(true)
      } catch (error) {
        console.warn('Failed to expand WebApp:', error)
      }
    }, 100),
    []
  )

  // Memoized close
  const close = useCallback(async (): Promise<boolean> => {
    if (typeof WebApp === 'undefined' || !WebApp) return false
    try {
      WebApp.close()
      return true
    } catch (error) {
      console.warn('Failed to close WebApp:', error)
      return false
    }
  }, [])

  // Enable closing confirmation
  const enableClosingConfirmation = useCallback(() => {
    if (typeof WebApp === 'undefined' || !WebApp) return
    try {
      if (typeof (WebApp as any).enableClosingConfirmation === 'function') {
        ;(WebApp as any).enableClosingConfirmation()
      }
    } catch (error) {
      console.warn('Failed to enable closing confirmation:', error)
    }
  }, [])

  // Disable closing confirmation
  const disableClosingConfirmation = useCallback(() => {
    if (typeof WebApp === 'undefined' || !WebApp) return
    try {
      if (typeof (WebApp as any).disableClosingConfirmation === 'function') {
        ;(WebApp as any).disableClosingConfirmation()
      }
    } catch (error) {
      console.warn('Failed to disable closing confirmation:', error)
    }
  }, [])

  // Memoized button instances
  const MainButton = useMemo(() => {
    if (!mainButtonRef.current) {
      mainButtonRef.current = new OptimizedMainButton()
    }
    return mainButtonRef.current
  }, [])

  const BackButton = useMemo(() => {
    if (!backButtonRef.current) {
      backButtonRef.current = new OptimizedBackButton()
    }
    return backButtonRef.current
  }, [])

  // Memoized CloudStorage
  const CloudStorage = useMemo(() => {
    if (!cloudStorageRef.current) {
      cloudStorageRef.current = getCloudStorage()
    }
    return cloudStorageRef.current
  }, [])

  // Memoized HapticFeedback
  const HapticFeedback = useMemo(() => {
    if (!hapticFeedbackRef.current) {
      hapticFeedbackRef.current = getHapticFeedback()
    }
    return hapticFeedbackRef.current
  }, [])

  return {
    webApp: typeof WebApp !== 'undefined' ? WebApp : null,
    initDataUnsafe,
    themeParams,
    colorScheme,
    user,
    isReady,
    MainButton,
    BackButton,
    CloudStorage,
    HapticFeedback,
    sendDataToServer,
    expand,
    close: close as () => Promise<boolean>,
    enableClosingConfirmation,
    disableClosingConfirmation,
    isExpanded,
    version,
  }
}
