# ✅ Исправление context-selector.ts - ФИНАЛЬНАЯ ВЕРСИЯ

## Проблема решена!

Использован `React.createElement` вместо JSX в цикле - это решает проблему с типизацией TypeScript.

## Обновление на сервере

**В SSH сессии на сервере выполните:**

```bash
cd /opt/ritual-app
nano apps/web/src/utils/context-selector.ts
```

**Замените функцию `createSplitContext` (строки 87-107) на:**

```typescript
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
```

**И добавьте `createElement` в импорты (строка 1):**

```typescript
import { useContext, useMemo, useRef, useEffect, createElement } from 'react'
```

**Сохраните:** Ctrl+O, Enter, Ctrl+X

**Затем пересоберите:**

```bash
docker-compose -f docker-compose.production.yml build web
docker-compose -f docker-compose.production.yml up -d
```

## Или через rsync (с локальной машины):

```bash
rsync -avz apps/web/src/utils/context-selector.ts root@94.241.141.194:/opt/ritual-app/apps/web/src/utils/
```

Затем на сервере:
```bash
cd /opt/ritual-app
docker-compose -f docker-compose.production.yml build web
docker-compose -f docker-compose.production.yml up -d
```

