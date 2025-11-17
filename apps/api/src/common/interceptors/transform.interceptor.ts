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
        // Если ответ уже имеет структуру с meta (пагинация), не оборачиваем
        if (data && typeof data === 'object' && 'meta' in data) {
          return data;
        }

        // Если это массив или простой объект без обертки, возвращаем как есть
        // (для обратной совместимости)
        if (Array.isArray(data) || (data && typeof data === 'object' && !('data' in data))) {
          return data;
        }

        // Оборачиваем только если это не стандартный ответ
        return {
          data,
          timestamp: new Date().toISOString(),
          path: url,
          method,
        };
      }),
    );
  }
}

