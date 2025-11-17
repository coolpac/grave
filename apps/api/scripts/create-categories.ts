/**
 * Скрипт для создания категорий из фронтенда в бэкенд
 * 
 * Использование:
 * 1. Убедитесь, что API сервер запущен
 * 2. Получите dev токен: GET http://localhost:3000/api/auth/dev-token
 * 3. Запустите: npx tsx apps/api/scripts/create-categories.ts
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

interface CategoryData {
  slug: string;
  name: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

// Категории из MaterialCategories.tsx
const categories: CategoryData[] = [
  // Мраморные категории
  { slug: 'marble-monuments', name: 'Памятники из мрамора', description: 'Элегантные памятники из натурального мрамора', order: 1, isActive: true },
  { slug: 'marble-popular', name: 'Популярные модели', description: 'Популярные модели мраморных изделий', order: 2, isActive: true },
  { slug: 'marble-slabs', name: 'Плита из мрамора', description: 'Мраморные плиты различных размеров и сортов', order: 3, isActive: true },
  { slug: 'marble-vases', name: 'Вазы', description: 'Декоративные вазы из мрамора', order: 4, isActive: true },
  { slug: 'marble-chips', name: 'Крошка', description: 'Мраморная крошка и песок', order: 5, isActive: true },
  
  // Гранитные категории
  { slug: 'granite-monuments', name: 'Памятники из гранита', description: 'Прочные и долговечные памятники из гранита', order: 6, isActive: true },
  { slug: 'granite-popular', name: 'Популярные модели', description: 'Популярные модели гранитных изделий', order: 7, isActive: true },
  { slug: 'granite-slabs', name: 'Плита из гранита', description: 'Гранитные плиты различных размеров', order: 8, isActive: true },
  { slug: 'granite-vases', name: 'Вазы', description: 'Декоративные вазы из гранита', order: 9, isActive: true },
  { slug: 'granite-chips', name: 'Крошка', description: 'Гранитная крошка и песок', order: 10, isActive: true },
  
  // Дополнительные категории для ритуальных изделий
  { slug: 'ritual-steles', name: 'Стелы ритуальные', description: 'Ритуальные стелы из мрамора и гранита', order: 11, isActive: true },
  { slug: 'ritual-pedestals', name: 'Тумбы ритуальные', description: 'Ритуальные тумбы и основания', order: 12, isActive: true },
  { slug: 'ritual-flowerbeds', name: 'Цветники ритуальные', description: 'Ритуальные цветники', order: 13, isActive: true },
  { slug: 'ritual-sets', name: 'Комплекты ритуальные', description: 'Полные комплекты ритуальных изделий', order: 14, isActive: true },
];

// Функция для получения существующих категорий
async function getCategories(): Promise<any[]> {
  try {
    const response = await axios.get(`${API_URL}/catalog/categories`);
    return response.data;
  } catch (error: any) {
    console.error('Ошибка получения категорий:', error.message);
    throw error;
  }
}

// Функция для создания категории
async function createCategory(category: CategoryData): Promise<void> {
  try {
    const response = await axios.post(
      `${API_URL}/catalog/categories`,
      category,
      { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    );
    console.log(`✓ Создана категория: ${category.name} (ID: ${response.data.id})`);
  } catch (error: any) {
    if (error.response?.status === 409 || error.response?.data?.message?.includes('уже существует')) {
      console.log(`⊘ Категория "${category.name}" уже существует`);
    } else {
      console.error(`✗ Ошибка создания категории "${category.name}":`, error.response?.data || error.message);
      throw error;
    }
  }
}

// Основная функция
async function main() {
  console.log('🚀 Начало создания категорий...\n');

  if (!AUTH_TOKEN) {
    console.error('❌ Ошибка: AUTH_TOKEN не установлен!');
    console.log('Получите токен: GET http://localhost:3000/api/auth/dev-token');
    console.log('Или установите: export AUTH_TOKEN=your_token_here');
    process.exit(1);
  }

  try {
    const existingCategories = await getCategories();
    console.log(`📊 Найдено существующих категорий: ${existingCategories.length}\n`);

    console.log('📦 Создание категорий...\n');

    for (const category of categories) {
      const exists = existingCategories.find(cat => cat.slug === category.slug);
      if (exists) {
        console.log(`⊘ Категория "${category.name}" уже существует (ID: ${exists.id})`);
      } else {
        await createCategory(category);
      }
    }

    console.log('\n✅ Все категории успешно созданы!');
    console.log(`\n📊 Всего категорий: ${categories.length}`);
    console.log('🎉 Готово! Теперь вы можете создавать товары в этих категориях.');

  } catch (error: any) {
    console.error('\n❌ Ошибка при создании категорий:', error.message);
    process.exit(1);
  }
}

// Запуск скрипта
main();

