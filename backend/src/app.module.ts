import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule, ClsService } from 'nestjs-cls';
import { SentryModule } from '@sentry/nestjs/setup';
import { randomUUID } from 'node:crypto';

import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { SupplierModule } from './supplier/supplier.module';
import { CustomerModule } from './customer/customer.module';
import { FabricModule } from './fabric/fabric.module';
import { FileModule } from './file/file.module';
import { QuoteModule } from './quote/quote.module';
import { OrderModule } from './order/order.module';
import { LogisticsModule } from './logistics/logistics.module';
import { ImportModule } from './import/import.module';
import { SystemModule } from './system/system.module';
import { ProductModule } from './product/product.module';
import { ExportModule } from './export/export.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { UserClsInterceptor } from './common/interceptors/user-cls.interceptor';
import { HealthController } from './common/health/health.controller';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import configuration from './config/configuration';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Request-scoped correlation ID via CLS
    ClsModule.forRoot({
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Record<string, Record<string, unknown>>) =>
          (req.headers['x-correlation-id'] as string) ?? randomUUID(),
      },
    }),

    // Sentry error tracking
    SentryModule.forRoot(),

    // Logging (bound to CLS correlation ID, with optional Loki transport)
    LoggerModule.forRootAsync({
      imports: [ClsModule, ConfigModule],
      inject: [ClsService, ConfigService],
      useFactory: (cls: ClsService, config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        const lokiHost = config.get<string>('LOKI_HOST');

        const targets: Array<{
          target: string;
          options: Record<string, unknown>;
          level?: string;
        }> = [];

        // Console transport in non-production
        if (!isProduction) {
          targets.push({
            target: 'pino-pretty',
            options: { colorize: true },
          });
        }

        // Loki transport when configured
        if (lokiHost) {
          targets.push({
            target: 'pino-loki',
            options: {
              host: lokiHost,
              labels: { app: 'borealis-backend' },
              batching: true,
              interval: 5,
            },
          });
        }

        return {
          pinoHttp: {
            genReqId: () => cls.getId(),
            level: isProduction ? 'info' : 'debug',
            transport: targets.length > 0 ? { targets } : undefined,
          },
        };
      },
    }),

    // Rate limiting
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 60 }],
    }),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Health checks
    TerminusModule,

    // Prometheus metrics
    MetricsModule,

    // Core modules
    PrismaModule,
    CommonModule,
    AuthModule,
    AuditModule,

    // Business modules
    SupplierModule,
    CustomerModule,
    FabricModule,
    FileModule,
    QuoteModule,
    OrderModule,
    LogisticsModule,
    ImportModule,
    SystemModule,
    ProductModule,
    ExportModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // HTTP request duration metrics (before TransformInterceptor to measure full lifecycle)
    {
      provide: APP_INTERCEPTOR,
      useExisting: MetricsInterceptor,
    },
    // Global response transformer
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Store authenticated user in CLS for service-layer access
    {
      provide: APP_INTERCEPTOR,
      useClass: UserClsInterceptor,
    },
    // Audit logging interceptor (must be after UserClsInterceptor)
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // Global validation pipe
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    // Global rate limiter
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
