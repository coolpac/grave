import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';

/**
 * Health Check Metrics Service
 * 
 * Exposes Prometheus metrics for health checks:
 * - health_check_duration_seconds - Duration of health checks
 * - health_check_failures_total - Counter of failed health checks
 * - health_check_status - Current status of health checks
 */
@Injectable()
export class HealthMetricsService {
  private readonly healthCheckDuration: Histogram<string>;
  private readonly healthCheckFailures: Counter<string>;
  private readonly healthCheckStatus: Gauge<string>;

  constructor() {
    // Health check duration histogram
    this.healthCheckDuration = new Histogram({
      name: 'health_check_duration_seconds',
      help: 'Duration of health checks in seconds',
      labelNames: ['check_type', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    // Health check failures counter
    this.healthCheckFailures = new Counter({
      name: 'health_check_failures_total',
      help: 'Total number of failed health checks',
      labelNames: ['check_type', 'component'],
    });

    // Health check status gauge
    this.healthCheckStatus = new Gauge({
      name: 'health_check_status',
      help: 'Current status of health checks (1 = healthy, 0 = unhealthy)',
      labelNames: ['component'],
    });
  }

  /**
   * Record health check duration
   */
  recordDuration(checkType: string, status: 'success' | 'failure', duration: number): void {
    this.healthCheckDuration.observe(
      { check_type: checkType, status },
      duration / 1000, // Convert ms to seconds
    );
  }

  /**
   * Increment failure counter
   */
  recordFailure(checkType: string, component: string): void {
    this.healthCheckFailures.inc({ check_type: checkType, component });
  }

  /**
   * Update health check status
   */
  updateStatus(component: string, isHealthy: boolean): void {
    this.healthCheckStatus.set({ component }, isHealthy ? 1 : 0);
  }

  /**
   * Get all metrics
   */
  getMetrics(): string {
    const Registry = require('prom-client').Registry;
    const register = new Registry();
    
    register.registerMetric(this.healthCheckDuration);
    register.registerMetric(this.healthCheckFailures);
    register.registerMetric(this.healthCheckStatus);
    
    return register.metrics();
  }
}

