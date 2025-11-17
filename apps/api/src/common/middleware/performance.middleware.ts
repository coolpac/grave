import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Performance');
  private readonly slowRequestThreshold = 1000; // 1 секунда

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Перехватываем окончание ответа
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, originalUrl } = req;
      const { statusCode } = res;

      // Логируем медленные запросы
      if (duration > this.slowRequestThreshold) {
        this.logger.warn(
          `Slow request: ${method} ${originalUrl} - ${duration}ms - Status: ${statusCode}`,
        );
      }

      // Метрики для мониторинга (можно отправить в Prometheus, DataDog и т.д.)
      if (process.env.ENABLE_METRICS === 'true') {
        // Здесь можно добавить отправку метрик в систему мониторинга
        // Например: metrics.histogram('http_request_duration', duration, { method, route, statusCode })
      }
    });

    next();
  }
}

