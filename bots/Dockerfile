# Dockerfile для Telegram ботов
# Multi-stage build для оптимизации размера

FROM python:3.11-slim as builder

WORKDIR /app

# Установка зависимостей для компиляции
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements и устанавливаем зависимости
COPY requirements_v2.txt .
RUN pip install --no-cache-dir --user -r requirements_v2.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Копируем установленные пакеты
COPY --from=builder /root/.local /root/.local

# Добавляем путь к установленным пакетам
ENV PATH=/root/.local/bin:$PATH

# Копируем код ботов
COPY *.py ./

# Создаем директорию для логов
RUN mkdir -p /app/logs

# Переменные окружения по умолчанию
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8001}/health')" || exit 1

# Порт по умолчанию (переопределяется в docker-compose)
EXPOSE 8001

# Запуск бота (переопределяется в docker-compose)
CMD ["python", "customer_bot_v2.py"]
