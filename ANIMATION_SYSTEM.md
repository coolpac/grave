# Animation System - Performance & Accessibility

Система анимаций с оптимизацией для 60fps и поддержкой accessibility.

## Стандартизированные длительности

### CSS Переменные

```css
--duration-fast: 160ms;        /* Hover/Press эффекты */
--duration-normal: 180ms;       /* Hover/Press эффекты (альтернатива) */
--duration-slow: 200ms;         /* Hover/Press эффекты (максимум) */
--duration-section: 300ms;      /* Переходы секций */
--duration-section-slow: 360ms; /* Переходы секций (максимум) */
```

### Easing Functions

```css
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

## Правила производительности (60fps)

### 1. Используйте только transform/opacity

✅ **Хорошо:**
```css
.element {
  transition: transform 160ms ease, opacity 160ms ease;
}
```

❌ **Плохо:**
```css
.element {
  transition: width 160ms ease, height 160ms ease; /* Вызывает layout */
  transition: background-color 160ms ease; /* Вызывает repaint */
}
```

### 2. will-change только на hover

✅ **Правильно:**
```css
.button {
  transition: transform 160ms ease;
}

.button:hover {
  will-change: transform;
}

.button:not(:hover) {
  will-change: auto;
}
```

❌ **Неправильно:**
```css
.button {
  will-change: transform; /* Всегда активен - избыточное потребление ресурсов */
}
```

### 3. Оптимизация для списков

Снижаем blur/shadow в списках для лучшей производительности:

```css
.list-optimized {
  backdrop-filter: blur(8px); /* вместо 12px */
}

.list-optimized * {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
}
```

## Accessibility - prefers-reduced-motion

### Отключение анимаций

Все анимации автоматически отключаются при `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Отключение sweep-бликов

```css
@media (prefers-reduced-motion: reduce) {
  .stone-card::after {
    animation: none;
    opacity: 0;
  }
  
  [class*="shimmer"],
  [class*="sweep"] {
    animation: none !important;
  }
}
```

### Замораживание параллакса

```css
.parallax {
  will-change: transform;
  transition: transform 300ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .parallax {
    will-change: auto;
    transform: none !important;
    transition: none;
  }
}
```

## Примеры использования

### Hover эффект (160-200ms)

```css
.card {
  transition: 
    transform var(--duration-fast, 160ms) var(--ease-out, ease),
    opacity var(--duration-fast, 160ms) var(--ease-out, ease);
}

.card:hover {
  transform: translateY(-2px);
  will-change: transform;
}

.card:not(:hover) {
  will-change: auto;
}
```

### Переход секции (300-360ms)

```css
.section {
  transition: 
    transform var(--duration-section, 300ms) var(--ease-in-out, ease),
    opacity var(--duration-section, 300ms) var(--ease-in-out, ease);
}
```

### Оптимизированный список

```html
<ul class="list-optimized">
  <li class="card">...</li>
  <li class="card">...</li>
</ul>
```

### Параллакс (с поддержкой accessibility)

```html
<div class="parallax" data-parallax="0.5">
  Контент с параллаксом
</div>
```

## Чеклист производительности

- [ ] Используются только `transform` и `opacity`
- [ ] ] `will-change` только на hover
- [ ] Длительности: 160-200ms для hover, 300-360ms для секций
- [ ] Blur/shadow снижены в списках
- [ ] Все анимации отключаются при `prefers-reduced-motion`
- [ ] Sweep-блики отключены при `prefers-reduced-motion`
- [ ] Параллакс заморожен при `prefers-reduced-motion`

## Ссылки

- [CSS-Tricks: Ground Rules for Web Animations](https://css-tricks.com/ground-rules-for-web-animations/)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Web.dev: Animations](https://web.dev/animations/)






