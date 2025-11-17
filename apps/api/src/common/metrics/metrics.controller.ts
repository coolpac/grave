import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getMetrics() {
    return {
      metrics: this.metricsService.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  }
}

