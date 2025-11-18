import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as promClient from 'prom-client';

/**
 * Prometheus Metrics Service
 * 
 * Provides Prometheus metrics collection and export
 */
@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly registry: promClient.Registry;
  private readonly metricsEnabled: boolean;

  // HTTP Metrics
  public readonly httpRequestDuration: promClient.Histogram<string>;
  public readonly httpRequestsTotal: promClient.Counter<string>;
  public readonly httpActiveRequests: promClient.Gauge<string>;

  // Database Metrics
  public readonly dbQueryDuration: promClient.Histogram<string>;
  public readonly dbQueriesTotal: promClient.Counter<string>;

  // Cache Metrics
  public readonly cacheHits: promClient.Counter<string>;
  public readonly cacheMisses: promClient.Counter<string>;
  public readonly cacheOperations: promClient.Counter<string>;

  // Business Metrics
  public readonly ordersCreated: promClient.Counter<string>;
  public readonly cartAbandonments: promClient.Counter<string>;
  public readonly productViews: promClient.Counter<string>;

  constructor(private readonly configService: ConfigService) {
    this.metricsEnabled = this.configService.get<boolean>('ENABLE_METRICS', false);

    // Create a new registry
    this.registry = new promClient.Registry();

    // Set default labels (applied to all metrics)
    this.registry.setDefaultLabels({
      app: 'ritual-api',
      version: this.configService.get<string>('APP_VERSION', '1.0.0'),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    });

    // Collect default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({
      register: this.registry,
      prefix: 'nodejs_',
    });

    // HTTP Request Duration Histogram
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    // HTTP Requests Total Counter
    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // Active HTTP Requests Gauge
    this.httpActiveRequests = new promClient.Gauge({
      name: 'http_active_requests',
      help: 'Number of active HTTP requests',
      labelNames: ['method', 'route'],
      registers: [this.registry],
    });

    // Database Query Duration Histogram
    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // Database Queries Total Counter
    this.dbQueriesTotal = new promClient.Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'status'],
      registers: [this.registry],
    });

    // Cache Hits Counter
    this.cacheHits = new promClient.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['key'],
      registers: [this.registry],
    });

    // Cache Misses Counter
    this.cacheMisses = new promClient.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['key'],
      registers: [this.registry],
    });

    // Cache Operations Counter
    this.cacheOperations = new promClient.Counter({
      name: 'cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'status'],
      registers: [this.registry],
    });

    // Orders Created Counter
    this.ordersCreated = new promClient.Counter({
      name: 'orders_created_total',
      help: 'Total number of orders created',
      labelNames: ['status', 'payment_method'],
      registers: [this.registry],
    });

    // Cart Abandonments Counter
    this.cartAbandonments = new promClient.Counter({
      name: 'cart_abandonments_total',
      help: 'Total number of abandoned carts',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    // Product Views Counter
    this.productViews = new promClient.Counter({
      name: 'product_views_total',
      help: 'Total number of product views',
      labelNames: ['product_id', 'category_id'],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    if (this.metricsEnabled) {
      console.log('Prometheus metrics collection enabled');
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    if (!this.metricsEnabled) {
      return '# Metrics collection is disabled\n';
    }
    return this.registry.metrics();
  }

  /**
   * Get registry for custom metrics
   */
  getRegistry(): promClient.Registry {
    return this.registry;
  }

  /**
   * Check if metrics are enabled
   */
  isEnabled(): boolean {
    return this.metricsEnabled;
  }
}

