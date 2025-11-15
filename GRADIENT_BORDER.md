# Gradient Border Utility

Утилита `.gradient-border` для создания градиентных рамок через `::before` с `mask-composite`.

## Техника

Использует технику **mask-composite: exclude** (XOR) для показа только линии рамки:

1. `position: relative` на родителе
2. `::before` с `position: absolute`, `inset: 0`, `padding: 1px`
3. `background: linear-gradient` с цветами
4. `mask: content-box XOR border-box` через `mask-composite: exclude`

## Использование

### Базовое использование

```html
<div class="gradient-border">
  <p>Контент внутри карточки</p>
</div>
```

### С вариантами

```html
<!-- Тонкая рамка (1px) -->
<div class="gradient-border gradient-border--thin">...</div>

<!-- Средняя рамка (2px) -->
<div class="gradient-border gradient-border--medium">...</div>

<!-- Толстая рамка (3px) -->
<div class="gradient-border gradient-border--thick">...</div>
```

### Цветовые варианты

```html
<!-- Бронзовая рамка (по умолчанию) -->
<div class="gradient-border gradient-border--bronze">...</div>

<!-- Гранатовая рамка -->
<div class="gradient-border gradient-border--garnet">...</div>

<!-- Кастомный цвет -->
<div 
  class="gradient-border gradient-border--custom"
  style="--gradient-border-color: #ff0000; --gradient-border-color-opacity: 0.5;"
>
  ...
</div>
```

### Направление градиента

```html
<!-- Горизонтальный (по умолчанию, 90deg) -->
<div class="gradient-border gradient-border--horizontal">...</div>

<!-- Вертикальный (180deg) -->
<div class="gradient-border gradient-border--vertical">...</div>

<!-- Диагональный (135deg) -->
<div class="gradient-border gradient-border--diagonal">...</div>
```

### Анимированная рамка

```html
<div class="gradient-border gradient-border--animated">...</div>
```

## CSS Переменные

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `--gradient-border-width` | Толщина рамки | `1px` |
| `--gradient-border-color` | Основной цвет (используется для middle) | `var(--bronze-500)` |
| `--gradient-border-color-opacity` | Прозрачность основного цвета | `0.5` (light), `0.6` (dark) |
| `--gradient-border-start` | Начальный цвет градиента | `rgba(255, 255, 255, 0.12)` |
| `--gradient-border-middle` | Средний цвет градиента | `rgba(139, 107, 63, 0.5)` |
| `--gradient-border-end` | Конечный цвет градиента | `rgba(255, 255, 255, 0.12)` |
| `--gradient-border-gradient` | Полный градиент | `linear-gradient(90deg, ...)` |

## Примеры

### Карточка с градиентной рамкой

```html
<div class="gradient-border gradient-border--bronze rounded-lg p-6">
  <h2 class="font-inscription">Заголовок</h2>
  <p class="font-body">Текст карточки</p>
</div>
```

### Кнопка с градиентной рамкой

```html
<button class="gradient-border gradient-border--medium rounded-md px-4 py-2">
  Нажми меня
</button>
```

### Кастомная рамка

```html
<div 
  class="gradient-border gradient-border--thick"
  style="
    --gradient-border-start: rgba(255, 255, 255, 0.2);
    --gradient-border-middle: rgba(158, 43, 43, 0.7);
    --gradient-border-end: rgba(255, 255, 255, 0.2);
  "
>
  Кастомная рамка
</div>
```

## Технические детали

### Mask Composite

Используется техника **XOR** (exclude) для показа только линии:

```css
mask: 
  linear-gradient(#000 0 0) content-box,
  linear-gradient(#000 0 0);
mask-composite: exclude;
```

Это создаёт эффект "вырезания" внутренней части, оставляя только рамку.

### Совместимость

- ✅ Chrome/Edge (с `-webkit-mask-composite: xor`)
- ✅ Firefox (с `mask-composite: exclude`)
- ✅ Safari (с `-webkit-mask-composite: xor`)
- ⚠️ Старые браузеры: fallback на обычную рамку

### Производительность

- `pointer-events: none` на `::before` исключает взаимодействие
- `z-index: -1` помещает рамку за контент
- `border-radius: inherit` сохраняет скругление углов

## Ссылки

- [CSS-Tricks: Gradient Borders](https://css-tricks.com/gradient-borders-in-css/)
- [MDN: mask-composite](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-composite)
- [MDN: -webkit-mask-composite](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-mask-composite)






