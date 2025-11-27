import axios from 'axios';

// Use relative path in production, absolute URL in development
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Client': 'admin',
  },
});

// Добавляем токен из localStorage к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обработка ошибок 401 - перенаправление на логин
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Удаляем невалидный токен
      localStorage.removeItem('authToken');
      
      // Определяем базовый путь для редиректа
      const basePath = import.meta.env.PROD ? '/admin' : '';
      const loginPath = `${basePath}/login`;
      
      // Перенаправляем на страницу логина, если мы не на ней уже
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

