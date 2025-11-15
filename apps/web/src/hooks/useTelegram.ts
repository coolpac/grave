import { useEffect, useState, useCallback, useRef } from 'react'
import WebApp from '@twa-dev/sdk'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface TelegramThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
}

export interface UseTelegramReturn {
  webApp: typeof WebApp
  initDataUnsafe: {
    user?: TelegramUser
    auth_date?: number
    hash?: string
    query_id?: string
    start_param?: string
    [key: string]: any
  } | null
  themeParams: TelegramThemeParams | null
  user: TelegramUser | null
  isReady: boolean
  MainButton: typeof WebApp.MainButton
  BackButton: typeof WebApp.BackButton
  sendDataToServer: () => Promise<boolean>
  expand: () => void
  close: () => void
}

export const useTelegram = (): UseTelegramReturn => {
  const [initDataUnsafe, setInitDataUnsafe] = useState<UseTelegramReturn['initDataUnsafe']>(null)
  const [themeParams, setThemeParams] = useState<TelegramThemeParams | null>(null)
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const isInitialized = useRef(false)

  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    // Проверяем, доступен ли Telegram WebApp SDK (в браузере может быть недоступен)
    if (typeof WebApp === 'undefined' || !WebApp) {
      console.log('Telegram WebApp SDK not available, running in browser mode')
      setIsReady(true)
      return
    }

    try {
      // Инициализация SDK
      WebApp.ready()
      
      // Получение данных
      const unsafe = WebApp.initDataUnsafe
      const theme = WebApp.themeParams
      
      setInitDataUnsafe(unsafe)
      setThemeParams(theme)
      
      if (unsafe?.user) {
        setUser(unsafe.user)
      }

      // Настройка темы
      if (theme?.bg_color) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color)
      }
      if (theme?.text_color) {
        document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color)
      }
      if (theme?.hint_color) {
        document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color)
      }
      if (theme?.link_color) {
        document.documentElement.style.setProperty('--tg-theme-link-color', theme.link_color)
      }
      if (theme?.button_color) {
        document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color)
      }
      if (theme?.button_text_color) {
        document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color)
      }
      if (theme?.secondary_bg_color) {
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color)
      }

      // Расширяем приложение на весь экран
      WebApp.expand()

      // Обработчик изменения темы
      const handleThemeChange = () => {
        const newTheme = WebApp.themeParams
        setThemeParams(newTheme)
        
        if (newTheme?.bg_color) {
          document.documentElement.style.setProperty('--tg-theme-bg-color', newTheme.bg_color)
        }
        if (newTheme?.text_color) {
          document.documentElement.style.setProperty('--tg-theme-text-color', newTheme.text_color)
        }
      }

      WebApp.onEvent('themeChanged', handleThemeChange)

      setIsReady(true)

      return () => {
        WebApp.offEvent('themeChanged', handleThemeChange)
      }
    } catch (error) {
      console.error('Error initializing Telegram WebApp:', error)
      setIsReady(true) // Устанавливаем ready даже при ошибке, чтобы не блокировать приложение
    }
  }, [])

  const sendDataToServer = useCallback(async (): Promise<boolean> => {
    try {
      // Проверяем доступность WebApp SDK
      if (typeof WebApp === 'undefined' || !WebApp) {
        console.log('WebApp SDK not available, skipping validation (browser mode)')
        return true
      }

      const initData = WebApp.initData
      if (!initData) {
        console.warn('No initData available - running in development mode?')
        // В режиме разработки (без Telegram) возвращаем true
        return true
      }

      // В режиме разработки можно использовать dev эндпоинт
      const endpoint = import.meta.env.DEV 
        ? '/api/validate-init-data-dev' 
        : '/api/validate-init-data'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData }),
      })

      if (!response.ok) {
        // Если сервер недоступен, логируем предупреждение но продолжаем работу
        if (import.meta.env.DEV) {
          console.warn('Validation server unavailable, continuing in dev mode')
          return true
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.success === true
    } catch (error) {
      console.error('Error sending initData to server:', error)
      // В режиме разработки возвращаем true для продолжения работы
      if (import.meta.env.DEV) {
        console.warn('Continuing in development mode despite validation error')
        return true
      }
      return false
    }
  }, [])

  const expand = useCallback(() => {
    WebApp.expand()
  }, [])

  const close = useCallback(() => {
    WebApp.close()
  }, [])

  return {
    webApp: WebApp,
    initDataUnsafe,
    themeParams,
    user,
    isReady,
    MainButton: WebApp.MainButton,
    BackButton: WebApp.BackButton,
    sendDataToServer,
    expand,
    close,
  }
}

