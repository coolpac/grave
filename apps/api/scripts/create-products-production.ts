/**
 * Скрипт для создания товаров на продакшене
 * 
 * БЕЗОПАСНОСТЬ:
 * - Требует явного указания API_URL и AUTH_TOKEN
 * - Проверяет окружение перед выполнением
 * - Подтверждает действие перед созданием товаров
 * 
 * Использование:
 * 1. Получите токен через админ-панель (войдите через Telegram)
 * 2. Установите переменные окружения:
 *    export API_URL=https://your-domain.com/api
 *    export AUTH_TOKEN=your_token_here
 * 3. Запустите: npx tsx apps/api/scripts/create-products-production.ts
 * 
 * Или интерактивно:
 * npx tsx apps/api/scripts/create-products-production.ts --interactive
 */

import axios from 'axios';
import * as readline from 'readline';

const API_URL = process.env.API_URL || '';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const IS_INTERACTIVE = process.argv.includes('--interactive') || process.argv.includes('-i');

interface ProductData {
  slug: string;
  name: string;
  description?: string;
  categoryId: number;
  productType: 'SIMPLE' | 'SINGLE_VARIANT' | 'MATRIX' | 'RANGE' | 'CONFIGURABLE';
  basePrice?: number;
  unit?: 'PIECE' | 'SQUARE_METER' | 'TON' | 'SET';
  material?: 'MARBLE' | 'GRANITE';
  attributes?: Array<{
    name: string;
    slug: string;
    type?: string;
    order?: number;
    isRequired?: boolean;
    values?: Array<{
      value: string;
      displayName: string;
      order?: number;
    }>;
  }>;
  variants?: Array<{
    name?: string;
    sku?: string;
    price: number;
    stock?: number;
    weight?: number;
    unit?: 'PIECE' | 'SQUARE_METER' | 'TON' | 'SET';
    attributes?: Record<string, string>;
  }>;
  specifications?: Record<string, string>;
}

// Функция для интерактивного ввода
function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Функция для получения категорий
async function getCategories(apiUrl: string, token: string): Promise<any[]> {
  try {
    const response = await axios.get(`${apiUrl}/catalog/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error('❌ Ошибка получения категорий:', error.response?.data || error.message);
    throw error;
  }
}

// Функция для получения категории по slug
async function getCategoryBySlug(
  apiUrl: string,
  token: string,
  slug: string
): Promise<number> {
  const categories = await getCategories(apiUrl, token);
  const category = categories.find((cat: any) => cat.slug === slug);

  if (!category) {
    throw new Error(
      `Категория с slug "${slug}" не найдена. Убедитесь, что категории созданы.`
    );
  }

  return category.id;
}

// Функция для создания товара
async function createProduct(
  apiUrl: string,
  token: string,
  product: ProductData
): Promise<void> {
  try {
    const response = await axios.post(`${apiUrl}/products`, product, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✓ Создан товар: ${product.name} (ID: ${response.data.id})`);
  } catch (error: any) {
    console.error(
      `✗ Ошибка создания товара "${product.name}":`,
      error.response?.data || error.message
    );
    throw error;
  }
}

// Функция для проверки подключения
async function checkConnection(apiUrl: string, token: string): Promise<boolean> {
  try {
    const response = await axios.get(`${apiUrl}/health/live`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error: any) {
    console.error('❌ Не удалось подключиться к API:', error.message);
    return false;
  }
}

// Основная функция
async function main() {
  console.log('🚀 Скрипт создания товаров для продакшена\n');

  let apiUrl = API_URL;
  let authToken = AUTH_TOKEN;

  // Интерактивный режим
  if (IS_INTERACTIVE || !apiUrl || !authToken) {
    console.log('📝 Интерактивный режим\n');

    if (!apiUrl) {
      apiUrl = await question('Введите URL API (например, https://optmramor.ru/api): ');
    }

    if (!authToken) {
      console.log('\n💡 Как получить токен:');
      console.log('1. Откройте админ-панель в браузере');
      console.log('2. Войдите через Telegram');
      console.log('3. Откройте консоль браузера (F12)');
      console.log('4. Выполните: localStorage.getItem("authToken")');
      console.log('5. Скопируйте токен\n');
      authToken = await question('Введите токен авторизации: ');
    }

    console.log('\n⚠️  ВНИМАНИЕ: Вы собираетесь создать товары на продакшене!');
    const confirm = await question('Продолжить? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Отменено пользователем');
      process.exit(0);
    }
  }

  // Проверка обязательных параметров
  if (!apiUrl) {
    console.error('❌ Ошибка: API_URL не установлен!');
    console.log('Установите: export API_URL=https://your-domain.com/api');
    process.exit(1);
  }

  if (!authToken) {
    console.error('❌ Ошибка: AUTH_TOKEN не установлен!');
    console.log('Получите токен через админ-панель или установите: export AUTH_TOKEN=your_token');
    process.exit(1);
  }

  // Проверка подключения
  console.log('\n🔍 Проверка подключения к API...');
  const isConnected = await checkConnection(apiUrl, authToken);
  if (!isConnected) {
    console.error('❌ Не удалось подключиться к API. Проверьте URL и доступность сервера.');
    process.exit(1);
  }
  console.log('✓ Подключение успешно\n');

  try {
    console.log('📦 Получение категорий...\n');

    // Получаем ID категорий
    const marbleSlabsId = await getCategoryBySlug(apiUrl, authToken, 'marble-slabs');
    const marbleChipsId = await getCategoryBySlug(apiUrl, authToken, 'marble-chips');
    const marbleVasesId = await getCategoryBySlug(apiUrl, authToken, 'marble-vases');
    const ritualStelesId = await getCategoryBySlug(apiUrl, authToken, 'ritual-steles');
    const ritualPedestalsId = await getCategoryBySlug(apiUrl, authToken, 'ritual-pedestals');
    const ritualFlowerbedsId = await getCategoryBySlug(apiUrl, authToken, 'ritual-flowerbeds');
    const ritualSetsId = await getCategoryBySlug(apiUrl, authToken, 'ritual-sets');

    console.log('📦 Создание товаров из первого прайс-листа (Каталог 1)...\n');

    // ========== ПЕРВЫЙ ПРАЙС-ЛИСТ (Каталог 1) ==========
    
    // 1. Плита мраморная полированная (MATRIX: Размер × Сорт)
    await createProduct(apiUrl, authToken, {
      slug: 'plita-mramornaya-polirovannaya',
      name: 'Плита мраморная полированная',
      description: 'Полированная мраморная плита серо-голубого уфалейского месторождения',
      categoryId: marbleSlabsId,
      productType: 'MATRIX',
      unit: 'SQUARE_METER',
      material: 'MARBLE',
      attributes: [
        {
          name: 'Размер',
          slug: 'size',
          type: 'select',
          order: 0,
          isRequired: true,
          values: [
            { value: '300*300*15', displayName: '300×300×15 мм', order: 0 },
            { value: '300*600*15', displayName: '300×600×15 мм', order: 1 },
          ],
        },
        {
          name: 'Сорт',
          slug: 'grade',
          type: 'select',
          order: 1,
          isRequired: true,
          values: [
            { value: '1', displayName: 'Сорт 1', order: 0 },
            { value: '2', displayName: 'Сорт 2', order: 1 },
          ],
        },
      ],
      variants: [
        { name: '300×300×15 мм × Сорт 1', price: 2600, stock: 0, attributes: { size: '300*300*15', grade: '1' } },
        { name: '300×300×15 мм × Сорт 2', price: 1600, stock: 0, attributes: { size: '300*300*15', grade: '2' } },
        { name: '300×600×15 мм × Сорт 1', price: 3100, stock: 0, attributes: { size: '300*600*15', grade: '1' } },
        { name: '300×600×15 мм × Сорт 2', price: 1900, stock: 0, attributes: { size: '300*600*15', grade: '2' } },
      ],
      specifications: {
        'Материал': 'Мрамор серо-голубой уфалейский',
        'Обработка': 'Полировка',
        'Единица измерения': 'м²',
      },
    });

    // 2. Заказная плита (SINGLE_VARIANT: Толщина)
    await createProduct(apiUrl, authToken, {
      slug: 'zakaznaya-plita-podokonniki-stupeni',
      name: 'Заказная плита (подоконники, ступени, плиты)',
      description: 'Заказные мраморные плиты для подоконников, ступеней и других изделий',
      categoryId: marbleSlabsId,
      productType: 'SINGLE_VARIANT',
      unit: 'SQUARE_METER',
      material: 'MARBLE',
      attributes: [
        {
          name: 'Толщина',
          slug: 'thickness',
          type: 'select',
          order: 0,
          isRequired: true,
          values: [
            { value: '10', displayName: '10 мм (L до 400мм, W 300мм)', order: 0 },
            { value: '15', displayName: '15 мм (L до 600мм, W 400мм)', order: 1 },
            { value: '20-1', displayName: '20 мм (L до 600мм, W до 400мм)', order: 2 },
            { value: '20-2', displayName: '20 мм (L от 600 до 1200мм, W до 600мм)', order: 3 },
            { value: '30', displayName: '30 мм (L до 1200мм, W до 600мм)', order: 4 },
            { value: '40', displayName: '40 мм (L до 1200мм, W до 600мм)', order: 5 },
          ],
        },
      ],
      variants: [
        { name: '10 мм (L до 400мм, W 300мм)', price: 3200, stock: 0, attributes: { thickness: '10' } },
        { name: '15 мм (L до 600мм, W 400мм)', price: 3600, stock: 0, attributes: { thickness: '15' } },
        { name: '20 мм (L до 600мм, W до 400мм)', price: 4000, stock: 0, attributes: { thickness: '20-1' } },
        { name: '20 мм (L от 600 до 1200мм, W до 600мм)', price: 4400, stock: 0, attributes: { thickness: '20-2' } },
        { name: '30 мм (L до 1200мм, W до 600мм)', price: 6000, stock: 0, attributes: { thickness: '30' } },
        { name: '40 мм (L до 1200мм, W до 600мм)', price: 8000, stock: 0, attributes: { thickness: '40' } },
      ],
      specifications: {
        'Материал': 'Мрамор серо-голубой уфалейский',
        'Применение': 'Подоконники, ступени, плиты',
        'Единица измерения': 'м²',
      },
    });

    // 3. Плитка тротуарная (SIMPLE - по запросу)
    await createProduct(apiUrl, authToken, {
      slug: 'plitka-trotuarnaya-pilenaya',
      name: 'Плитка тротуарная (пиленая)',
      description: 'Тротуарная плитка из мрамора, толщина 70/60 мм, размеры по запросу',
      categoryId: marbleSlabsId,
      productType: 'SIMPLE',
      unit: 'SQUARE_METER',
      material: 'MARBLE',
      basePrice: 0, // Цена по запросу
      specifications: {
        'Материал': 'Мрамор серо-голубой уфалейский',
        'Обработка': 'Пиленая',
        'Толщина': '70/60 мм',
        'Размеры': 'По запросу',
        'Цена': 'По запросу',
      },
    });

    // 4. Мраморная брекчия (SINGLE_VARIANT: Форма)
    await createProduct(apiUrl, authToken, {
      slug: 'mramornaya-brekchiya',
      name: 'Мраморная брекчия',
      description: 'Мраморная брекчия толщиной 15 мм',
      categoryId: marbleSlabsId,
      productType: 'SINGLE_VARIANT',
      unit: 'SQUARE_METER',
      material: 'MARBLE',
      attributes: [
        {
          name: 'Форма',
          slug: 'form',
          type: 'select',
          order: 0,
          isRequired: true,
          values: [
            { value: 'regular-polished', displayName: 'Правильной формы (полир.)', order: 0 },
            { value: 'arbitrary-unpolished', displayName: 'Произвольной формы (не полир)', order: 1 },
          ],
        },
      ],
      variants: [
        { name: 'Правильной формы (полир.)', price: 750, stock: 0, attributes: { form: 'regular-polished' } },
        { name: 'Произвольной формы (не полир)', price: 550, stock: 0, attributes: { form: 'arbitrary-unpolished' } },
      ],
      specifications: {
        'Материал': 'Мрамор серо-голубой уфалейский',
        'Толщина': '15 мм',
        'Единица измерения': 'м²',
      },
    });

    // 5. Декоративная мраморная крошка и песок (MATRIX: Фракция × Упаковка)
    await createProduct(apiUrl, authToken, {
      slug: 'mramornaya-kroshka-pesok',
      name: 'Декоративная мраморная крошка, песок',
      description: 'Декоративная мраморная крошка и песок различных фракций',
      categoryId: marbleChipsId,
      productType: 'MATRIX',
      unit: 'TON',
      material: 'MARBLE',
      attributes: [
        {
          name: 'Фракция',
          slug: 'fraction',
          type: 'select',
          order: 0,
          isRequired: true,
          values: [
            { value: '10-20-tumbled', displayName: 'Крошка (галтованная) 10-20 мм', order: 0 },
            { value: '10-20', displayName: 'Крошка 10-20 мм', order: 1 },
            { value: '5-10', displayName: 'Крошка 5-10 мм', order: 2 },
            { value: '0-5', displayName: 'Песок 0-5 мм', order: 3 },
          ],
        },
        {
          name: 'Упаковка',
          slug: 'packaging',
          type: 'select',
          order: 1,
          isRequired: true,
          values: [
            { value: 'bulk', displayName: 'Навал', order: 0 },
            { value: 'bigbag', displayName: 'В МКР', order: 1 },
          ],
        },
      ],
      variants: [
        // Крошка галтованная 10-20 мм - только в МКР
        { name: 'Крошка (галтованная) 10-20 мм × В МКР', price: 6500, stock: 0, attributes: { fraction: '10-20-tumbled', packaging: 'bigbag' } },
        // Крошка 10-20 мм
        { name: 'Крошка 10-20 мм × Навал', price: 2500, stock: 0, attributes: { fraction: '10-20', packaging: 'bulk' } },
        { name: 'Крошка 10-20 мм × В МКР', price: 3500, stock: 0, attributes: { fraction: '10-20', packaging: 'bigbag' } },
        // Крошка 5-10 мм
        { name: 'Крошка 5-10 мм × Навал', price: 1800, stock: 0, attributes: { fraction: '5-10', packaging: 'bulk' } },
        { name: 'Крошка 5-10 мм × В МКР', price: 2800, stock: 0, attributes: { fraction: '5-10', packaging: 'bigbag' } },
        // Песок 0-5 мм - только навал
        { name: 'Песок 0-5 мм × Навал', price: 500, stock: 0, attributes: { fraction: '0-5', packaging: 'bulk' } },
      ],
      specifications: {
        'Материал': 'Мрамор серо-голубой уфалейский',
        'Единица измерения': 'Тонна',
      },
    });

    console.log('\n📦 Создание товаров из второго прайс-листа (Каталог 3)...\n');

    // ========== ВТОРОЙ ПРАЙС-ЛИСТ (Каталог 3) ==========

    // 6. Стела ритуальная (MATRIX: Высота × Размер сечения)
    await createProduct(apiUrl, authToken, {
      slug: 'stela-ritualnaya-polirovka-2-storony',
      name: 'Стела ритуальная (полировка с 2 сторон)',
      description: 'Ритуальная стела из мрамора серо-голубого уфалейского месторождения с полировкой с 2 сторон',
      categoryId: ritualStelesId,
      productType: 'MATRIX',
      unit: 'PIECE',
      material: 'MARBLE',
      attributes: [
        {
          name: 'Высота',
          slug: 'height',
          type: 'select',
          order: 0,
          isRequired: true,
          values: [
            { value: '600', displayName: '600 мм', order: 0 },
            { value: '700', displayName: '700 мм', order: 1 },
            { value: '800', displayName: '800 мм', order: 2 },
            { value: '900', displayName: '900 мм', order: 3 },
            { value: '1000', displayName: '1000 мм', order: 4 },
            { value: '1100', displayName: '1100 мм', order: 5 },
            { value: '1200', displayName: '1200 мм', order: 6 },
          ],
        },
        {
          name: 'Размер сечения',
          slug: 'section',
          type: 'select',
          order: 1,
          isRequired: true,
          values: [
            { value: '400*60', displayName: '400×60 мм', order: 0 },
            { value: '450*70', displayName: '450×70 мм', order: 1 },
            { value: '500*70', displayName: '500×70 мм', order: 2 },
            { value: '600*70', displayName: '600×70 мм', order: 3 },
          ],
        },
      ],
      variants: [
        // Высота 600 мм
        { name: '600 мм × 400×60 мм', price: 2900, stock: 0, attributes: { height: '600', section: '400*60' } },
        // Высота 700 мм
        { name: '700 мм × 400×60 мм', price: 3350, stock: 0, attributes: { height: '700', section: '400*60' } },
        // Высота 800 мм
        { name: '800 мм × 400×60 мм', price: 3850, stock: 0, attributes: { height: '800', section: '400*60' } },
        { name: '800 мм × 450×70 мм', price: 5050, stock: 0, attributes: { height: '800', section: '450*70' } },
        // Высота 900 мм
        { name: '900 мм × 400×60 мм', price: 4300, stock: 0, attributes: { height: '900', section: '400*60' } },
        { name: '900 мм × 450×70 мм', price: 5700, stock: 0, attributes: { height: '900', section: '450*70' } },
        // Высота 1000 мм
        { name: '1000 мм × 400×60 мм', price: 4800, stock: 0, attributes: { height: '1000', section: '400*60' } },
        { name: '1000 мм × 450×70 мм', price: 6300, stock: 0, attributes: { height: '1000', section: '450*70' } },
        { name: '1000 мм × 500×70 мм', price: 7000, stock: 0, attributes: { height: '1000', section: '500*70' } },
        // Высота 1100 мм
        { name: '1100 мм × 450×70 мм', price: 6950, stock: 0, attributes: { height: '1100', section: '450*70' } },
        { name: '1100 мм × 500×70 мм', price: 7700, stock: 0, attributes: { height: '1100', section: '500*70' } },
        { name: '1100 мм × 600×70 мм', price: 9250, stock: 0, attributes: { height: '1100', section: '600*70' } },
        // Высота 1200 мм
        { name: '1200 мм × 450×70 мм', price: 7550, stock: 0, attributes: { height: '1200', section: '450*70' } },
        { name: '1200 мм × 500×70 мм', price: 8400, stock: 0, attributes: { height: '1200', section: '500*70' } },
        { name: '1200 мм × 600×70 мм', price: 10100, stock: 0, attributes: { height: '1200', section: '600*70' } },
      ],
      specifications: {
        'Материал': 'Мрамор серо-голубой уфалейский',
        'Обработка': 'Полировка с 2 сторон',
        'Единица измерения': 'шт',
      },
    });

    // 7. Тумба ритуальная (MATRIX: Размер основания × Высота)
    await createProduct(apiUrl, authToken, {
      slug: 'tumba-ritualnaya-polirovka-3-storony',
      name: 'Тумба ритуальная (полировка с 3 сторон)',
      description: 'Ритуальная тумба из мрамора с полировкой с 3 сторон',
      categoryId: ritualPedestalsId,
      productType: 'MATRIX',
      unit: 'PIECE',
      material: 'MARBLE',
      attributes: [
        {
          name: 'Размер основания',
          slug: 'base_size',
          type: 'select',
          order: 0,
          isRequired: true,
          values: [
            { value: '500*150', displayName: '500×150 мм', order: 0 },
            { value: '550*150', displayName: '550×150 мм', order: 1 },
            { value: '600*150', displayName: '600×150 мм', order: 2 },
            { value: '500*200', displayName: '500×200 мм', order: 3 },
            { value: '550*200', displayName: '550×200 мм', order: 4 },
            { value: '600*200', displayName: '600×200 мм', order: 5 },
            { value: '700*200', displayName: '700×200 мм', order: 6 },
          ],
        },
        {
          name: 'Высота',
          slug: 'height',
          type: 'select',
          order: 1,
          isRequired: true,
          values: [
            { value: '70', displayName: '70 мм', order: 0 },
            { value: '120', displayName: '120 мм', order: 1 },
            { value: '130', displayName: '130 мм', order: 2 },
            { value: '150', displayName: '150 мм', order: 3 },
          ],
        },
      ],
      variants: [
        // 500*150
        { name: '500×150 мм × 70 мм', price: 1050, stock: 0, attributes: { base_size: '500*150', height: '70' } },
        { name: '500×150 мм × 120 мм', price: 1800, stock: 0, attributes: { base_size: '500*150', height: '120' } },
        { name: '500×150 мм × 130 мм', price: 1950, stock: 0, attributes: { base_size: '500*150', height: '130' } },
        { name: '500×150 мм × 150 мм', price: 2250, stock: 0, attributes: { base_size: '500*150', height: '150' } },
        // 550*150
        { name: '550×150 мм × 70 мм', price: 1150, stock: 0, attributes: { base_size: '550*150', height: '70' } },
        { name: '550×150 мм × 120 мм', price: 2000, stock: 0, attributes: { base_size: '550*150', height: '120' } },
        { name: '550×150 мм × 130 мм', price: 2150, stock: 0, attributes: { base_size: '550*150', height: '130' } },
        { name: '550×150 мм × 150 мм', price: 2500, stock: 0, attributes: { base_size: '550*150', height: '150' } },
        // 600*150
        { name: '600×150 мм × 70 мм', price: 1250, stock: 0, attributes: { base_size: '600*150', height: '70' } },
        { name: '600×150 мм × 120 мм', price: 2150, stock: 0, attributes: { base_size: '600*150', height: '120' } },
        { name: '600×150 мм × 130 мм', price: 2350, stock: 0, attributes: { base_size: '600*150', height: '130' } },
        { name: '600×150 мм × 150 мм', price: 2700, stock: 0, attributes: { base_size: '600*150', height: '150' } },
        // 500*200
        { name: '500×200 мм × 70 мм', price: 1400, stock: 0, attributes: { base_size: '500*200', height: '70' } },
        { name: '500×200 мм × 120 мм', price: 2400, stock: 0, attributes: { base_size: '500*200', height: '120' } },
        { name: '500×200 мм × 130 мм', price: 2600, stock: 0, attributes: { base_size: '500*200', height: '130' } },
        { name: '500×200 мм × 150 мм', price: 3000, stock: 0, attributes: { base_size: '500*200', height: '150' } },
        // 550*200
        { name: '550×200 мм × 70 мм', price: 1550, stock: 0, attributes: { base_size: '550*200', height: '70' } },
        { name: '550×200 мм × 120 мм', price: 2650, stock: 0, attributes: { base_size: '550*200', height: '120' } },
        { name: '550×200 мм × 130 мм', price: 2850, stock: 0, attributes: { base_size: '550*200', height: '130' } },
        { name: '550×200 мм × 150 мм', price: 3300, stock: 0, attributes: { base_size: '550*200', height: '150' } },
        // 600*200
        { name: '600×200 мм × 70 мм', price: 1700, stock: 0, attributes: { base_size: '600*200', height: '70' } },
        { name: '600×200 мм × 120 мм', price: 2900, stock: 0, attributes: { base_size: '600*200', height: '120' } },
        { name: '600×200 мм × 130 мм', price: 3150, stock: 0, attributes: { base_size: '600*200', height: '130' } },
        { name: '600×200 мм × 150 мм', price: 3600, stock: 0, attributes: { base_size: '600*200', height: '150' } },
        // 700*200
        { name: '700×200 мм × 70 мм', price: 1950, stock: 0, attributes: { base_size: '700*200', height: '70' } },
        { name: '700×200 мм × 120 мм', price: 3350, stock: 0, attributes: { base_size: '700*200', height: '120' } },
        { name: '700×200 мм × 130 мм', price: 3650, stock: 0, attributes: { base_size: '700*200', height: '130' } },
        { name: '700×200 мм × 150 мм', price: 4200, stock: 0, attributes: { base_size: '700*200', height: '150' } },
      ],
      specifications: {
        'Материал': 'Мрамор серо-голубой уфалейский',
        'Обработка': 'Полировка с 3 сторон',
        'Единица измерения': 'шт',
      },
    });

    // 8. Цветник ритуальный (MATRIX: Размер × Обработка)
    await createProduct(apiUrl, authToken, {
      slug: 'tsvetnik-ritualnyi-polirovka-2-storony',
      name: 'Цветник ритуальный (полировка 2х сторон)',
      description: 'Ритуальный цветник из мрамора с полировкой 2х сторон',
      categoryId: ritualFlowerbedsId,
      productType: 'MATRIX',
      unit: 'SET',
      material: 'MARBLE',
      attributes: [
        {
          name: 'Размер',
          slug: 'size',
          type: 'select',
          order: 0,
          isRequired: true,
          values: [
            { value: '1000*70*40', displayName: '1000×70×40 мм (2 шт), 500/600×70×40 (1 шт)', order: 0 },
            { value: '1000*70*50', displayName: '1000×70×50 мм (2 шт), 500/600×70×50 (1 шт)', order: 1 },
            { value: '1100*70*50', displayName: '1100×70×50 мм (2 шт), 500/600×70×50 (1 шт)', order: 2 },
            { value: '1200*70*50', displayName: '1200×70×50 мм (2 шт), 500/600×70×50 (1 шт)', order: 3 },
          ],
        },
        {
          name: 'Обработка',
          slug: 'finish',
          type: 'select',
          order: 1,
          isRequired: true,
          values: [
            { value: 'sawed', displayName: 'Пилен', order: 0 },
            { value: 'polished', displayName: 'Полир', order: 1 },
          ],
        },
      ],
      variants: [
        // 1000*70*40
        { name: '1000×70×40 мм × Пилен', price: 1150, stock: 0, attributes: { size: '1000*70*40', finish: 'sawed' } },
        // 1000*70*50
        { name: '1000×70×50 мм × Пилен', price: 1450, stock: 0, attributes: { size: '1000*70*50', finish: 'sawed' } },
        { name: '1000×70×50 мм × Полир', price: 1800, stock: 0, attributes: { size: '1000*70*50', finish: 'polished' } },
        // 1100*70*50
        { name: '1100×70×50 мм × Пилен', price: 1600, stock: 0, attributes: { size: '1100*70*50', finish: 'sawed' } },
        { name: '1100×70×50 мм × Полир', price: 1950, stock: 0, attributes: { size: '1100*70*50', finish: 'polished' } },
        // 1200*70*50
        { name: '1200×70×50 мм × Пилен', price: 1700, stock: 0, attributes: { size: '1200*70*50', finish: 'sawed' } },
        { name: '1200×70×50 мм × Полир', price: 2100, stock: 0, attributes: { size: '1200*70*50', finish: 'polished' } },
      ],
      specifications: {
        'Материал': 'Мрамор серо-голубой уфалейский',
        'Обработка': 'Полировка 2 стороны',
        'Единица измерения': 'комплект',
      },
    });

    // 9. Ритуальная ваза (MATRIX: Высота × Диаметр)
    await createProduct(apiUrl, authToken, {
      slug: 'ritualnaya-vaza-mramornaya',
      name: 'Ритуальная ваза',
      description: 'Ритуальная ваза из мрамора серо-голубого уфалейского месторождения',
      categoryId: marbleVasesId,
      productType: 'MATRIX',
      unit: 'PIECE',
      material: 'MARBLE',
      attributes: [
        {
          name: 'Высота',
          slug: 'height',
          type: 'select',
          order: 0,
          isRequired: true,
          values: [
            { value: '200', displayName: '200 мм', order: 0 },
            { value: '250', displayName: '250 мм', order: 1 },
            { value: '300', displayName: '300 мм', order: 2 },
            { value: '350', displayName: '350 мм', order: 3 },
            { value: '400', displayName: '400 мм', order: 4 },
            { value: '500', displayName: '500 мм', order: 5 },
          ],
        },
        {
          name: 'Диаметр',
          slug: 'diameter',
          type: 'select',
          order: 1,
          isRequired: true,
          values: [
            { value: '115', displayName: '115 мм', order: 0 },
            { value: '130', displayName: '130 мм', order: 1 },
            { value: '150', displayName: '150 мм', order: 2 },
          ],
        },
      ],
      variants: [
        // Высота 200 мм
        { name: '200 мм × 115 мм', price: 1200, stock: 0, attributes: { height: '200', diameter: '115' } },
        { name: '200 мм × 130 мм', price: 1700, stock: 0, attributes: { height: '200', diameter: '130' } },
        { name: '200 мм × 150 мм', price: 1800, stock: 0, attributes: { height: '200', diameter: '150' } },
        // Высота 250 мм
        { name: '250 мм × 115 мм', price: 1500, stock: 0, attributes: { height: '250', diameter: '115' } },
        { name: '250 мм × 130 мм', price: 1800, stock: 0, attributes: { height: '250', diameter: '130' } },
        { name: '250 мм × 150 мм', price: 2000, stock: 0, attributes: { height: '250', diameter: '150' } },
        // Высота 300 мм
        { name: '300 мм × 115 мм', price: 1600, stock: 0, attributes: { height: '300', diameter: '115' } },
        { name: '300 мм × 130 мм', price: 1900, stock: 0, attributes: { height: '300', diameter: '130' } },
        { name: '300 мм × 150 мм', price: 2200, stock: 0, attributes: { height: '300', diameter: '150' } },
        // Высота 350 мм
        { name: '350 мм × 130 мм', price: 2000, stock: 0, attributes: { height: '350', diameter: '130' } },
        { name: '350 мм × 150 мм', price: 2500, stock: 0, attributes: { height: '350', diameter: '150' } },
        // Высота 400 мм
        { name: '400 мм × 130 мм', price: 2300, stock: 0, attributes: { height: '400', diameter: '130' } },
        { name: '400 мм × 150 мм', price: 2700, stock: 0, attributes: { height: '400', diameter: '150' } },
        // Высота 500 мм
        { name: '500 мм × 130 мм', price: 3000, stock: 0, attributes: { height: '500', diameter: '130' } },
        { name: '500 мм × 150 мм', price: 4200, stock: 0, attributes: { height: '500', diameter: '150' } },
      ],
      specifications: {
        'Материал': 'Мрамор серо-голубой уфалейский',
        'Единица измерения': 'шт',
      },
    });

    console.log('\n✅ Все товары успешно созданы!');
    console.log(`\n📊 Создано товаров: 9`);
    console.log('📦 Каталог 1 (Плита из мрамора, Крошка): 5 товаров');
    console.log('📦 Каталог 3 (Ритуальные изделия): 4 товара');
    console.log('\n🎉 Готово! Теперь вы можете проверить товары в админ-панели.');

  } catch (error: any) {
    console.error('\n❌ Ошибка при создании товаров:', error.message);
    if (error.response?.data) {
      console.error('Детали ошибки:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Запуск скрипта
main();

