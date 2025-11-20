/**
 * Telegram Theme Utilities
 * 
 * Provides utilities for adapting to Telegram theme (dark/light mode)
 * and applying theme colors to the application
 */

import WebApp from '@twa-dev/sdk'

export interface TelegramThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
  accent_text_color?: string
  section_bg_color?: string
  section_header_text_color?: string
  subtitle_text_color?: string
  destructive_text_color?: string
}

export type TelegramColorScheme = 'light' | 'dark' | 'auto'

/**
 * Detect if theme is dark or light based on background color
 */
export function detectColorScheme(themeParams: TelegramThemeParams | null): 'light' | 'dark' {
  if (!themeParams?.bg_color) {
    // Fallback: check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }

  // Parse hex color
  const hex = themeParams.bg_color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5 ? 'light' : 'dark'
}

/**
 * Apply Telegram theme colors to CSS variables
 */
export function applyThemeColors(themeParams: TelegramThemeParams | null) {
  if (!themeParams) return

  const root = document.documentElement

  // Apply all available theme colors
  if (themeParams.bg_color) {
    root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color)
  }
  if (themeParams.text_color) {
    root.style.setProperty('--tg-theme-text-color', themeParams.text_color)
  }
  if (themeParams.hint_color) {
    root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color)
  }
  if (themeParams.link_color) {
    root.style.setProperty('--tg-theme-link-color', themeParams.link_color)
  }
  if (themeParams.button_color) {
    root.style.setProperty('--tg-theme-button-color', themeParams.button_color)
  }
  if (themeParams.button_text_color) {
    root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color)
  }
  if (themeParams.secondary_bg_color) {
    root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color)
  }
  if (themeParams.header_bg_color) {
    root.style.setProperty('--tg-theme-header-bg-color', themeParams.header_bg_color)
  }
  if (themeParams.accent_text_color) {
    root.style.setProperty('--tg-theme-accent-text-color', themeParams.accent_text_color)
  }
  if (themeParams.section_bg_color) {
    root.style.setProperty('--tg-theme-section-bg-color', themeParams.section_bg_color)
  }
  if (themeParams.section_header_text_color) {
    root.style.setProperty('--tg-theme-section-header-text-color', themeParams.section_header_text_color)
  }
  if (themeParams.subtitle_text_color) {
    root.style.setProperty('--tg-theme-subtitle-text-color', themeParams.subtitle_text_color)
  }
  if (themeParams.destructive_text_color) {
    root.style.setProperty('--tg-theme-destructive-text-color', themeParams.destructive_text_color)
  }

  // Detect and apply color scheme
  const colorScheme = detectColorScheme(themeParams)
  root.style.setProperty('--tg-color-scheme', colorScheme)
  root.classList.toggle('tg-dark', colorScheme === 'dark')
  root.classList.toggle('tg-light', colorScheme === 'light')
}

/**
 * Get current Telegram theme
 */
export function getTelegramTheme(): TelegramThemeParams | null {
  if (typeof WebApp === 'undefined' || !WebApp) {
    return null
  }
  return WebApp.themeParams || null
}

/**
 * Subscribe to theme changes
 */
export function subscribeToThemeChanges(
  callback: (theme: TelegramThemeParams) => void
): () => void {
  if (typeof WebApp === 'undefined' || !WebApp) {
    return () => {}
  }

  const handleThemeChange = () => {
    const theme = WebApp.themeParams
    if (theme) {
      callback(theme)
    }
  }

  WebApp.onEvent('themeChanged', handleThemeChange)

  return () => {
    WebApp.offEvent('themeChanged', handleThemeChange)
  }
}






