# План реализации гибкой системы товаров с вариантами

## Анализ требований из прайс-листов

### Типы товаров, которые нужно поддерживать:

1. **Простые товары** (фиксированная цена)
   - Пример: готовые памятники без вариантов

2. **Товары с одним атрибутом** (размер → цена)
   - Пример: Вазы (200*110 → 1000₽, 250*120 → 1200₽)
   - Пример: Вазы ритуальные (высота × диаметр → цена)

3. **Товары с матрицей цен** (2+ атрибута)
   - Пример: Плита мраморная (размер × сорт → цена)
     - 300*300*15 × сорт 1 = 2600₽
     - 300*300*15 × сорт 2 = 1600₽
   - Пример: Тумба ритуальная (ширина*глубина × высота → цена)
     - 500*150 × 70мм = 1050₽
     - 500*150 × 120мм = 1800₽

4. **Товары с диапазонами размеров**
   - Пример: Заказная плита (толщина × диапазон L×W → цена)
     - 10мм (L до 400мм, W 300мм) = 3200₽/м²
     - 15мм (L до 600мм, W 400мм) = 3600₽/м²

5. **Товары с дополнительными параметрами**
   - Пример: Цветник (размер × обработка → цена)
     - 1000*70*40 × пилен = 1150₽
     - 1000*70*40 × полир = 1800₽
   - Пример: Стела (размер × вес → цена)

6. **Разные единицы измерения**
   - шт (штуки)
   - м² (квадратные метры)
   - Т (тонны)
   - компл (комплекты)

---

## Этап 1: Расширение схемы БД

### 1.1 Добавление типов товаров

```prisma
enum ProductType {
  SIMPLE        // Простой товар с фиксированной ценой
  SINGLE_VARIANT // Один атрибут (размер)
  MATRIX        // Матрица атрибутов (размер × сорт)
  RANGE         // Диапазоны размеров
  CONFIGURABLE  // Сложная конфигурация
}

enum UnitType {
  PIECE    // шт
  SQUARE_METER // м²
  TON      // Т
  SET      // компл
}
```

### 1.2 Модели для атрибутов

```prisma
model ProductAttribute {
  id          Int       @id @default(autoincrement())
  productId   Int
  name        String    // "Размер", "Сорт", "Высота", "Диаметр"
  slug        String    // "size", "grade", "height", "diameter"
  type        String    // "size", "select", "number", "range"
  order       Int       @default(0)
  isRequired  Boolean   @default(true)
  unit        String?   // "мм", "м²", "кг"
  
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  values      ProductAttributeValue[]
  
  @@index([productId])
  @@map("product_attributes")
}

model ProductAttributeValue {
  id          Int       @id @default(autoincrement())
  attributeId Int
  value       String    // "300*300*15", "сорт 1", "70"
  displayName String    // "300×300×15 мм", "Сорт 1", "70 мм"
  order       Int       @default(0)
  metadata    Json?     // Дополнительные данные (вес, диапазоны)
  
  attribute   ProductAttribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  
  @@index([attributeId])
  @@map("product_attribute_values")
}
```

### 1.3 Модель вариантов с матрицей цен

```prisma
model ProductVariant {
  id          Int       @id @default(autoincrement())
  productId   Int
  sku         String?   @unique
  price       Decimal   @db.Decimal(10, 2)
  stock       Int       @default(0)
  weight      Decimal?  @db.Decimal(10, 2) // Для стел с весом
  unit        UnitType  @default(PIECE)
  isActive    Boolean   @default(true)
  metadata    Json?     // Дополнительные данные (размеры, характеристики)
  
  // JSON структура для хранения комбинации атрибутов
  // Пример: { "size": "300*300*15", "grade": "1" }
  attributes  Json
  
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  cartItems   CartItem[]
  orderItems  OrderItem[]
  
  @@index([productId])
  @@index([sku])
  @@map("product_variants")
}
```

### 1.4 Обновление модели Product

```prisma
model Product {
  id          Int       @id @default(autoincrement())
  slug        String    @unique
  name        String
  description String?
  categoryId  Int
  productType ProductType @default(SIMPLE)
  basePrice   Decimal?  @db.Decimal(10, 2) // Для SIMPLE товаров
  unit        UnitType  @default(PIECE)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  category    Category       @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  attributes  ProductAttribute[]
  variants    ProductVariant[]
  media       ProductMedia[]
  cartItems   CartItem[]
  
  @@index([slug])
  @@index([categoryId])
  @@index([isActive])
  @@index([productType])
  @@map("products")
}
```

---

## Этап 2: API для работы с товарами

### 2.1 Endpoints для получения товаров

- `GET /api/products/:slug` - Получение товара с вариантами
- `GET /api/products/:slug/variants` - Получение вариантов товара
- `POST /api/products/:slug/calculate-price` - Расчет цены по выбранным атрибутам

### 2.2 Сервисы

- `ProductsService` - Работа с товарами
- `ProductVariantsService` - Работа с вариантами
- `PriceCalculatorService` - Расчет цен для матриц

---

## Этап 3: UI компоненты для покупателей

### 3.1 Компоненты выбора вариантов

- `SimpleProductCard` - Для простых товаров
- `VariantSelector` - Для товаров с одним атрибутом
- `MatrixSelector` - Для матрицы атрибутов (размер × сорт)
- `RangeSelector` - Для диапазонов размеров
- `PriceDisplay` - Динамическое отображение цены

### 3.2 Логика выбора

- Пошаговый выбор атрибутов
- Валидация комбинаций
- Динамический расчет цены
- Визуальная обратная связь

---

## Этап 4: Админ-панель

### 4.1 Интерфейс создания товара

- Выбор типа товара
- Настройка атрибутов
- Заполнение матрицы цен
- Массовый импорт из Excel/CSV

### 4.2 Компоненты админки

- `ProductTypeSelector` - Выбор типа товара
- `AttributeManager` - Управление атрибутами
- `PriceMatrixEditor` - Редактор матрицы цен
- `BulkImport` - Массовый импорт

---

## Этап 5: Интеграция с корзиной и заказами

### 5.1 Обновление CartItem

- Сохранение выбранных атрибутов
- Отображение варианта в корзине
- Расчет итоговой суммы

### 5.2 Обновление OrderItem

- Сохранение полной информации о варианте
- История заказов с вариантами

---

## Примеры использования

### Пример 1: Плита мраморная (MATRIX)

```json
{
  "productType": "MATRIX",
  "attributes": [
    {
      "name": "Размер",
      "slug": "size",
      "values": ["300*300*15", "300*600*15"]
    },
    {
      "name": "Сорт",
      "slug": "grade",
      "values": ["сорт 1", "сорт 2"]
    }
  ],
  "variants": [
    {
      "attributes": { "size": "300*300*15", "grade": "сорт 1" },
      "price": 2600,
      "unit": "SQUARE_METER"
    },
    {
      "attributes": { "size": "300*300*15", "grade": "сорт 2" },
      "price": 1600,
      "unit": "SQUARE_METER"
    }
  ]
}
```

### Пример 2: Вазы (SINGLE_VARIANT)

```json
{
  "productType": "SINGLE_VARIANT",
  "attributes": [
    {
      "name": "Размер",
      "slug": "size",
      "values": ["200*110", "250*120", "300*120"]
    }
  ],
  "variants": [
    { "attributes": { "size": "200*110" }, "price": 1000 },
    { "attributes": { "size": "250*120" }, "price": 1200 },
    { "attributes": { "size": "300*120" }, "price": 1500 }
  ]
}
```

### Пример 3: Тумба ритуальная (MATRIX с множеством размеров)

```json
{
  "productType": "MATRIX",
  "attributes": [
    {
      "name": "Размер основания",
      "slug": "base_size",
      "values": ["500*150", "550*150", "600*150", "500*200"]
    },
    {
      "name": "Высота",
      "slug": "height",
      "values": ["70", "120", "130", "150"]
    }
  ],
  "variants": [
    {
      "attributes": { "base_size": "500*150", "height": "70" },
      "price": 1050
    },
    {
      "attributes": { "base_size": "500*150", "height": "120" },
      "price": 1800
    }
  ]
}
```

---

## Порядок реализации

1. ✅ **Этап 1**: Расширение схемы БД
2. ⏳ **Этап 2**: API для работы с товарами
3. ⏳ **Этап 3**: UI компоненты для покупателей
4. ⏳ **Этап 4**: Админ-панель
5. ⏳ **Этап 5**: Интеграция с корзиной

---

## Резюме выполнения

### ✅ Что сделано:

#### Этап 1: Расширение схемы БД ✅
- ✅ Добавлены enum'ы: `ProductType` (SIMPLE, SINGLE_VARIANT, MATRIX, RANGE, CONFIGURABLE)
- ✅ Добавлен enum `UnitType` (PIECE, SQUARE_METER, TON, SET)
- ✅ Создана модель `ProductAttribute` для атрибутов товаров
- ✅ Создана модель `ProductAttributeValue` для значений атрибутов
- ✅ Обновлена модель `Product` с поддержкой типов и единиц измерения
- ✅ Обновлена модель `ProductVariant` с JSON полем для комбинаций атрибутов
- ✅ Обновлены `CartItem` и `OrderItem` для хранения выбранных атрибутов
- ✅ Схема отформатирована через `prisma format`

#### Этап 2: API для работы с товарами ✅
- ✅ Создан `ProductsModule` с контроллером и сервисом
- ✅ Созданы DTO: `CreateProductDto`, `CalculatePriceDto`
- ✅ Реализован метод `calculatePrice` для расчета цены по атрибутам
- ✅ Добавлен `ProductsModule` в `AppModule`
- ✅ Обновлен `CartService` для поддержки `selectedAttributes`
- ✅ Обновлен `AddToCartDto` для передачи атрибутов

#### Этап 3: UI компоненты ✅
- ✅ Создан `SimpleProductCard` для простых товаров
- ✅ Создан `VariantSelector` для товаров с одним атрибутом
- ✅ Создан `MatrixSelector` для матрицы атрибутов
- ✅ Создан `ProductVariantSelector` - умный компонент-обертка

#### Этап 5: Интеграция с корзиной ✅
- ✅ Обновлен `CartService` для сохранения `selectedAttributes`
- ✅ Обновлен `AddToCartDto` для поддержки атрибутов
- ✅ Создано руководство по миграции (`MIGRATION_GUIDE.md`)

### ❌ Что не доделано:

#### Этап 1: Схема БД
- ❌ **Миграции Prisma не созданы** - нужно выполнить `npx prisma migrate dev --name add_product_variants_system`
- ❌ **Prisma Client не перегенерирован** - нужно выполнить `npx prisma generate`
- ❌ **Обратная совместимость** - нужен SQL скрипт для обновления существующих товаров (см. MIGRATION_GUIDE.md)

#### Этап 2: API
- ❌ **Обновление товаров** - нет PUT/PATCH endpoints
- ❌ **Удаление товаров** - нет DELETE endpoint
- ❌ **Массовое создание вариантов** - нет bulk операций
- ❌ **Валидация комбинаций атрибутов** - нет проверки на дубликаты
- ❌ **Фильтрация и поиск** - нет расширенного поиска по атрибутам
- ❌ **Кэширование** - нет кэширования для часто запрашиваемых товаров

#### Этап 3: UI компоненты
- ❌ **Интеграция в страницу Product.tsx** - компоненты созданы, но не интегрированы в Product.tsx (нужно заменить старый селектор на ProductVariantSelector)
- ❌ **RangeSelector** - компонент для диапазонов размеров не создан
- ❌ **ConfigurableSelector** - компонент для сложных конфигураций не создан
- ⚠️ **Обработка ошибок** - базовая обработка есть в MatrixSelector, но можно улучшить
- ⚠️ **Загрузка состояний** - есть в MatrixSelector, но нет skeleton loaders
- ⚠️ **Валидация на фронтенде** - базовая валидация есть, но можно улучшить

#### Этап 4: Админ-панель
- ❌ **Интерфейс создания товара** - полностью не реализован
- ❌ **Выбор типа товара** - нет UI для выбора ProductType
- ❌ **Управление атрибутами** - нет интерфейса для добавления/редактирования атрибутов
- ❌ **Редактор матрицы цен** - нет табличного редактора для матрицы
- ❌ **Массовый импорт** - нет функционала импорта из Excel/CSV
- ❌ **Визуализация вариантов** - нет предпросмотра созданных вариантов

#### Этап 5: Интеграция с корзиной
- ✅ **Обновление CartService** - обновлен для работы с selectedAttributes
- ⚠️ **Отображение в корзине** - Cart.tsx использует моковые данные, нужно подключить к API и добавить отображение selectedAttributes
- ❌ **Обновление Checkout** - нет отображения вариантов в форме заказа
- ✅ **Обновление OrderItem** - схема обновлена для сохранения selectedAttributes

#### Дополнительно
- ❌ **Тестирование** - нет unit и integration тестов
- ❌ **Документация API** - нет Swagger/OpenAPI документации
- ❌ **Примеры данных** - нет seed данных для тестирования
- ❌ **Миграция существующих товаров** - нет скрипта для конвертации старых товаров

