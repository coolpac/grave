# Grainy Background Utility

Утилита `.grainy-bg` для создания фона с градиентом и слоем шума через SVG фильтры.

## SVG Filter Pipeline

```
feTurbulence (fractalNoise) 
  → feColorMatrix (saturate) 
  → feColorMatrix (alpha matrix) 
  → mix-blend-mode (CSS)
```

### Компоненты фильтра:

1. **feTurbulence** - генерирует фрактальный шум
   - `type="fractalNoise"` - тип шума
   - `baseFrequency` - частота зерна (0.5-0.8)
   - `numOctaves` - количество октав (2-4)
   - `stitchTiles="stitch"` - бесшовное повторение

2. **feColorMatrix (saturate)** - обесцвечивает до grayscale
   - `values="0"` - полное обесцвечивание

3. **feColorMatrix (matrix)** - настраивает альфа-канал
   - Матрица: `0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 [intensity] 0`
   - Контролирует интенсивность шума через альфа-канал

4. **mix-blend-mode** - смешивание с фоном (CSS)
   - `multiply` - для тёмных фонов
   - `overlay` - для светлых фонов
   - `screen` - для очень светлых фонов

## Использование

### Базовое использование

```html
<div class="grainy-bg">
  <p>Контент поверх шума</p>
</div>
```

### С кастомным градиентом

```html
<div 
  class="grainy-bg" 
  style="--grainy-gradient: linear-gradient(135deg, #f0f0f0, #e0e0e0)"
>
  Контент
</div>
```

### Варианты интенсивности

```html
<!-- Тонкий шум -->
<div class="grainy-bg grainy-bg--subtle">...</div>

<!-- Средний шум (по умолчанию) -->
<div class="grainy-bg grainy-bg--medium">...</div>

<!-- Сильный шум -->
<div class="grainy-bg grainy-bg--strong">...</div>
```

### Режимы смешивания

```html
<!-- Multiply (по умолчанию, для тёмных фонов) -->
<div class="grainy-bg">...</div>

<!-- Overlay (для светлых фонов) -->
<div class="grainy-bg grainy-bg--overlay">...</div>

<!-- Screen (для очень светлых фонов) -->
<div class="grainy-bg grainy-bg--screen">...</div>

<!-- Normal (без смешивания) -->
<div class="grainy-bg grainy-bg--normal">...</div>
```

### Кастомизация через CSS переменные

```css
.custom-grainy {
  --grain-opacity: 0.2;
  --grain-frequency: 0.7;
  --grain-octaves: 4;
  --grain-intensity: 0.5;
  --grain-size: 400px;
  --grainy-gradient: radial-gradient(circle, #fff, #f0f0f0);
}
```

```html
<div class="grainy-bg custom-grainy">...</div>
```

## CSS Переменные

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `--grain-opacity` | Прозрачность слоя шума | `0.15` (light), `0.2` (dark) |
| `--grain-frequency` | Частота зерна (baseFrequency) | `0.65` (light), `0.7` (dark) |
| `--grain-octaves` | Количество октав | `3` (light), `4` (dark) |
| `--grain-intensity` | Интенсивность через альфа-канал | `0.4` (light), `0.5` (dark) |
| `--grain-size` | Размер паттерна шума | `300px` |
| `--grainy-gradient` | Градиент фона | `linear-gradient(135deg, hsl(var(--bg))...)` |

## Примеры

### Body фон

```css
body {
  background: linear-gradient(135deg, #f6f7f8, #ffffff);
}

body::before {
  /* Используем утилиту через класс */
}
```

Или:

```html
<body class="grainy-bg grainy-bg--subtle">
  <!-- Контент -->
</body>
```

### Секция с кастомным градиентом

```html
<section 
  class="grainy-bg grainy-bg--medium grainy-bg--overlay"
  style="--grainy-gradient: radial-gradient(circle at 50% 50%, #fff 0%, #f0f0f0 100%)"
>
  <h2>Заголовок</h2>
  <p>Текст</p>
</section>
```

## Технические детали

### Data URL формат

SVG фильтр экспортируется как data URL для:
- Максимальной производительности (нет дополнительных HTTP запросов)
- Инлайнового использования в CSS
- Кэширования браузером

### Совместимость

- ✅ Все современные браузеры
- ✅ Mobile Safari
- ✅ Chrome/Edge
- ✅ Firefox

### Производительность

- SVG фильтры рендерятся на GPU
- `background-size: 300px` оптимизирует повторение
- `pointer-events: none` исключает взаимодействие с псевдоэлементом

## Ссылки

- [CSS-Tricks: Grainy Gradients](https://css-tricks.com/grainy-gradients/)
- [MDN: feTurbulence](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence)
- [MDN: feColorMatrix](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feColorMatrix)
- [MDN: mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode)






