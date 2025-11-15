# Руководство по миграции и запуску новой системы товаров

## Шаг 1: Миграция базы данных

```bash
cd apps/api
npx prisma migrate dev --name add_product_variants_system
npx prisma generate
```

Это создаст миграцию для:
- Новых enum'ов (ProductType, UnitType)
- Моделей ProductAttribute и ProductAttributeValue
- Обновленных моделей Product, ProductVariant, CartItem, OrderItem

## Шаг 2: Обновление существующих товаров

После миграции нужно обновить существующие товары, чтобы они имели `productType`:

```sql
-- Установить SIMPLE для товаров без вариантов
UPDATE products SET "productType" = 'SIMPLE' WHERE "productType" IS NULL AND id NOT IN (
  SELECT DISTINCT "productId" FROM product_variants
);

-- Установить SINGLE_VARIANT для товаров с вариантами (старая система)
UPDATE products SET "productType" = 'SINGLE_VARIANT' WHERE "productType" IS NULL AND id IN (
  SELECT DISTINCT "productId" FROM product_variants
);
```

## Шаг 3: Интеграция компонентов в Product.tsx

Нужно заменить старый селектор вариантов на новый `ProductVariantSelector`:

```typescript
import ProductVariantSelector from '../components/product/ProductVariantSelector'

// В компоненте Product:
const handleAddToCartWithAttributes = async (variantId: number | null, selectedAttributes: Record<string, string>) => {
  // Обновленная логика добавления в корзину с поддержкой атрибутов
  await axios.post(`${API_URL}/cart/add`, {
    productId: product.id,
    variantId: variantId,
    quantity: 1,
    selectedAttributes: selectedAttributes,
  })
}

// В JSX заменить старый селектор на:
<ProductVariantSelector
  product={product}
  onAddToCart={handleAddToCartWithAttributes}
/>
```

## Шаг 4: Тестирование

1. Создать тестовый товар типа SIMPLE
2. Создать товар типа SINGLE_VARIANT (например, вазы)
3. Создать товар типа MATRIX (например, плита мраморная)
4. Проверить добавление в корзину
5. Проверить отображение в корзине с атрибутами

## Шаг 5: Создание админ-панели

После базовой интеграции нужно создать админ-панель для:
- Создания товаров с атрибутами
- Управления матрицей цен
- Массового импорта из прайс-листов

