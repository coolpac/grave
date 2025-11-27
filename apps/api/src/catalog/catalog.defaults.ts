export interface DefaultCategory {
  slug: string;
  name: string;
  description?: string;
  image?: string;
  order: number;
  isActive?: boolean;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    slug: 'marble-monuments',
    name: 'Памятники из мрамора',
    description: 'Классические и современные памятники из натурального мрамора',
    order: 1,
    isActive: true,
  },
  {
    slug: 'marble-popular',
    name: 'Популярные мраморные модели',
    description: 'Лучшие предложения из мрамора',
    order: 2,
    isActive: true,
  },
  {
    slug: 'marble-slabs',
    name: 'Плита из мрамора',
    description: 'Мраморные плиты разных размеров',
    order: 3,
    isActive: true,
  },
  {
    slug: 'marble-vases',
    name: 'Мраморные вазы',
    description: 'Декоративные элементы для комплексов',
    order: 4,
    isActive: true,
  },
  {
    slug: 'marble-chips',
    name: 'Мраморная крошка',
    description: 'Крошка и мелкий наполнитель из мрамора',
    order: 5,
    isActive: true,
  },
  {
    slug: 'granite-monuments',
    name: 'Памятники из гранита',
    description: 'Долговечные гранитные памятники',
    order: 6,
    isActive: true,
  },
  {
    slug: 'granite-popular',
    name: 'Популярные гранитные модели',
    description: 'Выбор покупателей из гранита',
    order: 7,
    isActive: true,
  },
  {
    slug: 'granite-slabs',
    name: 'Плита из гранита',
    description: 'Гранитные плиты и заготовки',
    order: 8,
    isActive: true,
  },
  {
    slug: 'granite-vases',
    name: 'Гранитные вазы',
    description: 'Аксессуары и декоративные элементы из гранита',
    order: 9,
    isActive: true,
  },
  {
    slug: 'granite-chips',
    name: 'Гранитная крошка',
    description: 'Крошка для оформления комплексов',
    order: 10,
    isActive: true,
  },
];

