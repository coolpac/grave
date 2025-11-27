import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  timestamp: string;
  path: string;
  method: string;
}

/**
 * Рекурсивно преобразует BigInt значения в строки для JSON сериализации
 */
function transformBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(transformBigInt);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        transformed[key] = transformBigInt(obj[key]);
      }
    }
    return transformed;
  }

  return obj;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      map((data) => {
        // Преобразуем BigInt в строки перед сериализацией
        const transformedData = transformBigInt(data);

        // Если ответ уже имеет структуру с meta (пагинация), не оборачиваем
        if (transformedData && typeof transformedData === 'object' && 'meta' in transformedData) {
          return transformedData;
        }

        // Если это массив или простой объект без обертки, возвращаем как есть
        // (для обратной совместимости)
        if (Array.isArray(transformedData) || (transformedData && typeof transformedData === 'object' && !('data' in transformedData))) {
          return transformedData;
        }

        // Оборачиваем только если это не стандартный ответ
        return {
          data: transformedData,
          timestamp: new Date().toISOString(),
          path: url,
          method,
        };
      }),
    );
  }
}

