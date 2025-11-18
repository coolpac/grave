import { Controller, Get, Header } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';

/**
 * Metrics Controller
 * 
 * Exposes Prometheus metrics endpoint
 * GET /metrics - Returns metrics in Prometheus format
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly prometheus: PrometheusService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(): Promise<string> {
    return this.prometheus.getMetrics();
  }
}

