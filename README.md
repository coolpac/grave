# 🏛️ Ритуальные товары - Telegram Mini App

Монorepo проект для продажи ритуальных товаров через Telegram Mini App.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
pnpm install
cd apps/api && pnpm add -D @nestjs/cli
```

### 2. Настройка базы данных

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
```

### 3. Запуск проекта

**Из корня проекта:**
```bash
pnpm dev:api      # API сервер (порт 3000)
pnpm dev:web      # Магазин (порт 5173)
pnpm dev:admin    # Админ-панель (порт 5174)
pnpm dev:all      # Всё сразу
```

**Из отдельных директорий:**
```bash
# API
cd apps/api && pnpm start:dev

# Web
cd apps/web && pnpm dev

# Admin
cd apps/admin && pnpm dev
```

## 📁 Структура проекта

```
├── apps/
│   ├── api/          # NestJS API сервер
│   ├── web/          # React магазин (Telegram Mini App)
│   └── admin/        # React админ-панель
├── packages/          # Общие пакеты
└── prisma/           # Схема базы данных
```

## 🛠️ Технологии

- **Backend:** NestJS, Prisma, SQLite (dev) / PostgreSQL (prod)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Monorepo:** pnpm, Turborepo

## 📚 Документация

- [STARTUP_GUIDE.md](./STARTUP_GUIDE.md) - Подробное руководство по запуску
- [QUICK_START.md](./QUICK_START.md) - Быстрый старт
- [PRODUCT_SYSTEM_PLAN.md](./PRODUCT_SYSTEM_PLAN.md) - Система товаров

## 🔧 Устранение проблем

### `nest: command not found`
```bash
cd apps/api
pnpm add -D @nestjs/cli
```

### Ошибки TypeScript в IDE
Перезапустите TypeScript сервер: `Cmd+Shift+P` → `TypeScript: Restart TS Server`

### База данных не найдена
```bash
cd apps/api
npx prisma migrate dev
```

## 📝 Лицензия

MIT
