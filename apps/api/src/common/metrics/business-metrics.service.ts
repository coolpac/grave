import { Injectable } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';

/**
 * Business Metrics Service
 * 
 * Helper service for recording business-specific metrics
 */
@Injectable()
export class BusinessMetricsService {
  constructor(private readonly prometheus: PrometheusService) {}

  /**
   * Record order creation
   */
  recordOrderCreated(status: string, paymentMethod?: string) {
    if (this.prometheus.isEnabled()) {
      this.prometheus.ordersCreated.inc({
        status,
        payment_method: paymentMethod || 'unknown',
      });
    }
  }

  /**
   * Record cart abandonment
   */
  recordCartAbandonment(reason?: string) {
    if (this.prometheus.isEnabled()) {
      this.prometheus.cartAbandonments.inc({
        reason: reason || 'unknown',
      });
    }
  }

  /**
   * Record product view
   */
  recordProductView(productId: number, categoryId?: number) {
    if (this.prometheus.isEnabled()) {
      this.prometheus.productViews.inc({
        product_id: productId.toString(),
        category_id: categoryId?.toString() || 'unknown',
      });
    }
  }
}

