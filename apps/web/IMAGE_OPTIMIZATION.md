# 🖼️ Image Optimization Guide

Документация по оптимизации изображений для production.

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [OptimizedImage Component](#optimizedimage-component)
3. [Backend Integration](#backend-integration)
4. [Progressive Loading](#progressive-loading)
5. [Best Practices](#best-practices)
6. [Testing](#testing)

---

## 🎯 Обзор

Приложение использует **OptimizedImage** компонент для профессиональной работы с изображениями:

- ✅ Автоматическое определение WebP support
- ✅ Responsive images с srcset
- ✅ Lazy loading с Intersection Observer
- ✅ Blur placeholder при загрузке
- ✅ Прогрессивная загрузка (thumbnail → full size)
- ✅ Error fallback на PLACEHOLDER_IMAGE
- ✅ Aspect ratio для предотвращения layout shift

**Цели:**
- Минимизация layout shift (CLS)
- Быстрая загрузка (LCP)
- Оптимальное использование bandwidth
- Поддержка современных форматов (WebP)

---

## 🧩 OptimizedImage Component

### Базовое использование

```tsx
import OptimizedImage from '../components/OptimizedImage'

<OptimizedImage
  src="/api/uploads/image.jpg"
  alt="Product image"
  aspectRatio={1}
  size="medium"
  sizes="100vw"
  placeholder="blur"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | required | URL изображения |
| `alt` | `string` | required | Alt текст |
| `width` | `number` | - | Ширина в пикселях |
| `height` | `number` | - | Высота в пикселях |
| `aspectRatio` | `number` | - | Соотношение сторон (width/height) |
| `size` | `'thumbnail' \| 'medium' \| 'large'` | `'medium'` | Размер для загрузки |
| `sizes` | `string` | `'100vw'` | CSS sizes для responsive images |
| `className` | `string` | `''` | Дополнительные CSS классы |
| `loading` | `'lazy' \| 'eager'` | `'lazy'` | Стратегия загрузки |
| `priority` | `boolean` | `false` | Приоритетная загрузка (без lazy) |
| `objectFit` | `'cover' \| 'contain' \| ...` | `'cover'` | CSS object-fit |
| `placeholder` | `'blur' \| 'empty'` | `'blur'` | Тип placeholder |
| `blurDataURL` | `string` | - | Кастомный blur placeholder |
| `onLoad` | `() => void` | - | Callback при загрузке |
| `onError` | `() => void` | - | Callback при ошибке |

---

## 🔗 Backend Integration

### API Endpoints

Backend должен поддерживать параметры запроса для разных размеров:

```
GET /api/uploads/image.jpg?size=thumbnail&format=webp
GET /api/uploads/image.jpg?size=medium&format=webp
GET /api/uploads/image.jpg?size=large&format=webp
```

### Размеры

- **thumbnail** - 200x200px (для карточек товаров)
- **medium** - 800x800px (для галереи)
- **large** - 1600x1600px (для zoom)

### Форматы

- **webp** - Современный формат (меньший размер)
- **jpeg** - Fallback для старых браузеров

### Пример реализации на backend

```typescript
// Express route example
app.get('/api/uploads/:filename', async (req, res) => {
  const { filename } = req.params
  const size = req.query.size as 'thumbnail' | 'medium' | 'large'
  const format = req.query.format as 'webp' | 'jpeg'

  // Resize and convert image
  const processedImage = await processImage(filename, { size, format })
  
  res.setHeader('Content-Type', `image/${format}`)
  res.setHeader('Cache-Control', 'public, max-age=31536000')
  res.send(processedImage)
})
```

---

## ⚡ Progressive Loading

### Стратегия загрузки

1. **Blur placeholder** (10x10 base64) - мгновенно
2. **Thumbnail** (200x200) - быстро
3. **Full size** (800x800 или 1600x1600) - в фоне

### Пример

```tsx
<OptimizedImage
  src="/api/uploads/product.jpg"
  alt="Product"
  size="medium" // Начнет с thumbnail, затем загрузит medium
  aspectRatio={1}
  placeholder="blur"
/>
```

### Приоритетная загрузка

Для критичных изображений (above the fold):

```tsx
<OptimizedImage
  src="/api/uploads/hero.jpg"
  alt="Hero"
  priority // Загружается сразу, без lazy loading
  size="large"
/>
```

---

## 📐 Aspect Ratio

### Предотвращение Layout Shift

Всегда указывайте `aspectRatio` для предотвращения CLS:

```tsx
// Квадратное изображение
<OptimizedImage aspectRatio={1} />

// 16:9
<OptimizedImage aspectRatio={16 / 9} />

// 4:3
<OptimizedImage aspectRatio={4 / 3} />
```

### Автоматический расчет

Если указаны `width` и `height`:

```tsx
<OptimizedImage
  width={800}
  height={600}
  // aspectRatio будет вычислен автоматически: 800/600 = 1.33
/>
```

---

## 🎨 Responsive Images

### Srcset

Компонент автоматически генерирует srcset для разных размеров:

```tsx
<OptimizedImage
  src="/api/uploads/image.jpg"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  // Генерирует:
  // srcset="...?size=thumbnail&format=webp 200w,
  //         ...?size=medium&format=webp 800w,
  //         ...?size=large&format=webp 1600w"
/>
```

### Sizes Attribute

```tsx
// Мобильный: полная ширина
sizes="100vw"

// Планшет: половина ширины
sizes="50vw"

// Десктоп: треть ширины
sizes="33vw"

// Адаптивный
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
```

---

## 🚀 Best Practices

### 1. Всегда используйте aspectRatio

```tsx
// ❌ Плохо - вызывает layout shift
<OptimizedImage src="..." alt="..." />

// ✅ Хорошо
<OptimizedImage src="..." alt="..." aspectRatio={1} />
```

### 2. Выбирайте правильный size

```tsx
// Карточки товаров
<OptimizedImage size="thumbnail" />

// Галерея
<OptimizedImage size="medium" />

// Zoom/Fullscreen
<OptimizedImage size="large" />
```

### 3. Используйте priority для критичных изображений

```tsx
// Hero image, first product image
<OptimizedImage priority size="large" />
```

### 4. Настройте sizes для responsive

```tsx
// Список товаров (3 колонки на десктопе)
<OptimizedImage
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
/>
```

### 5. Используйте blur placeholder

```tsx
// Автоматический blur
<OptimizedImage placeholder="blur" />

// Кастомный blur (например, из API)
<OptimizedImage
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

---

## 🧪 Testing

### Unit Tests

```bash
# Запустить тесты
pnpm test OptimizedImage
```

### Тестируемые сценарии

- ✅ Рендер с placeholder
- ✅ Приоритетная загрузка
- ✅ Кастомный blur placeholder
- ✅ Aspect ratio
- ✅ Error handling
- ✅ WebP detection
- ✅ Responsive srcset

---

## 🔧 Vite Configuration

### Image Tools Plugin

Vite настроен для оптимизации статических изображений:

```typescript
// vite.config.ts
import { imagetools } from 'vite-imagetools'

plugins: [
  imagetools({
    defaultDirectives: (url) => {
      if (url.searchParams.has('optimized')) {
        return new URLSearchParams({
          format: 'webp',
          quality: '80',
        })
      }
      return new URLSearchParams()
    },
  }),
]
```

### Использование

```tsx
// В компонентах можно использовать:
import optimizedImage from './image.jpg?optimized&w=800&format=webp'
```

---

## 📊 Performance Metrics

### Целевые показатели

- **LCP (Largest Contentful Paint)** < 2.5s
- **CLS (Cumulative Layout Shift)** < 0.1
- **Image Load Time** < 1s для thumbnail

### Мониторинг

Используйте Web Vitals для отслеживания:

```typescript
import { onCLS, onLCP } from 'web-vitals'

onCLS(console.log)
onLCP(console.log)
```

---

## 🔗 Дополнительные ресурсы

- [Web.dev Image Optimization](https://web.dev/fast/#optimize-your-images)
- [Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- [WebP Format](https://developers.google.com/speed/webp)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

---

**Оптимизация изображений - ключ к быстрой загрузке! 🚀**





