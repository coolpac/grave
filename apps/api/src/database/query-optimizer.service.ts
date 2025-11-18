import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Query Optimizer Service
 * 
 * Provides utilities for optimizing Prisma queries:
 * - Field selection (select only needed fields)
 * - Pagination helpers
 * - Cursor-based pagination
 */
@Injectable()
export class QueryOptimizerService {
  /**
   * Create optimized select object for common queries
   */
  createSelect<T extends Record<string, any>>(fields: (keyof T)[]): Prisma.SelectSubset<T, any> {
    const select: any = {};
    for (const field of fields) {
      select[field as string] = true;
    }
    return select as Prisma.SelectSubset<T, any>;
  }

  /**
   * Create pagination parameters
   */
  createPagination(page?: number, limit?: number, maxLimit = 100) {
    const validPage = Math.max(1, page || 1);
    const validLimit = Math.min(maxLimit, Math.max(1, limit || 20));

    return {
      skip: (validPage - 1) * validLimit,
      take: validLimit,
      page: validPage,
      limit: validLimit,
    };
  }

  /**
   * Create cursor-based pagination parameters
   */
  createCursorPagination(cursor?: number, limit?: number, maxLimit = 100) {
    const validLimit = Math.min(maxLimit, Math.max(1, limit || 20));

    return {
      take: validLimit + 1, // Take one extra to check if there's a next page
      skip: cursor ? 1 : 0, // Skip the cursor itself
      cursor: cursor ? { id: cursor } : undefined,
      limit: validLimit,
    };
  }

  /**
   * Process cursor-based pagination result
   */
  processCursorResult<T extends { id: number }>(
    items: T[],
    limit: number,
  ): {
    data: T[];
    nextCursor: number | null;
    hasMore: boolean;
  } {
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Optimize include for list queries (reduce nested data)
   */
  createListInclude<T extends Record<string, any>>(
    include: T,
    options?: {
      limitNested?: number;
      selectFields?: Record<string, string[]>;
    },
  ): T {
    const optimized = { ...include };

    // Limit nested arrays if specified
    if (options?.limitNested) {
      for (const key in optimized) {
        if (Array.isArray(optimized[key])) {
          // This would need to be handled in the actual query
          // For now, we return the include as-is
        }
      }
    }

    return optimized;
  }

  /**
   * Create optimized orderBy
   */
  createOrderBy(
    field: string,
    direction: 'asc' | 'desc' = 'desc',
  ): Record<string, 'asc' | 'desc'> {
    return { [field]: direction };
  }

  /**
   * Create composite orderBy
   */
  createCompositeOrderBy(
    fields: Array<{ field: string; direction: 'asc' | 'desc' }>,
  ): Record<string, 'asc' | 'desc'> {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    for (const { field, direction } of fields) {
      orderBy[field] = direction;
    }
    return orderBy;
  }
}

