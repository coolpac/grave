import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Засев базы данных ОптМрамор...');

  // ========== КАТЕГОРИИ ==========
  console.log('📂 Создание категорий...');
  
  const categories = [
    // Мраморные категории
    { slug: 'marble-monuments', name: 'Памятники из мрамора', description: 'Элегантные памятники из натурального мрамора', order: 1 },
    { slug: 'marble-popular', name: 'Популярные модели', description: 'Популярные модели мраморных изделий', order: 2 },
    { slug: 'marble-slabs', name: 'Плита из мрамора', description: 'Мраморные плиты различных размеров и сортов', order: 3 },
    { slug: 'marble-vases', name: 'Вазы', description: 'Декоративные вазы из мрамора', order: 4 },
    { slug: 'marble-chips', name: 'Крошка', description: 'Мраморная крошка и песок', order: 5 },
    // Гранитные категории  
    { slug: 'granite-monuments', name: 'Памятники из гранита', description: 'Прочные и долговечные памятники из гранита', order: 6 },
    { slug: 'granite-popular', name: 'Популярные модели (гранит)', description: 'Популярные модели гранитных изделий', order: 7 },
    { slug: 'granite-slabs', name: 'Плита из гранита', description: 'Гранитные плиты различных размеров', order: 8 },
    { slug: 'granite-vases', name: 'Вазы (гранит)', description: 'Декоративные вазы из гранита', order: 9 },
    { slug: 'granite-chips', name: 'Крошка (гранит)', description: 'Гранитная крошка и песок', order: 10 },
    // Ритуальные изделия
    { slug: 'ritual-steles', name: 'Стелы ритуальные', description: 'Ритуальные стелы из мрамора и гранита', order: 11 },
    { slug: 'ritual-pedestals', name: 'Тумбы ритуальные', description: 'Ритуальные тумбы и основания', order: 12 },
    { slug: 'ritual-flowerbeds', name: 'Цветники ритуальные', description: 'Ритуальные цветники', order: 13 },
    { slug: 'ritual-sets', name: 'Комплекты ритуальные', description: 'Полные комплекты ритуальных изделий', order: 14 },
  ];

  const categoryMap: Record<string, number> = {};
  
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, order: cat.order },
      create: { ...cat, isActive: true },
    });
    categoryMap[cat.slug] = category.id;
    console.log(`  ✓ ${cat.name}`);
  }

  // ========== ТОВАРЫ ==========
  console.log('\n📦 Создание товаров...');

  const products = [
    // Плиты мраморные
    {
      slug: 'plita-mramornaya-300x300',
      name: 'Плита мраморная полированная 300×300×15 мм',
      description: 'Полированная мраморная плита серо-голубого уфалейского месторождения',
      categoryId: categoryMap['marble-slabs'],
      price: 2600,
      variants: [
        { name: 'Сорт 1', price: 2600, sku: 'PL-300-S1' },
        { name: 'Сорт 2', price: 1600, sku: 'PL-300-S2' },
      ],
    },
    {
      slug: 'plita-mramornaya-300x600',
      name: 'Плита мраморная полированная 300×600×15 мм',
      description: 'Полированная мраморная плита серо-голубого уфалейского месторождения',
      categoryId: categoryMap['marble-slabs'],
      price: 3100,
      variants: [
        { name: 'Сорт 1', price: 3100, sku: 'PL-600-S1' },
        { name: 'Сорт 2', price: 1900, sku: 'PL-600-S2' },
      ],
    },
    {
      slug: 'zakaznaya-plita',
      name: 'Заказная плита (подоконники, ступени)',
      description: 'Заказные мраморные плиты для подоконников, ступеней и других изделий',
      categoryId: categoryMap['marble-slabs'],
      price: 3200,
      variants: [
        { name: '10 мм (L до 400мм)', price: 3200, sku: 'ZP-10' },
        { name: '15 мм (L до 600мм)', price: 3600, sku: 'ZP-15' },
        { name: '20 мм (L до 600мм)', price: 4000, sku: 'ZP-20' },
        { name: '30 мм (L до 1200мм)', price: 6000, sku: 'ZP-30' },
        { name: '40 мм (L до 1200мм)', price: 8000, sku: 'ZP-40' },
      ],
    },
    // Крошка мраморная
    {
      slug: 'mramornaya-kroshka-10-20',
      name: 'Мраморная крошка 10-20 мм',
      description: 'Декоративная мраморная крошка для ландшафтного дизайна',
      categoryId: categoryMap['marble-chips'],
      price: 2500,
      variants: [
        { name: 'Навал (тонна)', price: 2500, sku: 'MK-10-20-N' },
        { name: 'В МКР (тонна)', price: 3500, sku: 'MK-10-20-M' },
      ],
    },
    {
      slug: 'mramornaya-kroshka-5-10',
      name: 'Мраморная крошка 5-10 мм',
      description: 'Декоративная мраморная крошка мелкой фракции',
      categoryId: categoryMap['marble-chips'],
      price: 1800,
      variants: [
        { name: 'Навал (тонна)', price: 1800, sku: 'MK-5-10-N' },
        { name: 'В МКР (тонна)', price: 2800, sku: 'MK-5-10-M' },
      ],
    },
    {
      slug: 'mramornaya-kroshka-galtovannaya',
      name: 'Крошка мраморная галтованная 10-20 мм',
      description: 'Галтованная (окатанная) мраморная крошка премиум качества',
      categoryId: categoryMap['marble-chips'],
      price: 6500,
      variants: [
        { name: 'В МКР (тонна)', price: 6500, sku: 'MK-GALT' },
      ],
    },
    {
      slug: 'mramornyj-pesok',
      name: 'Мраморный песок 0-5 мм',
      description: 'Мраморный песок для декоративных работ',
      categoryId: categoryMap['marble-chips'],
      price: 1200,
      variants: [
        { name: 'Навал (тонна)', price: 1200, sku: 'MP-0-5' },
      ],
    },
    // Вазы
    {
      slug: 'vaza-mramornaya-v1',
      name: 'Ваза мраморная цилиндр',
      description: 'Классическая цилиндрическая ваза из белого мрамора',
      categoryId: categoryMap['marble-vases'],
      price: 4500,
      variants: [
        { name: 'Малая (h=20см)', price: 4500, sku: 'VM-CIL-S' },
        { name: 'Средняя (h=30см)', price: 6500, sku: 'VM-CIL-M' },
        { name: 'Большая (h=40см)', price: 9000, sku: 'VM-CIL-L' },
      ],
    },
    // Стелы ритуальные
    {
      slug: 'stela-pryamaya',
      name: 'Стела ритуальная прямая',
      description: 'Классическая прямая стела из мрамора',
      categoryId: categoryMap['ritual-steles'],
      price: 15000,
      variants: [
        { name: '60×40×5 см', price: 15000, sku: 'ST-60-40' },
        { name: '80×40×5 см', price: 22000, sku: 'ST-80-40' },
        { name: '100×50×5 см', price: 35000, sku: 'ST-100-50' },
        { name: '120×60×8 см', price: 55000, sku: 'ST-120-60' },
      ],
    },
    {
      slug: 'stela-figurная',
      name: 'Стела ритуальная фигурная',
      description: 'Фигурная стела с декоративной резьбой',
      categoryId: categoryMap['ritual-steles'],
      price: 25000,
      variants: [
        { name: '80×40 см', price: 25000, sku: 'STF-80-40' },
        { name: '100×50 см', price: 40000, sku: 'STF-100-50' },
        { name: '120×60 см', price: 65000, sku: 'STF-120-60' },
      ],
    },
    // Тумбы
    {
      slug: 'tumba-pryamaya',
      name: 'Тумба ритуальная прямая',
      description: 'Классическая прямая тумба-основание',
      categoryId: categoryMap['ritual-pedestals'],
      price: 8000,
      variants: [
        { name: '60×20×15 см', price: 8000, sku: 'TM-60' },
        { name: '80×25×20 см', price: 12000, sku: 'TM-80' },
        { name: '100×30×25 см', price: 18000, sku: 'TM-100' },
      ],
    },
    // Цветники
    {
      slug: 'cvetnik-pryamoj',
      name: 'Цветник ритуальный прямой',
      description: 'Прямоугольный цветник из мрамора',
      categoryId: categoryMap['ritual-flowerbeds'],
      price: 12000,
      variants: [
        { name: '100×60 см', price: 12000, sku: 'CV-100-60' },
        { name: '120×80 см', price: 18000, sku: 'CV-120-80' },
        { name: '150×100 см', price: 28000, sku: 'CV-150-100' },
      ],
    },
    // Комплекты
    {
      slug: 'komplekt-ekonom',
      name: 'Комплект Эконом',
      description: 'Базовый комплект: стела + тумба',
      categoryId: categoryMap['ritual-sets'],
      price: 23000,
      variants: [
        { name: 'Стела 60×40 + Тумба 60', price: 23000, sku: 'KE-1' },
        { name: 'Стела 80×40 + Тумба 80', price: 34000, sku: 'KE-2' },
      ],
    },
    {
      slug: 'komplekt-standart',
      name: 'Комплект Стандарт',
      description: 'Стандартный комплект: стела + тумба + цветник',
      categoryId: categoryMap['ritual-sets'],
      price: 45000,
      variants: [
        { name: 'Стела 80×40 + Тумба + Цветник 100×60', price: 45000, sku: 'KS-1' },
        { name: 'Стела 100×50 + Тумба + Цветник 120×80', price: 70000, sku: 'KS-2' },
      ],
    },
  ];

  for (const productData of products) {
    const { variants, categoryId, ...product } = productData;
    
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
    
    if (existing) {
      console.log(`  ⊘ ${product.name} уже существует`);
      continue;
    }

    await prisma.product.create({
      data: {
        ...product,
        categoryId,
        isActive: true,
        variants: {
          create: variants.map((v, idx) => ({
            ...v,
            stock: 99,
            isActive: true,
          })),
        },
      },
    });
    console.log(`  ✓ ${product.name}`);
  }

  console.log('\n✅ Засев завершён!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка засева:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






