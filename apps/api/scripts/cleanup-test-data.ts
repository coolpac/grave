/**
 * Скрипт для деактивации старых тестовых данных
 * 
 * Использование:
 * 1. Убедитесь, что API сервер запущен
 * 2. Получите dev токен: GET http://localhost:3000/api/auth/dev-token
 * 3. Запустите: npx tsx apps/api/scripts/cleanup-test-data.ts
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

// Старые тестовые категории, которые нужно деактивировать
const oldTestCategories = [
  'electronics',
  'clothing',
  'food',
];

// Старые тестовые товары, которые нужно деактивировать
const oldTestProducts = [
  'iphone-15',
  'samsung-galaxy-s24',
  'macbook-pro',
  't-shirt-basic',
  'jeans-classic',
  'pizza-margherita',
  'burger-classic',
];

async function deactivateCategory(slug: string): Promise<void> {
  try {
    // Сначала получаем категорию
    const categoryResponse = await axios.get(`${API_URL}/catalog/categories/${slug}`);
    const category = categoryResponse.data;
    
    if (!category) {
      console.log(`⊘ Категория "${slug}" не найдена`);
      return;
    }

    // Деактивируем категорию
    await axios.patch(
      `${API_URL}/catalog/categories/${category.id}`,
      { isActive: false },
      { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    );
    console.log(`✓ Деактивирована категория: ${category.name} (ID: ${category.id})`);
  } catch (error: any) {
    console.error(`✗ Ошибка деактивации категории "${slug}":`, error.response?.data || error.message);
  }
}

async function deactivateProduct(slug: string): Promise<void> {
  try {
    // Сначала получаем товар
    const productResponse = await axios.get(`${API_URL}/products/slug/${slug}`);
    const product = productResponse.data;
    
    if (!product) {
      console.log(`⊘ Товар "${slug}" не найден`);
      return;
    }

    // Деактивируем товар
    await axios.put(
      `${API_URL}/products/${product.id}`,
      { isActive: false },
      { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    );
    console.log(`✓ Деактивирован товар: ${product.name} (ID: ${product.id})`);
  } catch (error: any) {
    console.error(`✗ Ошибка деактивации товара "${slug}":`, error.response?.data || error.message);
  }
}

async function main() {
  console.log('🧹 Начало очистки старых тестовых данных...\n');

  if (!AUTH_TOKEN) {
    console.error('❌ Ошибка: AUTH_TOKEN не установлен!');
    console.log('Получите токен: GET http://localhost:3000/api/auth/dev-token');
    console.log('Или установите: export AUTH_TOKEN=your_token_here');
    process.exit(1);
  }

  try {
    console.log('📦 Деактивация старых тестовых категорий...\n');
    for (const slug of oldTestCategories) {
      await deactivateCategory(slug);
    }

    console.log('\n📦 Деактивация старых тестовых товаров...\n');
    for (const slug of oldTestProducts) {
      await deactivateProduct(slug);
    }

    console.log('\n✅ Очистка завершена!');
    console.log('📊 Старые тестовые данные деактивированы и больше не будут отображаться на фронтенде.');

  } catch (error: any) {
    console.error('\n❌ Ошибка при очистке:', error.message);
    process.exit(1);
  }
}

// Запуск скрипта
main();

