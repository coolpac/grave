import { Injectable, LoggerService, Inject, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * Database Service
 * 
 * Provides database query logging, performance monitoring, and optimization utilities.
 */
@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly slowQueryThreshold: number;
  private readonly enableQueryLogging: boolean;
  private readonly enableExplainAnalyze: boolean;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.slowQueryThreshold =
      this.configService.get<number>('DB_SLOW_QUERY_THRESHOLD_MS') || 100;
    this.enableQueryLogging =
      this.configService.get<boolean>('DB_ENABLE_QUERY_LOGGING') || false;
    this.enableExplainAnalyze =
      this.configService.get<boolean>('DB_ENABLE_EXPLAIN_ANALYZE') || false;
  }

  async onModuleInit() {
    // Enable query logging if configured
    if (this.enableQueryLogging) {
      this.setupQueryLogging();
    }

    this.logger.log({
      message: 'DatabaseService initialized',
      slowQueryThreshold: `${this.slowQueryThreshold}ms`,
      queryLogging: this.enableQueryLogging,
      explainAnalyze: this.enableExplainAnalyze,
    });
  }

  /**
   * Setup Prisma query logging middleware
   */
  private setupQueryLogging() {
    this.prisma.$use(async (params, next) => {
      const startTime = Date.now();
      const result = await next(params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        this.logSlowQuery(params, duration);
      }

      return result;
    });
  }

  /**
   * Log slow query with details
   */
  private logSlowQuery(params: any, duration: number) {
    const logData = {
      message: 'Slow database query detected',
      duration: `${duration}ms`,
      model: params.model,
      action: params.action,
      args: this.sanitizeQueryArgs(params.args),
    };

    this.logger.warn(logData);

    // Run EXPLAIN ANALYZE for slow queries if enabled
    if (this.enableExplainAnalyze && params.action === 'findMany') {
      this.explainAnalyzeQuery(params).catch((error) => {
        this.logger.error({
          message: 'Failed to run EXPLAIN ANALYZE',
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }

  /**
   * Sanitize query arguments for logging (remove sensitive data)
   */
  private sanitizeQueryArgs(args: any): any {
    if (!args) return args;

    const sanitized = { ...args };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Run EXPLAIN ANALYZE on a query
   */
  private async explainAnalyzeQuery(params: any) {
    try {
      // Build SQL query from Prisma params
      // Note: This is a simplified version. In production, you might want to use
      // Prisma's query engine events or a more sophisticated approach.
      const model = params.model;
      const action = params.action;

      if (action === 'findMany' && model) {
        // For complex queries, we'll log the model and action
        // Full EXPLAIN ANALYZE would require raw SQL execution
        this.logger.debug({
          message: 'EXPLAIN ANALYZE suggestion',
          model,
          action,
          suggestion: `Run EXPLAIN ANALYZE on ${model}.${action} query manually`,
        });
      }
    } catch (error) {
      // Silently fail - this is a monitoring feature
      this.logger.debug({
        message: 'EXPLAIN ANALYZE not available',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get database connection pool statistics
   */
  async getPoolStats() {
    try {
      // Prisma doesn't expose pool stats directly, but we can check connection
      const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
      `;

      return {
        activeConnections: Number(result[0]?.count || 0),
        // Note: For more detailed pool stats, you'd need to query pg_stat_database
        // or use a connection pooler like PgBouncer
      };
    } catch (error) {
      this.logger.error({
        message: 'Failed to get pool stats',
        error: error instanceof Error ? error.message : String(error),
      });
      return { activeConnections: 0 };
    }
  }

  /**
   * Get slow queries from PostgreSQL (if pg_stat_statements is enabled)
   */
  async getSlowQueries(limit = 10) {
    try {
      const result = await this.prisma.$queryRaw<Array<{
        query: string;
        calls: bigint;
        total_time: number;
        mean_time: number;
      }>>`
        SELECT 
          left(query, 100) as query,
          calls,
          total_exec_time as total_time,
          mean_exec_time as mean_time
        FROM pg_stat_statements
        WHERE mean_exec_time > ${this.slowQueryThreshold}
        ORDER BY mean_exec_time DESC
        LIMIT ${limit}
      `;

      return result.map((row) => ({
        query: row.query,
        calls: Number(row.calls),
        totalTime: Number(row.total_time),
        meanTime: Number(row.mean_time),
      }));
    } catch (error) {
      // pg_stat_statements might not be enabled
      this.logger.debug({
        message: 'pg_stat_statements not available',
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Analyze table statistics
   */
  async analyzeTable(tableName: string) {
    try {
      await this.prisma.$executeRawUnsafe(`ANALYZE ${tableName}`);
      this.logger.log({
        message: `Table ${tableName} analyzed`,
      });
    } catch (error) {
      this.logger.error({
        message: `Failed to analyze table ${tableName}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Vacuum table (for maintenance)
   */
  async vacuumTable(tableName: string, full = false) {
    try {
      const command = full ? `VACUUM FULL ${tableName}` : `VACUUM ${tableName}`;
      await this.prisma.$executeRawUnsafe(command);
      this.logger.log({
        message: `Table ${tableName} vacuumed`,
        full,
      });
    } catch (error) {
      this.logger.error({
        message: `Failed to vacuum table ${tableName}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

