import {
  ExceptionFilter,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { ClsService } from 'nestjs-cls';

// Check if running in production
const isProduction = process.env.NODE_ENV === 'production';

// Prisma error codes that should be handled specially
const PRISMA_ERROR_CODES = new Set([
  'P2002', // Unique constraint violation
  'P2003', // Foreign key constraint violation
  'P2025', // Record not found
]);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly cls: ClsService) {}

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get correlation ID from CLS
    const correlationId = this.cls.getId();

    // Set correlation ID on Sentry scope for error tracking
    Sentry.getCurrentScope().setTag('correlation_id', correlationId);

    // Set correlation ID response header
    response.setHeader('X-Correlation-ID', correlationId);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const obj = exResponse as Record<string, unknown>;
        message = (obj.message as string) || message;
        errors = obj.errors as unknown[] | undefined;
      }
    } else if (exception instanceof Error) {
      // Log the actual error for debugging
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );

      // Check if it's a Prisma error
      const prismaCode = this.extractPrismaErrorCode(exception);

      if (isProduction) {
        // In production, hide sensitive error details
        message = this.getSafeErrorMessage(prismaCode);
      } else {
        // In development, show the actual error message
        message = exception.message;
      }
    }

    response.status(status).json({
      code: status,
      message,
      ...(errors ? { errors } : {}),
      correlationId,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Extract Prisma error code from error message
   */
  private extractPrismaErrorCode(error: Error): string | null {
    // Prisma errors contain codes like P2002, P2003, etc.
    const match = error.message.match(/P\d{4}/);
    if (match && PRISMA_ERROR_CODES.has(match[0])) {
      return match[0];
    }
    return null;
  }

  /**
   * Get a safe error message that doesn't expose internal details
   */
  private getSafeErrorMessage(prismaCode: string | null): string {
    switch (prismaCode) {
      case 'P2002':
        return 'A record with this value already exists';
      case 'P2003':
        return 'Referenced record does not exist';
      case 'P2025':
        return 'Record not found';
      default:
        return 'Internal server error';
    }
  }
}
