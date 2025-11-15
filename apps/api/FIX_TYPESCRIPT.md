# Исправление ошибок TypeScript после перехода на SQLite

## Проблема

После перехода на SQLite TypeScript показывает ошибки, что свойства не существуют в PrismaService. Это происходит потому, что TypeScript сервер в IDE еще не обновил типы.

## Решение

### Вариант 1: Перезапуск TypeScript сервера в IDE

**VS Code / Cursor:**
1. Нажмите `Cmd+Shift+P` (Mac) или `Ctrl+Shift+P` (Windows/Linux)
2. Введите "TypeScript: Restart TS Server"
3. Нажмите Enter

**WebStorm / IntelliJ:**
1. File → Invalidate Caches
2. Выберите "Invalidate and Restart"

### Вариант 2: Пересборка проекта

```bash
cd apps/api
rm -rf node_modules/.pnpm/@prisma+client*
npx prisma generate
```

### Вариант 3: Перезапуск IDE

Просто перезапустите IDE - это обновит все типы.

## Проверка

После перезапуска TypeScript сервера ошибки должны исчезнуть. Если нет - проверьте:

1. Что файл `prisma/dev.db` существует
2. Что миграции применены: `npx prisma migrate status`
3. Что Prisma Client сгенерирован: `npx prisma generate`

## Если ошибки остались

Проверьте, что в `apps/api/src/prisma/prisma.service.ts` правильно настроен PrismaClient:

```typescript
import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient implements OnModuleInit {
  // ...
}
```

