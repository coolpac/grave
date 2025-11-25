import { useState, useEffect } from 'react'

/**
 * Хук для debounce значения
 * Задерживает обновление значения до тех пор, пока не пройдет указанная задержка
 * 
 * @param value - значение для debounce
 * @param delay - задержка в миллисекундах (по умолчанию 300ms)
 * @returns debounced значение
 * 
 * @example
 * const [searchQuery, setSearchQuery] = useState('')
 * const debouncedSearchQuery = useDebounce(searchQuery, 300)
 * 
 * useEffect(() => {
 *   if (debouncedSearchQuery) {
 *     // Выполнить поиск
 *   }
 * }, [debouncedSearchQuery])
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Устанавливаем таймер для обновления значения
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Очищаем таймер при изменении value или delay
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}












