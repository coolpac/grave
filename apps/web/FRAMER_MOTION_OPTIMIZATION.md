# Оптимизация Framer Motion для мобильных устройств

## Обзор

Реализована комплексная система оптимизации анимаций Framer Motion для улучшения производительности на мобильных устройствах и уважения предпочтений пользователей по уменьшению анимаций.

## Основные компоненты

### 1. `useReducedMotion` хук

**Файл:** `apps/web/src/hooks/useReducedMotion.ts`

Хук автоматически определяет, нужно ли уменьшить анимации на основе:
- `prefers-reduced-motion` media query
- Производительности устройства (hardware concurrency, memory)
- Типа соединения (2G/slow-2g)
- Мобильных устройств

**Использование:**
```typescript
import { useReducedMotion } from '../hooks/useReducedMotion'

function MyComponent() {
  const { shouldReduceMotion, prefersReducedMotion, isLowEndDevice } = useReducedMotion()
  
  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
      transition={getTransition(shouldReduceMotion, 'fast')}
    >
      Content
    </motion.div>
  )
}
```

### 2. Animation Variants

**Файл:** `apps/web/src/utils/animation-variants.ts`

Переиспользуемые варианты анимаций, оптимизированные для производительности:

- **fadeIn** - только opacity
- **slideIn** - transform (y, x)
- **scaleIn** - transform (scale)
- **slideInFromTop** - transform (y)
- **hoverScale** - для hover эффектов
- **hoverLift** - подъем при hover
- **staggerContainer/staggerItem** - для списков

**Использование:**
```typescript
import { getAnimationVariants, getTransition } from '../utils/animation-variants'

<motion.div
  variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
  initial="hidden"
  animate="visible"
  exit="exit"
>
  Content
</motion.div>
```

### 3. Оптимизированные Transition

Все transitions используют:
- `transform` вместо `width/height`
- Минимальную длительность на мобильных
- Упрощенные easing функции
- Отключение spring анимаций на мобильных

## Оптимизации компонентов

### AnimatePresence

- `mode="wait"` для модальных окон
- `initial={false}` для первого рендера
- Упрощенные exit анимации на слабых устройствах

### Motion компоненты

Все `motion.*` компоненты проверяют `shouldReduceMotion`:
- `whileHover` и `whileTap` отключаются на слабых устройствах
- Используются оптимизированные transitions
- Spring анимации заменяются на ease transitions на мобильных

### Критический путь

- Удалены анимации из `LoadingScreen` на слабых устройствах
- Hero секция на Home без анимаций
- Упрощенные анимации для первого рендера

## Обновленные компоненты

### Страницы
- ✅ `Home.tsx` - оптимизированы все motion компоненты
- ✅ `Cart.tsx` - оптимизированы анимации списка и кнопок
- ✅ `Product.tsx` - отключены scroll-based анимации на слабых устройствах
- ✅ `MaterialCategories.tsx` - оптимизированы stagger анимации
- ✅ `LoadingScreen.tsx` - упрощена анимация загрузки

### Компоненты
- ✅ `BannerCarousel.tsx` - оптимизирован AnimatePresence
- ✅ `FlyingElement.tsx` - полностью отключен на слабых устройствах
- ✅ `SimpleProductCard.tsx` - оптимизированы hover эффекты
- ✅ `VariantSelector.tsx` - оптимизированы кнопки выбора
- ✅ `MatrixSelector.tsx` - оптимизированы анимации и индикатор загрузки
- ✅ `SortSelect.tsx` - оптимизирован dropdown
- ✅ `FilterChips.tsx` - оптимизированы кнопки фильтров

## Производительность

### Метрики оптимизации

1. **Отключение анимаций на слабых устройствах:**
   - Hardware concurrency ≤ 2
   - Device memory ≤ 2GB
   - Slow connection (2G/slow-2g)
   - Мобильные устройства с ≤ 4 ядрами

2. **Упрощение анимаций:**
   - Spring → ease transitions на мобильных
   - Длительность уменьшена на 50% на слабых устройствах
   - Отключены бесконечные анимации (repeat: Infinity)

3. **GPU ускорение:**
   - Все анимации используют `transform` и `opacity`
   - Добавлен `willChange: 'transform'` где необходимо

## Best Practices

### ✅ Правильно

```typescript
// Использование useReducedMotion
const { shouldReduceMotion } = useReducedMotion()

<motion.button
  whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
  transition={getTransition(shouldReduceMotion, 'fast')}
>
  Button
</motion.button>

// Использование variants
<motion.div
  variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
  initial="hidden"
  animate="visible"
>
  Content
</motion.div>
```

### ❌ Неправильно

```typescript
// Жестко заданные анимации без проверки
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: 'spring', stiffness: 300 }} // Spring на мобильных!
>
  Content
</motion.div>

// Анимации width/height вместо transform
<motion.div
  animate={{ width: 100, height: 100 }} // Плохо для производительности
>
  Content
</motion.div>
```

## Измерение производительности

Для измерения FPS используйте скрипт:
```bash
node apps/web/scripts/measure-fps.js
```

Или в Chrome DevTools:
1. Откройте Performance tab
2. Включите "Web Vitals"
3. Запишите сессию
4. Проверьте FPS и Frame drops

## Дополнительные оптимизации

### Ленивая загрузка

Тяжелые анимационные компоненты загружаются динамически:
```typescript
const ProductImageGallery = lazy(() => import('../components/ProductImageGallery'))
```

### Условный рендеринг

На слабых устройствах некоторые анимации полностью отключены:
```typescript
if (shouldReduceMotion) {
  return null // Полностью отключаем анимацию
}
```

## Результаты

- ✅ Улучшена производительность на мобильных устройствах
- ✅ Уважаются предпочтения пользователей (prefers-reduced-motion)
- ✅ Снижен overhead от Framer Motion на слабых устройствах
- ✅ Сохранены плавные анимации на мощных устройствах
- ✅ Все анимации используют GPU ускорение

## Поддержка

При добавлении новых анимаций:
1. Используйте `useReducedMotion` хук
2. Используйте `getAnimationVariants` и `getTransition`
3. Проверяйте `shouldReduceMotion` перед применением анимаций
4. Используйте `transform` вместо `width/height`
5. Избегайте spring анимаций на мобильных








