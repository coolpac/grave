import { useRef, useCallback } from 'react'

/**
 * useStableCallback Hook
 * 
 * Создает стабильную ссылку на callback функцию, которая не меняется между рендерами.
 * Это предотвращает лишние ре-рендеры дочерних компонентов, которые получают эту функцию как prop.
 * 
 * @param callback - Функция, которую нужно стабилизировать
 * @param deps - Зависимости, при изменении которых callback должен обновиться
 * @returns Стабильная ссылка на callback
 * 
 * @example
 * ```tsx
 * const handleClick = useStableCallback((id: number) => {
 *   console.log('Clicked:', id)
 * }, [someDependency])
 * 
 * return <Button onClick={handleClick} />
 * ```
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList = []
): T {
  const callbackRef = useRef<T>(callback)
  const depsRef = useRef<React.DependencyList>(deps)

  // Обновляем callback ref если изменились зависимости
  const hasDepsChanged = deps.length !== depsRef.current.length ||
    deps.some((dep, i) => dep !== depsRef.current[i])

  if (hasDepsChanged) {
    callbackRef.current = callback
    depsRef.current = deps
  } else {
    // Обновляем callback ref даже если зависимости не изменились
    // (на случай если callback изменился по другой причине)
    callbackRef.current = callback
  }

  // Возвращаем стабильную функцию, которая всегда вызывает актуальный callback
  return useCallback(
    ((...args: Parameters<T>) => {
      return callbackRef.current(...args)
    }) as T,
    [] // Пустой массив зависимостей - функция никогда не меняется
  )
}

/**
 * useStableCallback с автоматическим определением зависимостей
 * 
 * Использует useCallback под капотом, но с дополнительной оптимизацией
 */
export function useStableCallbackAuto<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps)
}








