# Шрифты - Локальная подгрузка

## Лицензия

Оба шрифта (Cinzel и Inter) распространяются под **SIL Open Font License (OFL)**, что позволяет:
- Использовать в коммерческих проектах
- Модифицировать
- Распространять
- Встраивать в веб-приложения

## Скачивание шрифтов

### Cinzel
- **Источник**: [Google Fonts - Cinzel](https://fonts.google.com/specimen/Cinzel)
- **Лицензия**: OFL 1.1
- **Формат**: Variable font (woff2)
- **Нагрузки**: 400, 500, 600, 700

### Inter
- **Источник**: [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)
- **Лицензия**: OFL 1.1
- **Формат**: Variable font (woff2)
- **Нагрузки**: 300, 400, 500, 600, 700

## Установка локальных шрифтов

1. Скачайте шрифты в формате woff2:
   - Cinzel: https://fonts.google.com/download?family=Cinzel
   - Inter: https://fonts.google.com/download?family=Inter

2. Создайте директорию для шрифтов:
   ```bash
   mkdir -p apps/web/public/fonts
   mkdir -p apps/admin/public/fonts
   ```

3. Поместите файлы:
   - `cinzel-variable.woff2` → `apps/web/public/fonts/`
   - `inter-variable.woff2` → `apps/web/public/fonts/`
   - (аналогично для admin)

4. Раскомментируйте блок `@font-face` в `apps/web/src/index.css` и `apps/admin/src/index.css`

5. Закомментируйте или удалите `@import` из Google Fonts

## Проверка лицензии

Оба шрифта имеют файл `OFL.txt` в архиве, который подтверждает лицензию OFL.





