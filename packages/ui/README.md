# @monorepo/ui

UI компоненты библиотека для монорепозитория.

## Компоненты

### GlassCard

Glassmorphism карточка с эффектом размытия фона, градиентной рамкой и liquid анимацией.

```tsx
import { GlassCard } from '@monorepo/ui'

<GlassCard variant="default" padding={true}>
  <h2>Заголовок</h2>
  <p>Контент карточки</p>
</GlassCard>
```

**Props:**
- `variant?: "default" | "subtle" | "strong"` - вариант размытия (8px, 12px, 16px)
- `padding?: boolean` - добавлять ли внутренние отступы (по умолчанию `true`)

### Skeleton

Компонент скелетона с shimmer анимацией для отображения состояния загрузки.

```tsx
import { Skeleton } from '@monorepo/ui'

<Skeleton variant="text" width="100%" height={20} />
<Skeleton variant="rectangular" width={200} height={100} />
<Skeleton variant="circular" width={40} height={40} />
```

**Props:**
- `variant?: "text" | "circular" | "rectangular"` - вариант формы
- `width?: string | number` - ширина
- `height?: string | number` - высота
- `animation?: "shimmer" | "pulse" | "none"` - тип анимации

### StickyBar

Закрепленная панель внизу экрана с поддержкой safe-area и микровибрацией.

```tsx
import { StickyBar } from '@monorepo/ui'
import { Button } from '@monorepo/ui'

<StickyBar variant="default" hapticFeedback={true}>
  <Button>Действие</Button>
</StickyBar>
```

**Props:**
- `variant?: "default" | "elevated" | "flat"` - вариант стиля
- `hapticFeedback?: boolean` - включить микровибрацию при нажатии (по умолчанию `true`)

## Тема

Тема включает CSS-переменные для цветов, теней и радиусов:

- `--bg` - основной фон
- `--panel` - фон панелей
- `--border` - цвет границ
- `--accent` - акцентный цвет
- `--text` - основной текст
- `--muted` - приглушенный текст
- `--shadow-sm` до `--shadow-2xl` - тени
- `--radius-xs` до `--radius-full` - радиусы скругления

Тема автоматически поддерживает светлую и темную (Dark Granite) темы.





