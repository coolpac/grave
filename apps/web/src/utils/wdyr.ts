/**
 * Why Did You Render Setup
 * 
 * Инструмент для отладки лишних ре-рендеров в development режиме.
 * Помогает найти компоненты, которые ре-рендерятся без необходимости.
 * 
 * Использование:
 * 1. Импортируйте этот файл в main.tsx перед импортом App
 * 2. Добавьте whyDidYouRender: true в компоненты, которые нужно отслеживать
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   // ...
 * }
 * MyComponent.whyDidYouRender = true
 * ```
 */

import React from 'react'

if (import.meta.env.DEV) {
  try {
    const whyDidYouRender = require('@welldone-software/why-did-you-render')
    
    whyDidYouRender(React, {
      trackAllPureComponents: false, // Не отслеживать все компоненты (слишком много логов)
      trackHooks: true, // Отслеживать изменения в хуках
      trackExtraHooks: [
        // Отслеживать дополнительные хуки
        [require('@tanstack/react-query'), 'useQuery', 'useMutation', 'useQueryClient'],
      ],
      logOnDifferentValues: true, // Логировать когда значения изменились
      hotReloadBufferMs: 500, // Задержка для hot reload
      onlyLogs: false, // Показывать не только логи, но и предупреждения
      collapseGroups: true, // Сворачивать группы в консоли
      titleColor: 'green',
      diffNameColor: 'aqua',
      logOwner: true, // Показывать владельца компонента
    })
  } catch (error) {
    // Игнорируем ошибки если библиотека не установлена
    console.warn('Why Did You Render не может быть инициализирован:', error)
  }
}

export default React

