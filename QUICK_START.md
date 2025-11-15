# 🚀 Быстрый старт

## Запуск проекта

### Из корня проекта (`/Users/who/гробы`):

```bash
# Backend API
pnpm dev:api

# Frontend Web (магазин)
pnpm dev:web

# Frontend Admin (админ-панель)
pnpm dev:admin

# Все сразу
pnpm dev:all
```

### Из отдельных директорий:

**Backend:**
```bash
cd apps/api
pnpm start:dev
# или
pnpm start:dev:ts
```

**Frontend Web:**
```bash
cd apps/web
pnpm dev
```

**Frontend Admin:**
```bash
cd apps/admin
pnpm dev
```

## Настройка базы данных

1. Убедитесь, что в `apps/api/.env` есть:
   ```env
   DATABASE_URL="file:./dev.db"
   ```

2. Если база не создана:
   ```bash
   cd apps/api
   npx prisma migrate dev
   npx prisma generate
   ```

3. Просмотр данных:
   ```bash
   cd apps/api
   npx prisma studio
   ```

## Исправление ошибок TypeScript

Если TypeScript не видит модели Prisma:

1. Перегенерируйте Prisma Client:
   ```bash
   cd apps/api
   npx prisma generate
   ```

2. Перезапустите TypeScript сервер в IDE:
   - VS Code/Cursor: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
   - Или перезапустите IDE

## Порты

- API: `http://localhost:3000`
- Web: `http://localhost:5173` (или другой порт Vite)
- Admin: `http://localhost:5174` (или другой порт Vite)

