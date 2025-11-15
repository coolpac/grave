# Upload Module

Модуль для загрузки и управления изображениями товаров.

## Endpoints

### POST `/api/upload/image`
Загрузка изображения (только для админов).

**Request:**
- `file` (multipart/form-data) - файл изображения

**Response:**
```json
{
  "url": "http://localhost:3000/uploads/1234567890-123456789.jpg"
}
```

### POST `/api/upload/product/:productId/media`
Загрузка изображения для товара.

**Request:**
- `file` (multipart/form-data) - файл изображения
- `order` (optional) - порядок изображения

**Response:**
```json
{
  "id": 1,
  "productId": 1,
  "url": "http://localhost:3000/uploads/1234567890-123456789.jpg",
  "type": "image",
  "order": 0
}
```

### PATCH `/api/upload/media/:id/order`
Обновление порядка изображения.

**Request:**
```json
{
  "order": 2
}
```

### POST `/api/upload/media/reorder`
Массовое обновление порядка изображений.

**Request:**
```json
{
  "mediaIds": [3, 1, 2]
}
```

### DELETE `/api/upload/media/:id`
Удаление изображения (также удаляет файл с диска).

## Валидация

- Разрешенные типы: JPEG, PNG, WEBP, GIF
- Максимальный размер: 10MB
- Все эндпоинты требуют аутентификации и прав администратора

## Хранение

Изображения сохраняются в директории `uploads/` в корне проекта.
Публичный доступ через `/uploads/:filename`.






