import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private metricsEnabled = false;
  private metrics: Map<string, number> = new Map();

  constructor(private configService: ConfigService) {
    this.metricsEnabled = this.configService.get<string>('ENABLE_METRICS') === 'true';
  }

  onModuleInit() {
    if (this.metricsEnabled) {
      this.logger.log('Metrics collection enabled');
      // Здесь можно инициализировать подключение к Prometheus, DataDog и т.д.
    }
  }

  onModuleDestroy() {
    // Очистка ресурсов при завершении
  }

  /**
   * Увеличить счетчик
   */
  incrementCounter(name: string, labels?: Record<string, string>) {
    if (!this.metricsEnabled) return;

    const key = this.buildKey(name, labels);
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);

    // Здесь можно отправить метрику в систему мониторинга
    // Например: prometheusClient.counter(name, labels).inc()
  }

  /**
   * Записать значение гистограммы (для времени выполнения)
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>) {
    if (!this.metricsEnabled) return;

    const key = this.buildKey(name, labels);
    // Здесь можно отправить метрику в систему мониторинга
    // Например: prometheusClient.histogram(name, labels).observe(value)
  }

  /**
   * Установить значение gauge
   */
  setGauge(name: string, value: number, labels?: Record<string, string>) {
    if (!this.metricsEnabled) return;

    const key = this.buildKey(name, labels);
    this.metrics.set(key, value);

    // Здесь можно отправить метрику в систему мониторинга
    // Например: prometheusClient.gauge(name, labels).set(value)
  }

  /**
   * Получить все метрики (для эндпоинта /metrics)
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}

