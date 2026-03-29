import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { RequestUser } from '../../auth/interfaces';

/**
 * Global interceptor that stores request.user into CLS after
 * JwtAuthGuard has attached the user to the request object.
 * This allows services to access the authenticated user
 * without explicit constructor injection or controller parameters.
 */
@Injectable()
export class UserClsInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    if (request.user) {
      this.cls.set('user', request.user);
    }
    return next.handle();
  }
}
