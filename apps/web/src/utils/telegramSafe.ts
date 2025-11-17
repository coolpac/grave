/**
 * Безопасные обертки для Telegram WebApp API
 * Проверяют поддержку функций перед использованием
 */

import WebApp from '@twa-dev/sdk'

/**
 * Проверяет, поддерживается ли BackButton в текущей версии Telegram
 */
export function isBackButtonSupported(): boolean {
  if (typeof WebApp === 'undefined' || !WebApp) {
    return false
  }
  
  // Проверяем наличие метода isVersionAtLeast
  if (typeof (WebApp as any).isVersionAtLeast === 'function') {
    return (WebApp as any).isVersionAtLeast('6.1')
  }
  
  // Если метод недоступен, проверяем наличие BackButton
  return typeof WebApp.BackButton !== 'undefined' && WebApp.BackButton !== null
}

/**
 * Безопасное использование BackButton
 */
export function safeBackButton() {
  if (!isBackButtonSupported()) {
    return {
      show: () => {},
      hide: () => {},
      onClick: (_callback: () => void) => {},
      offClick: (_callback: () => void) => {},
      isVisible: false,
    }
  }
  
  return WebApp.BackButton
}

/**
 * Безопасное использование MainButton
 */
export function safeMainButton() {
  if (typeof WebApp === 'undefined' || !WebApp || !WebApp.MainButton) {
    return {
      text: '',
      color: '',
      textColor: '',
      isVisible: false,
      isActive: false,
      isProgressVisible: false,
      setText: () => {},
      onClick: () => {},
      offClick: () => {},
      show: () => {},
      hide: () => {},
      enable: () => {},
      disable: () => {},
      showProgress: () => {},
      hideProgress: () => {},
      setParams: () => {},
    }
  }
  
  return WebApp.MainButton
}

