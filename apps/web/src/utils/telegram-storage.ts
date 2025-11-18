/**
 * Telegram CloudStorage Utility
 * 
 * Provides type-safe wrapper for Telegram WebApp CloudStorage API
 * Handles errors gracefully and provides fallback to localStorage
 */

import WebApp from '@twa-dev/sdk'

export interface CloudStorageAPI {
  setItem: (key: string, value: string) => Promise<void>
  getItem: (key: string) => Promise<string | null>
  removeItem: (key: string) => Promise<void>
  getKeys: () => Promise<string[]>
}

/**
 * Check if CloudStorage is available
 */
export function isCloudStorageSupported(): boolean {
  if (typeof WebApp === 'undefined' || !WebApp) {
    return false
  }
  
  // CloudStorage was added in version 6.9
  if (typeof (WebApp as any).isVersionAtLeast === 'function') {
    return (WebApp as any).isVersionAtLeast('6.9')
  }
  
  return typeof (WebApp as any).CloudStorage !== 'undefined' && 
         (WebApp as any).CloudStorage !== null
}

/**
 * Get CloudStorage API with fallback to localStorage
 */
export function getCloudStorage(): CloudStorageAPI {
  const isSupported = isCloudStorageSupported()
  const cloudStorage = isSupported ? (WebApp as any).CloudStorage : null

  if (!cloudStorage) {
    // Fallback to localStorage
    return {
      setItem: async (key: string, value: string) => {
        try {
          localStorage.setItem(`tg_${key}`, value)
        } catch (error) {
          console.warn('Failed to set item in localStorage:', error)
        }
      },
      getItem: async (key: string) => {
        try {
          return localStorage.getItem(`tg_${key}`)
        } catch (error) {
          console.warn('Failed to get item from localStorage:', error)
          return null
        }
      },
      removeItem: async (key: string) => {
        try {
          localStorage.removeItem(`tg_${key}`)
        } catch (error) {
          console.warn('Failed to remove item from localStorage:', error)
        }
      },
      getKeys: async () => {
        try {
          return Object.keys(localStorage)
            .filter(key => key.startsWith('tg_'))
            .map(key => key.replace('tg_', ''))
        } catch (error) {
          console.warn('Failed to get keys from localStorage:', error)
          return []
        }
      },
    }
  }

  return {
    setItem: async (key: string, value: string) => {
      try {
        cloudStorage.setItem(key, value)
      } catch (error) {
        console.error('CloudStorage setItem error:', error)
        // Fallback to localStorage
        try {
          localStorage.setItem(`tg_${key}`, value)
        } catch (e) {
          console.error('localStorage fallback failed:', e)
        }
      }
    },
    getItem: async (key: string) => {
      try {
        return cloudStorage.getItem(key) || null
      } catch (error) {
        console.error('CloudStorage getItem error:', error)
        // Fallback to localStorage
        try {
          return localStorage.getItem(`tg_${key}`)
        } catch (e) {
          console.error('localStorage fallback failed:', e)
          return null
        }
      }
    },
    removeItem: async (key: string) => {
      try {
        cloudStorage.removeItem(key)
      } catch (error) {
        console.error('CloudStorage removeItem error:', error)
        // Fallback to localStorage
        try {
          localStorage.removeItem(`tg_${key}`)
        } catch (e) {
          console.error('localStorage fallback failed:', e)
        }
      }
    },
    getKeys: async () => {
      try {
        return cloudStorage.getKeys()
      } catch (error) {
        console.error('CloudStorage getKeys error:', error)
        // Fallback to localStorage
        try {
          return Object.keys(localStorage)
            .filter(key => key.startsWith('tg_'))
            .map(key => key.replace('tg_', ''))
        } catch (e) {
          console.error('localStorage fallback failed:', e)
          return []
        }
      }
    },
  }
}



