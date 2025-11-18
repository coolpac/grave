import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';
import * as fs from 'fs';

/**
 * Winston Logger Configuration
 * 
 * Production: JSON format with daily rotation
 * Development: Pretty print to console
 */
export function createWinstonConfig(): WinstonModuleOptions {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
  const logDir = process.env.LOG_DIR || join(process.cwd(), 'logs');
  const maxFiles = process.env.LOG_MAX_FILES || '14d'; // Keep logs for 14 days

  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Common format for all transports
  const commonFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
  );

  // Production format: JSON
  const productionFormat = winston.format.combine(
    commonFormat,
    winston.format.json(),
  );

  // Development format: Pretty print
  const developmentFormat = winston.format.combine(
    commonFormat,
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      const contextStr = context ? `[${context}]` : '';
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} ${level} ${contextStr} ${message} ${metaStr}`;
    }),
  );

  const transports: winston.transport[] = [];

  // Console transport (always enabled)
  transports.push(
    new winston.transports.Console({
      level: logLevel,
      format: isDevelopment ? developmentFormat : productionFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  );

  // File transports (only in production or if LOG_TO_FILE is enabled)
  if (!isDevelopment || process.env.LOG_TO_FILE === 'true') {
    // Error log file (errors only)
    transports.push(
      new DailyRotateFile({
        filename: join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: productionFormat,
        maxFiles: maxFiles,
        maxSize: '20m',
        zippedArchive: true,
        handleExceptions: true,
        handleRejections: true,
      }),
    );

    // Combined log file (all levels)
    transports.push(
      new DailyRotateFile({
        filename: join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: logLevel,
        format: productionFormat,
        maxFiles: maxFiles,
        maxSize: '20m',
        zippedArchive: true,
      }),
    );

    // HTTP access log (for HTTP requests)
    transports.push(
      new DailyRotateFile({
        filename: join(logDir, 'http-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        format: productionFormat,
        maxFiles: maxFiles,
        maxSize: '20m',
        zippedArchive: true,
      }),
    );
  }

  return {
    level: logLevel,
    transports,
    exitOnError: false,
    exceptionHandlers: [
      new DailyRotateFile({
        filename: join(logDir, 'exceptions-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: productionFormat,
        maxFiles: maxFiles,
        maxSize: '20m',
        zippedArchive: true,
      }),
    ],
    rejectionHandlers: [
      new DailyRotateFile({
        filename: join(logDir, 'rejections-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: productionFormat,
        maxFiles: maxFiles,
        maxSize: '20m',
        zippedArchive: true,
      }),
    ],
  };
}

