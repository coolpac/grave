#!/bin/bash
# Альтернативный способ запуска API без nest CLI

cd "$(dirname "$0")"

# Проверяем наличие ts-node
if ! command -v ts-node &> /dev/null; then
  echo "Устанавливаем ts-node..."
  pnpm add -D ts-node
fi

# Запускаем через ts-node
echo "🚀 Запуск API через ts-node..."
NODE_ENV=development ts-node -r tsconfig-paths/register -r reflect-metadata src/main.ts



