# 🔧 Обновление файла на сервере

Файл `context-selector.ts` исправлен локально, но нужно обновить его на сервере.

## Способ 1: Через SSH (рекомендуется)

**На сервере выполните:**

```bash
ssh root@94.241.141.194
cd /opt/ritual-app
nano apps/web/src/utils/context-selector.ts
```

Замените функцию `createSplitContext` (строки 87-107) на:

```typescript
export function createSplitContext<T extends Record<string, any>>(
  contexts: { [K in keyof T]: Context<T[K]> },
  initialValue: T
) {
  return {
    Provider: ({ children, value }: { children: React.ReactNode; value: T }) => {
      let result: React.ReactElement = children as React.ReactElement
      
      for (const [key, Context] of Object.entries(contexts)) {
        const ContextValue = value[key as keyof T]
        result = (
          <Context.Provider key={key} value={ContextValue}>
            {result}
          </Context.Provider>
        ) as React.ReactElement
      }
      
      return result
    },
    contexts,
  }
}
```

Сохраните (Ctrl+O, Enter, Ctrl+X) и пересоберите:

```bash
docker-compose -f docker-compose.production.yml build web
docker-compose -f docker-compose.production.yml up -d
```

## Способ 2: Через rsync (с локальной машины)

```bash
rsync -avz apps/web/src/utils/context-selector.ts root@94.241.141.194:/opt/ritual-app/apps/web/src/utils/
```

Затем на сервере:
```bash
ssh root@94.241.141.194
cd /opt/ritual-app
docker-compose -f docker-compose.production.yml build web
docker-compose -f docker-compose.production.yml up -d
```

## Способ 3: Полный деплой (если SSH настроен)

```bash
./deploy.sh production
```

