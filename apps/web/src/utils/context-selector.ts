import { useContext, useMemo, useRef, createElement } from 'react'
import type { Context } from 'react'

/**
 * Context Selector Hook
 * 
 * Позволяет подписаться только на часть контекста, избегая лишних ре-рендеров
 * когда изменяются другие части контекста.
 * 
 * @param context - React Context
 * @param selector - Функция для выбора нужной части контекста
 * @param equalityFn - Функция сравнения (по умолчанию Object.is)
 * @returns Выбранное значение из контекста
 * 
 * @example
 * ```tsx
 * const UserContext = createContext({ user: null, theme: 'light' })
 * 
 * function MyComponent() {
 *   // Подписываемся только на user, игнорируя изменения theme
 *   const user = useContextSelector(UserContext, state => state.user)
 *   // ...
 * }
 * ```
 */
export function useContextSelector<T, R>(
  context: Context<T>,
  selector: (value: T) => R,
  equalityFn: (a: R, b: R) => boolean = Object.is
): R {
  const contextValue = useContext(context)
  const selectedValue = selector(contextValue)
  const prevSelectedRef = useRef<R>(selectedValue)
  const selectorRef = useRef(selector)
  const equalityFnRef = useRef(equalityFn)

  // Обновляем refs
  selectorRef.current = selector
  equalityFnRef.current = equalityFn

  // Мемоизируем выбранное значение
  const memoizedValue = useMemo(() => {
    const currentSelected = selectorRef.current(contextValue)
    
    // Если значение не изменилось, возвращаем предыдущее (для стабильности ссылки)
    if (equalityFnRef.current(prevSelectedRef.current, currentSelected)) {
      return prevSelectedRef.current
    }
    
    prevSelectedRef.current = currentSelected
    return currentSelected
  }, [contextValue])

  return memoizedValue
}

/**
 * Создает оптимизированный Context Provider с мемоизацией значения
 * 
 * @param Context - React Context
 * @param value - Значение контекста
 * @param deps - Зависимости для мемоизации
 * @returns Мемоизированное значение для Provider
 * 
 * @example
 * ```tsx
 * const MyContext = createContext({})
 * 
 * function MyProvider({ children, value }) {
 *   const memoizedValue = useMemoizedContextValue(MyContext, value, [value.id])
 *   return <MyContext.Provider value={memoizedValue}>{children}</MyContext.Provider>
 * }
 * ```
 */
export function useMemoizedContextValue<T>(
  value: T,
  deps: React.DependencyList
): T {
  return useMemo(() => value, deps)
}

/**
 * Создает разделенный Context Provider
 * 
 * Разделяет большой контекст на несколько маленьких для лучшей производительности
 */
export function createSplitContext<T extends Record<string, any>>(
  contexts: { [K in keyof T]: Context<T[K]> },
  initialValue: T
) {
  return {
    Provider: ({ children, value }: { children: React.ReactNode; value: T }) => {
      let result: React.ReactNode = children
      
      for (const [key, Context] of Object.entries(contexts)) {
        const ContextValue = value[key as keyof T]
        result = createElement(
          Context.Provider,
          { key, value: ContextValue },
          result
        )
      }
      
      return result
    },
    contexts,
  }
}

