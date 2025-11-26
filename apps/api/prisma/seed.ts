import { PrismaClient, UnitType } from '@prisma/client';

const prisma = new PrismaClient();

interface VariantData {
  name: string;
  price: number;
  sku: string;
  weight?: number;
}

interface ProductData {
  name: string;
  description: string;
  categorySlug: string;
  unit: 'PIECE' | 'SQUARE_METER' | 'TON' | 'SET';
  material: string;
  variants: VariantData[];
}

async function createProduct(slug: string, data: ProductData, catMap: Record<string, number>) {
  const categoryId = catMap[data.categorySlug];
  if (!categoryId) {
    console.log(`  ⚠ Категория ${data.categorySlug} не найдена, пропускаем ${data.name}`);
    return;
  }

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    console.log(`  ⊘ ${data.name} уже существует`);
    return;
  }

  await prisma.product.create({
    data: {
      slug,
      name: data.name,
      description: data.description,
      categoryId,
      unit: data.unit as UnitType,
      material: data.material,
      isActive: true,
      variants: {
        create: data.variants.map(v => ({
          name: v.name,
          price: v.price,
          sku: v.sku,
          weight: v.weight,
          stock: 99,
          isActive: true,
        })),
      },
    },
  });
  console.log(`  ✓ ${data.name} (${data.variants.length} вариантов)`);
}

async function main() {
  console.log('🌱 Засев базы данных ОптМрамор...\n');

  // ========== СОЗДАЁМ КАТЕГОРИИ ==========
  console.log('📂 Создание категорий...\n');
  
  const categories = [
    { slug: 'marble-slabs', name: 'Плита из мрамора', description: 'Мраморные плиты различных размеров', order: 1 },
    { slug: 'marble-chips', name: 'Крошка мраморная', description: 'Декоративная мраморная крошка и песок', order: 2 },
    { slug: 'marble-vases', name: 'Вазы', description: 'Декоративные вазы из мрамора', order: 3 },
    { slug: 'ritual-steles', name: 'Стелы ритуальные', description: 'Ритуальные стелы из мрамора', order: 4 },
    { slug: 'ritual-pedestals', name: 'Тумбы ритуальные', description: 'Тумбы и основания', order: 5 },
    { slug: 'ritual-flowerbeds', name: 'Цветники ритуальные', description: 'Ритуальные цветники', order: 6 },
    { slug: 'ritual-sets', name: 'Комплекты ритуальные', description: 'Полные комплекты', order: 7 },
  ];

  const catMap: Record<string, number> = {};
  
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, order: cat.order },
      create: { ...cat, isActive: true },
    });
    catMap[cat.slug] = category.id;
    console.log(`  ✓ ${cat.name}`);
  }
  
  console.log(`\n📂 Всего категорий: ${Object.keys(catMap).length}`);

  console.log('\n📦 Создание товаров...\n');

  // === ПЛИТЫ МРАМОРНЫЕ ===
  await createProduct('plita-300x300x15', {
    name: 'Плита мраморная полированная 300×300×15',
    description: 'Мрамор серо-голубой Уфалейского месторождения',
    categorySlug: 'marble-slabs',
    unit: 'SQUARE_METER',
    material: 'MARBLE',
    variants: [
      { name: 'Сорт 1', price: 2600, sku: 'PL-300-S1' },
      { name: 'Сорт 2', price: 1600, sku: 'PL-300-S2' },
    ],
  }, catMap);

  await createProduct('plita-300x600x15', {
    name: 'Плита мраморная полированная 300×600×15',
    description: 'Мрамор серо-голубой Уфалейского месторождения',
    categorySlug: 'marble-slabs',
    unit: 'SQUARE_METER',
    material: 'MARBLE',
    variants: [
      { name: 'Сорт 1', price: 3100, sku: 'PL-600-S1' },
      { name: 'Сорт 2', price: 1900, sku: 'PL-600-S2' },
    ],
  }, catMap);

  await createProduct('zakaznaya-plita', {
    name: 'Заказная плита (подоконники, ступени)',
    description: 'Изготовление под заказ',
    categorySlug: 'marble-slabs',
    unit: 'SQUARE_METER',
    material: 'MARBLE',
    variants: [
      { name: '10мм (L до 400мм)', price: 3200, sku: 'ZP-10' },
      { name: '15мм (L до 600мм)', price: 3600, sku: 'ZP-15' },
      { name: '20мм (L до 600мм)', price: 4000, sku: 'ZP-20' },
      { name: '20мм (L 600-1200мм)', price: 4400, sku: 'ZP-20L' },
      { name: '30мм (L до 1200мм)', price: 6000, sku: 'ZP-30' },
      { name: '40мм (L до 1200мм)', price: 8000, sku: 'ZP-40' },
    ],
  }, catMap);

  await createProduct('brekchiya', {
    name: 'Мраморная брекчия 15мм',
    description: 'Декоративная мраморная брекчия',
    categorySlug: 'marble-slabs',
    unit: 'SQUARE_METER',
    material: 'MARBLE',
    variants: [
      { name: 'Правильной формы (полир.)', price: 750, sku: 'BR-POL' },
      { name: 'Произвольной формы', price: 550, sku: 'BR-ARB' },
    ],
  }, catMap);

  // === КРОШКА И ПЕСОК ===
  await createProduct('kroshka-galt-10-20', {
    name: 'Крошка галтованная 10-20мм',
    description: 'Премиум, окатанная',
    categorySlug: 'marble-chips',
    unit: 'TON',
    material: 'MARBLE',
    variants: [{ name: 'В МКР', price: 6500, sku: 'KG-10-20' }],
  }, catMap);

  await createProduct('kroshka-10-20', {
    name: 'Крошка 10-20мм',
    description: 'Декоративная крошка',
    categorySlug: 'marble-chips',
    unit: 'TON',
    material: 'MARBLE',
    variants: [
      { name: 'Навал', price: 2500, sku: 'K-10-20-N' },
      { name: 'В МКР', price: 3500, sku: 'K-10-20-M' },
    ],
  }, catMap);

  await createProduct('kroshka-5-10', {
    name: 'Крошка 5-10мм',
    description: 'Мелкая крошка',
    categorySlug: 'marble-chips',
    unit: 'TON',
    material: 'MARBLE',
    variants: [
      { name: 'Навал', price: 1800, sku: 'K-5-10-N' },
      { name: 'В МКР', price: 2800, sku: 'K-5-10-M' },
    ],
  }, catMap);

  await createProduct('pesok-0-5', {
    name: 'Песок 0-5мм',
    description: 'Мраморный песок',
    categorySlug: 'marble-chips',
    unit: 'TON',
    material: 'MARBLE',
    variants: [{ name: 'Навал', price: 500, sku: 'P-0-5' }],
  }, catMap);

  // === ВАЗЫ ===
  await createProduct('vaza-ritualnaya', {
    name: 'Ваза ритуальная',
    description: 'Мраморная ваза для цветов',
    categorySlug: 'marble-vases',
    unit: 'PIECE',
    material: 'MARBLE',
    variants: [
      { name: 'h=200мм, d=115мм', price: 1700, sku: 'VR-200' },
      { name: 'h=250мм, d=130мм', price: 1800, sku: 'VR-250' },
      { name: 'h=300мм, d=150мм', price: 2000, sku: 'VR-300' },
      { name: 'h=350мм, d=180мм', price: 2200, sku: 'VR-350' },
      { name: 'h=400мм, d=200мм', price: 2500, sku: 'VR-400' },
      { name: 'h=500мм, d=250мм', price: 3700, sku: 'VR-500' },
    ],
  }, catMap);

  await createProduct('vaza-dekorativnaya', {
    name: 'Ваза декоративная',
    description: 'Изделия из мрамора',
    categorySlug: 'marble-vases',
    unit: 'PIECE',
    material: 'MARBLE',
    variants: [
      { name: '200×110мм', price: 1000, sku: 'VD-200' },
      { name: '250×120мм', price: 1200, sku: 'VD-250' },
      { name: '300×120мм', price: 1500, sku: 'VD-300' },
      { name: '350×130мм', price: 1800, sku: 'VD-350' },
      { name: '400×130мм', price: 2000, sku: 'VD-400' },
      { name: '500×130мм', price: 2500, sku: 'VD-500' },
    ],
  }, catMap);

  // === СТЕЛА РИТУАЛЬНАЯ ===
  await createProduct('stela-ritualnaya', {
    name: 'Стела ритуальная',
    description: 'Полировка с 2 сторон, мрамор серо-голубой',
    categorySlug: 'ritual-steles',
    unit: 'PIECE',
    material: 'MARBLE',
    variants: [
      { name: '600×400×60мм', price: 2900, sku: 'ST-600-400', weight: 38.88 },
      { name: '700×400×60мм', price: 3150, sku: 'ST-700-400', weight: 45.36 },
      { name: '800×400×60мм', price: 3850, sku: 'ST-800-400', weight: 51.84 },
      { name: '900×400×60мм', price: 4300, sku: 'ST-900-400', weight: 58.32 },
      { name: '1000×400×60мм', price: 4800, sku: 'ST-1000-400', weight: 64.8 },
      { name: '800×450×70мм', price: 5050, sku: 'ST-800-450', weight: 66 },
      { name: '900×450×70мм', price: 5700, sku: 'ST-900-450', weight: 74 },
      { name: '1000×450×70мм', price: 6300, sku: 'ST-1000-450', weight: 82 },
      { name: '1100×450×70мм', price: 6950, sku: 'ST-1100-450', weight: 90 },
      { name: '1200×450×70мм', price: 7550, sku: 'ST-1200-450', weight: 98 },
      { name: '1000×500×70мм', price: 7000, sku: 'ST-1000-500', weight: 91 },
      { name: '1100×500×70мм', price: 7700, sku: 'ST-1100-500', weight: 100 },
      { name: '1200×500×70мм', price: 8400, sku: 'ST-1200-500', weight: 109 },
      { name: '1000×600×70мм', price: 8500, sku: 'ST-1000-600', weight: 110 },
      { name: '1100×600×70мм', price: 9250, sku: 'ST-1100-600', weight: 121 },
      { name: '1200×600×70мм', price: 10100, sku: 'ST-1200-600', weight: 131 },
    ],
  }, catMap);

  // === СТЕЛА (полировка 4 стороны) из прайса 1 ===
  await createProduct('stela-4-storony', {
    name: 'Стела (полировка 4 стороны)',
    description: 'Премиум обработка со всех сторон',
    categorySlug: 'ritual-steles',
    unit: 'PIECE',
    material: 'MARBLE',
    variants: [
      { name: '600×400×60мм', price: 2100, sku: 'ST4-600-400', weight: 38.88 },
      { name: '700×400×60мм', price: 2500, sku: 'ST4-700-400', weight: 45.36 },
      { name: '800×400×60мм', price: 2800, sku: 'ST4-800-400', weight: 51.84 },
      { name: '900×400×60мм', price: 3200, sku: 'ST4-900-400', weight: 58.32 },
      { name: '1000×400×60мм', price: 3500, sku: 'ST4-1000-400', weight: 64.8 },
      { name: '800×450×70мм', price: 3700, sku: 'ST4-800-450', weight: 68 },
      { name: '900×450×70мм', price: 4200, sku: 'ST4-900-450', weight: 76.5 },
      { name: '1000×450×70мм', price: 4600, sku: 'ST4-1000-450', weight: 85.05 },
      { name: '1100×450×70мм', price: 5100, sku: 'ST4-1100-450', weight: 93.6 },
      { name: '1200×450×70мм', price: 5600, sku: 'ST4-1200-450', weight: 102 },
      { name: '1000×500×70мм', price: 5200, sku: 'ST4-1000-500', weight: 94.5 },
      { name: '1100×500×70мм', price: 5700, sku: 'ST4-1100-500', weight: 104 },
      { name: '1200×500×70мм', price: 6200, sku: 'ST4-1200-500', weight: 113.4 },
      { name: '1000×600×70мм', price: 6250, sku: 'ST4-1000-600', weight: 113.4 },
      { name: '1100×600×70мм', price: 6800, sku: 'ST4-1100-600', weight: 124.7 },
      { name: '1200×600×70мм', price: 7400, sku: 'ST4-1200-600', weight: 136 },
    ],
  }, catMap);

  // === ТУМБА РИТУАЛЬНАЯ ===
  await createProduct('tumba-ritualnaya', {
    name: 'Тумба ритуальная',
    description: 'Полировка с 3 сторон',
    categorySlug: 'ritual-pedestals',
    unit: 'PIECE',
    material: 'MARBLE',
    variants: [
      { name: '500×150, h=70мм', price: 1050, sku: 'TM-500-70' },
      { name: '500×150, h=120мм', price: 1800, sku: 'TM-500-120' },
      { name: '550×150, h=70мм', price: 1150, sku: 'TM-550-70' },
      { name: '550×150, h=120мм', price: 2000, sku: 'TM-550-120' },
      { name: '600×150, h=120мм', price: 2150, sku: 'TM-600-120' },
      { name: '600×200, h=120мм', price: 2400, sku: 'TM-600-200-120' },
      { name: '600×200, h=150мм', price: 3000, sku: 'TM-600-200-150' },
      { name: '700×200, h=150мм', price: 3600, sku: 'TM-700-200-150' },
    ],
  }, catMap);

  await createProduct('tumba-5-storon', {
    name: 'Тумба (полировка 5 сторон)',
    description: 'Премиум обработка',
    categorySlug: 'ritual-pedestals',
    unit: 'PIECE',
    material: 'MARBLE',
    variants: [
      { name: '500×200×120мм', price: 1800, sku: 'TM5-500', weight: 32.4 },
      { name: '550×200×120мм', price: 2000, sku: 'TM5-550', weight: 35.64 },
      { name: '600×200×120мм', price: 2200, sku: 'TM5-600', weight: 38.88 },
      { name: '700×200×120мм', price: 2500, sku: 'TM5-700', weight: 45.36 },
    ],
  }, catMap);

  // === ЦВЕТНИК РИТУАЛЬНЫЙ ===
  await createProduct('cvetnik-ritualnyj', {
    name: 'Цветник ритуальный',
    description: 'Полировка пилен',
    categorySlug: 'ritual-flowerbeds',
    unit: 'SET',
    material: 'MARBLE',
    variants: [
      { name: '1000×70×40 (2шт) + 500/600×70×40 (1шт)', price: 1150, sku: 'CV-1000' },
      { name: '1000×70×50 (2шт) + 500/600×70×50 (1шт)', price: 1450, sku: 'CV-1000-50' },
      { name: '1100×70×50 (2шт) + 600×70×50 (1шт)', price: 1700, sku: 'CV-1100' },
      { name: '1200×70×50 (2шт) + 600×70×50 (1шт)', price: 2100, sku: 'CV-1200' },
    ],
  }, catMap);

  await createProduct('cvetnik-2x-storon', {
    name: 'Цветник (полировка 2х сторон)',
    description: 'Комплект',
    categorySlug: 'ritual-flowerbeds',
    unit: 'SET',
    material: 'MARBLE',
    variants: [
      { name: 'Комплект', price: 2000, sku: 'CV2-KOMPL', weight: 28 },
    ],
  }, catMap);

  // === КОМПЛЕКТЫ ===
  await createProduct('komplekt-ritualnyj', {
    name: 'Комплект ритуальный',
    description: 'Стела + тумба + цветник',
    categorySlug: 'ritual-sets',
    unit: 'SET',
    material: 'MARBLE',
    variants: [
      { name: '600×400×60', price: 5900, sku: 'KR-600', weight: 99.3 },
      { name: '700×400×60', price: 6300, sku: 'KR-700', weight: 105.8 },
      { name: '800×400×60', price: 6600, sku: 'KR-800', weight: 112.2 },
      { name: '900×400×60', price: 7000, sku: 'KR-900', weight: 118.7 },
      { name: '1000×400×60', price: 7300, sku: 'KR-1000', weight: 125.2 },
      { name: '800×450×70', price: 7700, sku: 'KR-800-450', weight: 131.6 },
      { name: '900×450×70', price: 8200, sku: 'KR-900-450', weight: 140.2 },
      { name: '1000×450×70', price: 8600, sku: 'KR-1000-450', weight: 148.7 },
      { name: '1100×450×70', price: 9100, sku: 'KR-1100-450', weight: 157.3 },
      { name: '1200×450×70', price: 9600, sku: 'KR-1200-450', weight: 165.6 },
      { name: '1000×500×70', price: 9400, sku: 'KR-1000-500', weight: 161.3 },
      { name: '1100×500×70', price: 9900, sku: 'KR-1100-500', weight: 170.9 },
      { name: '1200×500×70', price: 10400, sku: 'KR-1200-500', weight: 180.3 },
      { name: '1000×600×70', price: 10750, sku: 'KR-1000-600', weight: 186.8 },
      { name: '1100×600×70', price: 11300, sku: 'KR-1100-600', weight: 198 },
      { name: '1200×600×70', price: 11900, sku: 'KR-1200-600', weight: 209.4 },
    ],
  }, catMap);

  console.log('\n✅ Засев завершён!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
