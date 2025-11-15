import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Создание категорий
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      slug: 'electronics',
      name: 'Электроника',
      description: 'Современная электроника и гаджеты',
      image: '📱',
      order: 1,
      isActive: true,
    },
  });

  const clothing = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: {
      slug: 'clothing',
      name: 'Одежда',
      description: 'Модная одежда и аксессуары',
      image: '👕',
      order: 2,
      isActive: true,
    },
  });

  const food = await prisma.category.upsert({
    where: { slug: 'food' },
    update: {},
    create: {
      slug: 'food',
      name: 'Еда',
      description: 'Вкусная еда и напитки',
      image: '🍕',
      order: 3,
      isActive: true,
    },
  });

  // Создание товаров
  const products = [
    {
      slug: 'iphone-15',
      name: 'iPhone 15',
      description: 'Новейший смартфон от Apple',
      categoryId: electronics.id,
      price: 89999,
      variants: [
        { name: '128GB', price: 89999, stock: 10 },
        { name: '256GB', price: 99999, stock: 5 },
        { name: '512GB', price: 119999, stock: 3 },
      ],
      media: [
        { url: 'https://example.com/iphone-15-1.jpg', type: 'image', order: 0 },
        { url: 'https://example.com/iphone-15-2.jpg', type: 'image', order: 1 },
      ],
    },
    {
      slug: 'samsung-galaxy-s24',
      name: 'Samsung Galaxy S24',
      description: 'Флагманский смартфон от Samsung',
      categoryId: electronics.id,
      price: 79999,
      variants: [
        { name: '128GB', price: 79999, stock: 8 },
        { name: '256GB', price: 89999, stock: 4 },
      ],
      media: [
        { url: 'https://example.com/galaxy-s24-1.jpg', type: 'image', order: 0 },
      ],
    },
    {
      slug: 'macbook-pro',
      name: 'MacBook Pro 14"',
      description: 'Профессиональный ноутбук от Apple',
      categoryId: electronics.id,
      price: 199999,
      variants: [
        { name: 'M3 512GB', price: 199999, stock: 5 },
        { name: 'M3 Pro 1TB', price: 249999, stock: 3 },
      ],
      media: [
        { url: 'https://example.com/macbook-pro-1.jpg', type: 'image', order: 0 },
      ],
    },
    {
      slug: 't-shirt-basic',
      name: 'Базовая футболка',
      description: 'Классическая футболка из хлопка',
      categoryId: clothing.id,
      price: 1999,
      variants: [
        { name: 'S', price: 1999, stock: 20 },
        { name: 'M', price: 1999, stock: 25 },
        { name: 'L', price: 1999, stock: 15 },
        { name: 'XL', price: 1999, stock: 10 },
      ],
      media: [
        { url: 'https://example.com/tshirt-1.jpg', type: 'image', order: 0 },
      ],
    },
    {
      slug: 'jeans-classic',
      name: 'Классические джинсы',
      description: 'Удобные джинсы классического кроя',
      categoryId: clothing.id,
      price: 4999,
      variants: [
        { name: '28', price: 4999, stock: 10 },
        { name: '30', price: 4999, stock: 12 },
        { name: '32', price: 4999, stock: 15 },
      ],
      media: [
        { url: 'https://example.com/jeans-1.jpg', type: 'image', order: 0 },
      ],
    },
    {
      slug: 'pizza-margherita',
      name: 'Пицца Маргарита',
      description: 'Классическая итальянская пицца',
      categoryId: food.id,
      price: 599,
      variants: [
        { name: 'Маленькая (25см)', price: 599, stock: 50 },
        { name: 'Средняя (30см)', price: 899, stock: 30 },
        { name: 'Большая (35см)', price: 1199, stock: 20 },
      ],
      media: [
        { url: 'https://example.com/pizza-1.jpg', type: 'image', order: 0 },
      ],
    },
    {
      slug: 'burger-classic',
      name: 'Классический бургер',
      description: 'Сочный бургер с говядиной',
      categoryId: food.id,
      price: 399,
      variants: [
        { name: 'Обычный', price: 399, stock: 100 },
        { name: 'Двойной', price: 599, stock: 50 },
      ],
      media: [
        { url: 'https://example.com/burger-1.jpg', type: 'image', order: 0 },
      ],
    },
  ];

  for (const productData of products) {
    const { variants, media, categoryId, ...product } = productData;
    
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        ...product,
        categoryId,
        isActive: true,
        variants: {
          create: variants.map((v) => ({
            ...v,
            isActive: true,
          })),
        },
        media: {
          create: media,
        },
      },
    });
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






