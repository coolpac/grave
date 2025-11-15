/**
 * Пример серверного эндпоинта для валидации initData от Telegram WebApp
 * 
 * Этот файл - пример реализации. В реальном проекте это должно быть на бэкенде.
 * 
 * Использование:
 * 1. Установите зависимости: npm install express crypto
 * 2. Замените YOUR_BOT_TOKEN на токен вашего бота
 * 3. Запустите сервер: node validate-init-data.example.js
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Замените на токен вашего бота
const BOT_TOKEN = 'YOUR_BOT_TOKEN';

/**
 * Валидация initData от Telegram WebApp
 * @param {string} initData - строка initData от Telegram
 * @param {string} botToken - токен бота
 * @returns {boolean} - true если данные валидны
 */
function validateInitData(initData, botToken) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return false;
    }

    // Удаляем hash из параметров для проверки
    urlParams.delete('hash');

    // Сортируем параметры по ключу
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисляем хеш
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Сравниваем хеши
    return calculatedHash === hash;
  } catch (error) {
    console.error('Error validating initData:', error);
    return false;
  }
}

// Эндпоинт для валидации
app.post('/api/validate-init-data', (req, res) => {
  const { initData } = req.body;

  if (!initData) {
    return res.status(400).json({
      success: false,
      error: 'initData is required',
    });
  }

  const isValid = validateInitData(initData, BOT_TOKEN);

  if (isValid) {
    res.json({ success: true });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid initData',
    });
  }
});

// Для разработки: эндпоинт всегда возвращает success (закомментируйте в продакшене!)
app.post('/api/validate-init-data-dev', (req, res) => {
  console.warn('⚠️  Development mode: skipping initData validation');
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Validation endpoint: http://localhost:${PORT}/api/validate-init-data`);
  console.log(`⚠️  Don't forget to set BOT_TOKEN!`);
});






