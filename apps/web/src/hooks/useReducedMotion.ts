import { useState, useEffect, useMemo } from 'react'

/**
 * Хук для определения предпочтений пользователя по анимациям
 * 
 * Проверяет:
 * - prefers-reduced-motion media query
 * - Производительность устройства (hardware concurrency, memory)
 * - Мобильные устройства
 * 
 * Возвращает:
 * - shouldReduceMotion: boolean - нужно ли уменьшить анимации
 * - prefersReducedMotion: boolean - пользователь предпочитает уменьшенные анимации
 * - isLowEndDevice: boolean - слабое устройство
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isLowEndDevice, setIsLowEndDevice] = useState(false)

  useEffect(() => {
    // Проверка prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    // Поддержка старых браузеров
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback для старых браузеров
      mediaQuery.addListener(handleChange)
    }

    // Определение слабого устройства
    const checkDevicePerformance = () => {
      const hardwareConcurrency = navigator.hardwareConcurrency || 2
      const deviceMemory = (navigator as any).deviceMemory || 4
      const connection = (navigator as any).connection
      
      // Мобильное устройство
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
      
      // Слабое устройство: мало ядер, мало памяти, медленное соединение
      const lowEnd =
        hardwareConcurrency <= 2 ||
        deviceMemory <= 2 ||
        (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) ||
        (isMobile && hardwareConcurrency <= 4)

      setIsLowEndDevice(lowEnd)
    }

    checkDevicePerformance()

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  // Общее решение: уменьшить анимации если пользователь предпочитает или устройство слабое
  const shouldReduceMotion = useMemo(
    () => prefersReducedMotion || isLowEndDevice,
    [prefersReducedMotion, isLowEndDevice]
  )

  return {
    shouldReduceMotion,
    prefersReducedMotion,
    isLowEndDevice,
  }
}







